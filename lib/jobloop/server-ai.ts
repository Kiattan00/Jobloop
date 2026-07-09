import "server-only";

import OpenAI from "openai";
import { createEntityId, createTimestamp } from "@/lib/jobloop/generators";
import type { ServerTrace } from "@/lib/jobloop/server-trace";
import type {
  CompanyResearch,
  JobAnalysisResult,
  JobDetailAnalysis,
  JobJd,
  ResumeVersion,
  ScoreBreakdown,
  ScoreBreakdownReasons,
  SourceResume,
  StructuredJd,
  TailoredResume,
} from "./types";

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
const DEFAULT_MODEL = "deepseek/deepseek-v4-flash";
const DEPLOYMENT_FAST_MODE = process.env.AI_FAST_MODE === "true";
const RESUME_SEARCH_TIMEOUT_MS = 8_000;
const DETAIL_SYSTEM = `
你是 JobLoop 的高级求职顾问，擅长从招聘视角拆解岗位本质。你的任务是为候选人生成一份**深度、可执行**的单岗位分析报告。

**输出结构（强制遵守）**：
1. **结论先行**（80字以内）：用一句话明确给出“值得投 / 谨慎投 / 不建议优先投”，并附带核心依据（分数、最强匹配、最大风险）。
2. **公司深度解读**（250-350字）：
   - 细分行业赛道、公司发展阶段（初创/成长/成熟）、市场地位（头部/中游/尾部）。
   - 主营业务与收入结构，核心产品/服务矩阵，目标客户群体。
   - 技术栈或业务壁垒（若有公开信息，否则注明“待补充”）。
   - 企业文化和稳定性评估（基于网络信息，谨慎措辞，若公司研究字段为“待补充”则只做保守推测）。
3. **岗位精准画像**（200-300字）：
   - 该岗位在组织中的定位（执行层/策略层/专家层）。
   - 核心职责按 JD 权重排序，并推测关键绩效指标（KPI）。
   - 硬性要求（学历、经验年限、特定技能）与软性素质（沟通、抗压、创新）的优先级。
4. **匹配度深析**（300-400字）：
   - 逐维度对比候选人简历与岗位要求，指出**至少2个强匹配点**和**至少1个弱项/差距**。
   - 若存在行业或业务场景迁移，给出桥接表达建议（如“您的XX经验可类比为本岗位的YY场景”）。
   - 若薪资信息缺失，明确提示并基于岗位级别和地区给出市场参考区间（若可推断）。
5. **风险与机会**（150-200字）：
   - 列出2~3个主要风险（如公司规模小、行业下行、要求过高）。
   - 列出2~3个机会点（如能接触核心业务、快速成长、行业风口）。
6. **报告总字数须控制在 800~1200 字之间，采用分节标题（二级标题）组织，段落清晰，杜绝空话套话。**

**额外指令**：
- 所有分析必须基于传入的 \`job\`（含结构化JD、公司研究）和 \`analysisResult\`，不得凭空编造。
- 若公司研究字段为“待补充”，请注明“联网信息有限，以下分析主要依据 JD 文本”，并减少对公司层面的推测。
- 输出必须为合法 JSON，格式与 outputSchema 完全一致。
`;

type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

type PromptMessage = {
  role: "assistant" | "system" | "user";
  content: string;
};

type SearchCitation = {
  title: string;
  url: string;
};

type ResumeSearchContext = {
  marketJdSamples: Array<{
    sourceTitle: string;
    sourceUrl: string;
    companyOrPlatform: string;
    jobTitle: string;
    industryOrScenario: string;
    responsibilities: string[];
    requirements: string[];
    preferredQualifications: string[];
    keywords: string[];
  }>;
  jdSynthesis: {
    targetDirection: string;
    targetIndustry: string;
    roleProfile: string[];
    mustHaveRequirements: string[];
    preferredRequirements: string[];
    highFrequencyKeywords: string[];
    commonDeliverables: string[];
    commonCollaborationPatterns: string[];
    toneAndStyle: string[];
  };
  experienceHints: Array<{
    experienceLabel: string;
    inferredIndustryOrRole: string;
    matchStrength: "strong" | "medium" | "weak";
    likelyResponsibilities: string[];
    projectRewriteAngles: string[];
    evidenceBasis: string;
  }>;
  rewriteStrategy: {
    candidateSummary: string;
    strongestEvidence: string[];
    weakButUsableEvidence: string[];
    unsupportedClaims: string[];
    sectionOrderingAdvice: string[];
    bulletExpansionAdvice: string[];
    keywordCoveragePlan: string[];
    lengthControlRules: string[];
    preflightChecklist: string[];
  };
  globalRewritePrinciples: string[];
  risksToAvoid: string[];
  citations: SearchCitation[];
};

const getModel = () => process.env.OPENROUTER_MODEL || DEFAULT_MODEL;

function getDefaultHeaders() {
  return {
    "HTTP-Referer": process.env.OPENROUTER_SITE_URL || "http://localhost:3001",
    "X-OpenRouter-Title": process.env.OPENROUTER_APP_NAME || "JobLoop",
  };
}

function shouldSkipOptionalAiPasses() {
  return DEPLOYMENT_FAST_MODE;
}

function getClient() {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error("Missing OPENROUTER_API_KEY");
  }

  return new OpenAI({
    baseURL: OPENROUTER_BASE_URL,
    apiKey,
    defaultHeaders: getDefaultHeaders(),
  });
}

function extractTextContent(content: unknown) {
  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((item) => {
        if (typeof item === "string") {
          return item;
        }
        if (
          item &&
          typeof item === "object" &&
          "text" in item &&
          typeof item.text === "string"
        ) {
          return item.text;
        }
        return "";
      })
      .join("\n");
  }

  return "";
}

function parseJsonPayload<T>(payload: string): T {
  const cleaned = payload
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "");

  return JSON.parse(cleaned) as T;
}

function formatStructuredResumeContent(content: unknown): string | null {
  if (!content || typeof content !== "object" || Array.isArray(content)) {
    return null;
  }

  const data = content as Record<string, unknown>;
  const lines: string[] = [];

  const basicInfo =
    data.basicInfo && typeof data.basicInfo === "object"
      ? (data.basicInfo as Record<string, unknown>)
      : null;

  if (basicInfo) {
    const infoParts = [
      typeof basicInfo.name === "string" ? basicInfo.name : "",
      typeof basicInfo.contact === "string" ? basicInfo.contact : "",
      typeof basicInfo.birth === "string" ? basicInfo.birth : "",
      typeof basicInfo.gender === "string" ? basicInfo.gender : "",
      typeof basicInfo.origin === "string" ? basicInfo.origin : "",
      typeof basicInfo.ethnic === "string" ? basicInfo.ethnic : "",
      typeof basicInfo.position === "string" ? basicInfo.position : "",
    ].filter(Boolean);

    if (infoParts.length > 0) {
      lines.push(infoParts.join(" | "));
      lines.push("");
    }
  }

  lines.push("一、个人优势");
  const selfEvaluation = Array.isArray(data.selfEvaluation)
    ? data.selfEvaluation.filter(
        (item): item is string => typeof item === "string",
      )
    : [];

  if (selfEvaluation.length > 0) {
    for (const item of selfEvaluation) {
      lines.push(`- ${item}`);
    }
  } else {
    lines.push("- 暂缺模型输出的个人优势内容。");
  }

  lines.push("");
  lines.push("二、教育背景");
  const education = Array.isArray(data.education)
    ? data.education.filter(
        (item): item is Record<string, unknown> =>
          Boolean(item) && typeof item === "object" && !Array.isArray(item),
      )
    : [];

  if (education.length > 0) {
    for (const item of education) {
      const title = [
        typeof item.school === "string" ? item.school : "",
        typeof item.degree === "string" ? item.degree : "",
        typeof item.major === "string" ? item.major : "",
        typeof item.college === "string" ? item.college : "",
      ]
        .filter(Boolean)
        .join("｜");
      const duration =
        typeof item.duration === "string"
          ? item.duration
          : typeof item.time === "string"
            ? item.time
            : "";
      lines.push(`- ${[title, duration].filter(Boolean).join("｜")}`);
      if (typeof item.gpa === "string") {
        lines.push(`- 成绩情况：${item.gpa}`);
      }
      if (typeof item.courses === "string") {
        lines.push(`- 相关课程：${item.courses}`);
      }
    }
  } else {
    lines.push("- 暂缺模型输出的教育背景内容。");
  }

  lines.push("");
  lines.push("三、项目经历");
  const workExperience = Array.isArray(data.workExperience)
    ? data.workExperience.filter(
        (item): item is Record<string, unknown> =>
          Boolean(item) && typeof item === "object" && !Array.isArray(item),
      )
    : [];

  if (workExperience.length > 0) {
    for (const experience of workExperience) {
      const projects = Array.isArray(experience.projects)
        ? experience.projects.filter(
            (item): item is Record<string, unknown> =>
              Boolean(item) && typeof item === "object" && !Array.isArray(item),
          )
        : [];

      for (const project of projects) {
        const projectName =
          typeof project.name === "string" ? project.name : "项目经历";
        const summary =
          typeof project.responsibilities === "string"
            ? project.responsibilities
            : typeof project.responsibility === "string"
              ? project.responsibility
              : "";
        lines.push(`- ${projectName}`);
        if (summary) {
          lines.push(`- 项目说明：${summary}`);
        }
      }
    }
  } else {
    lines.push("- 暂缺模型输出的项目经历内容。");
  }

  lines.push("");
  lines.push("四、工作经验");
  if (workExperience.length > 0) {
    for (const experience of workExperience) {
      const company =
        typeof experience.company === "string" ? experience.company : "";
      const position =
        typeof experience.position === "string" ? experience.position : "";
      const duration =
        typeof experience.duration === "string"
          ? experience.duration
          : typeof experience.time === "string"
            ? experience.time
            : "";
      lines.push(
        `- ${[company, position, duration].filter(Boolean).join("｜")}`,
      );
    }
  } else {
    lines.push("- 暂缺模型输出的工作经验内容。");
  }

  lines.push("");
  lines.push("五、技能证书");
  const honors = Array.isArray(data.honors)
    ? data.honors.filter((item): item is string => typeof item === "string")
    : [];

  if (honors.length > 0) {
    for (const item of honors) {
      lines.push(`- ${item}`);
    }
  } else {
    lines.push("- 暂缺模型输出的技能证书/荣誉内容。");
  }

  return lines.join("\n");
}

function normalizeResumeContentOutput(content: unknown): string {
  if (typeof content === "string") {
    return content;
  }

  return formatStructuredResumeContent(content) || "";
}

function isUsableResumeContent(content: string): boolean {
  return (
    content.includes("一、个人优势") &&
    content.includes("二、教育背景") &&
    content.includes("三、项目经历") &&
    content.includes("四、工作经验") &&
    content.includes("五、技能证书") &&
    content.length >= 800
  );
}

function findResumeRedFlags(content: string, sourceResumeContent: string) {
  const redFlags: string[] = [];
  const suspiciousTerms = [
    "Python",
    "Axure",
    "Visio",
    "Miro",
    "SPSS",
    "CET-6",
    "普通话二级甲等",
    "机器学习",
    "AI产品设计方法论",
    "书面表扬",
    "中标率",
    "Top1%",
    "10万+",
    "20+",
    "30+",
    "200+",
  ];

  for (const term of suspiciousTerms) {
    if (content.includes(term) && !sourceResumeContent.includes(term)) {
      redFlags.push(term);
    }
  }

  if (/达100%/u.test(content) && !/100%/u.test(sourceResumeContent)) {
    redFlags.push("达100%");
  }

  return Array.from(new Set(redFlags));
}

async function requestJson<T>({
  examples = [],
  system,
  prompt,
  trace,
  traceStep,
}: {
  examples?: PromptMessage[];
  system: string;
  prompt: JsonValue;
  trace?: ServerTrace;
  traceStep?: string;
}) {
  const client = getClient();
  const model = getModel();
  const step = traceStep || "openrouter:request";
  const messages = [
    { role: "system" as const, content: system },
    ...examples,
    { role: "user" as const, content: JSON.stringify(prompt, null, 2) },
  ];
  trace?.log(`${step}:start`, {
    messageCount: messages.length,
    model,
    promptLength: messages[messages.length - 1]?.content.length ?? 0,
    systemLength: system.length,
  });
  const completion = await client.chat.completions.create(
    {
      model,
      temperature: 0.2,
      max_tokens: 4096,
      messages,
      response_format: { type: "json_object" },
    },
    { timeout: 60_000 },
  );

  const rawText = extractTextContent(completion.choices[0]?.message?.content);
  if (!rawText) {
    trace?.fail(`${step}:empty`, new Error("Model returned empty content"), {
      model,
    });
    throw new Error("Model returned empty content");
  }
  trace?.log(`${step}:success`, {
    model,
    rawTextLength: rawText.length,
  });

  try {
    return {
      model,
      data: parseJsonPayload<T>(rawText),
    };
  } catch (error) {
    trace?.fail(`${step}:parse-failed`, error, {
      model,
      rawTextPreview: rawText.slice(0, 500),
    });
    throw error;
  }
}

function parseSearchCitations(message: {
  annotations?: unknown;
}): SearchCitation[] {
  if (!Array.isArray(message.annotations)) {
    return [];
  }

  const citations = message.annotations.flatMap((annotation) => {
    if (
      !annotation ||
      typeof annotation !== "object" ||
      !("type" in annotation) ||
      annotation.type !== "url_citation" ||
      !("url_citation" in annotation) ||
      !annotation.url_citation ||
      typeof annotation.url_citation !== "object"
    ) {
      return [];
    }

    const citation = annotation.url_citation as {
      title?: unknown;
      url?: unknown;
    };

    if (
      typeof citation.title !== "string" ||
      typeof citation.url !== "string"
    ) {
      return [];
    }

    return [{ title: citation.title, url: citation.url }];
  });

  return Array.from(
    new Map(citations.map((citation) => [citation.url, citation])).values(),
  ).slice(0, 8);
}

async function buildResumeSearchContext(
  sourceResume: SourceResume,
  trace?: ServerTrace,
): Promise<ResumeSearchContext | null> {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error("Missing OPENROUTER_API_KEY");
  }

  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    RESUME_SEARCH_TIMEOUT_MS,
  );
  trace?.log("resume:search-context:start", {
    timeoutMs: RESUME_SEARCH_TIMEOUT_MS,
  });

  const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...getDefaultHeaders(),
    },
    signal: controller.signal,
    body: JSON.stringify({
      model: getModel(),
      temperature: 0.1,
      messages: [
        {
          role: "system",
          content:
            '你是 JobLoop 的中文岗位研究员兼简历改写策略分析师。你的任务是结合用户原始简历与单一目标岗位，强制使用网页搜索先找到 3-4 条与目标岗位最接近的真实招聘 JD 或招聘页，再基于这些 JD 样本做岗位解析、经历映射和改写策略规划，服务后续简历改写。搜索优先级如下：1）真实招聘页面或招聘平台职位页；2）企业招聘页；3）岗位职责说明页。若完全找不到完全同名岗位，可搜索同一行业下最接近的相邻岗位，但必须说明属于相邻岗位。你绝不能编造候选人的个人经历、项目成果、任职公司、时间线、量化指标、证书或头衔。你必须输出市场 JD 样本、岗位归纳、经历映射、改写策略和风险提示。只返回合法 JSON，不要输出 markdown。JSON 结构必须是 {"marketJdSamples":[{"sourceTitle":"","sourceUrl":"","companyOrPlatform":"","jobTitle":"","industryOrScenario":"","responsibilities":[""],"requirements":[""],"preferredQualifications":[""],"keywords":[""]}],"jdSynthesis":{"targetDirection":"","targetIndustry":"","roleProfile":[""],"mustHaveRequirements":[""],"preferredRequirements":[""],"highFrequencyKeywords":[""],"commonDeliverables":[""],"commonCollaborationPatterns":[""],"toneAndStyle":[""]},"experienceHints":[{"experienceLabel":"","inferredIndustryOrRole":"","matchStrength":"strong","likelyResponsibilities":[""],"projectRewriteAngles":[""],"evidenceBasis":""}],"rewriteStrategy":{"candidateSummary":"","strongestEvidence":[""],"weakButUsableEvidence":[""],"unsupportedClaims":[""],"sectionOrderingAdvice":[""],"bulletExpansionAdvice":[""],"keywordCoveragePlan":[""],"lengthControlRules":[""],"preflightChecklist":[""]},"globalRewritePrinciples":[""],"risksToAvoid":[""]}。',
        },
        {
          role: "user",
          content: JSON.stringify(
            {
              task: "resume_research",
              targetIntent: sourceResume.targetIntent || "",
              sourceResume: sourceResume.content,
              requirements: [
                "必须先搜索 3-4 条最接近目标岗位的真实 JD 样本",
                "必须先归纳核心职责、硬性要求、加分项、高频关键词、产出物和协作对象",
                "必须判断候选人哪些经历是强匹配、中匹配、弱匹配",
                "必须输出后续简历改写策略和长度控制建议",
              ],
            },
            null,
            2,
          ),
        },
      ],
      tools: [{ type: "openrouter:web_search" }],
    }),
  });
  clearTimeout(timeout);

  if (!response.ok) {
    throw new Error(`Resume research failed with status ${response.status}`);
  }

  const completion = (await response.json()) as {
    choices?: Array<{
      message?: {
        annotations?: unknown;
        content?: unknown;
      };
    }>;
  };

  const message = completion.choices?.[0]?.message;
  const rawText = extractTextContent(message?.content);

  if (!rawText) {
    trace?.log("resume:search-context:empty");
    return null;
  }

  const parsed =
    parseJsonPayload<Omit<ResumeSearchContext, "citations">>(rawText);
  trace?.log("resume:search-context:success", {
    citationCount: parseSearchCitations(message || {}).length,
    rawTextLength: rawText.length,
  });

  return {
    ...parsed,
    citations: parseSearchCitations(message || {}),
  };
}

async function sanitizeResumeDraft(
  sourceResume: SourceResume,
  targetIntent: string,
  draftContent: string,
  redFlags: string[],
) {
  const { data } = await requestJson<{
    content: string;
  }>({
    system:
      '你是 JobLoop 的简历事实核验修订助手。你的任务不是重新创作，而是基于原始简历，对已经生成的目标岗位简历草稿做“去脑补、去夸大、去新增证据”的修订。你只能删除、弱化、改写不受支持的内容，不能新增原始简历没有的工具、证书、语言能力、考试成绩、项目数量、调研次数、百分比、人数规模、AI 技术栈、产品方法论或结果数据。若草稿中存在行业桥接表达，保留有事实基础的桥接，删除没有事实基础的硬贴靠。桥接句与分点必须优先保留“动作 + 对象/场景 + 输出/结果”的证据型句式，禁止把“能够”“具备”“擅长”作为主干，也尽量避免只剩“负责”“参与”“配合”这类空泛开头。保留现有五段结构：一、个人优势；二、教育背景；三、项目经历；四、工作经验；五、技能证书。输出必须是可直接投递的中文简历正文字符串。只返回合法 JSON：{"content":""}。',
    prompt: {
      task: "sanitize_resume_draft",
      targetIntent,
      sourceResume: sourceResume.content,
      draftContent,
      redFlags,
      hardConstraints: [
        "只能删除、弱化或改写不受支持内容，不能新增事实",
        "保留五段结构和岗位导向表达",
        "删除原简历未出现的软件、证书、成绩、数字和夸大量化",
        "保留有事实基础的相关性桥接，删除没有事实基础的业务贴靠",
        "尽量把分点修订成核心词归纳 + 具体展开，而不是潜力型或空泛型表达",
      ],
    },
  });

  return data.content;
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function _getNeutralBreakdown(): ScoreBreakdown {
  return {
    industryMatch: 50,
    companyStrength: 50,
    roleMatch: 50,
    salaryCompetitiveness: 50,
    growthPotential: 50,
  };
}

async function extractStructuredJd(job: JobJd) {
  const { data } = await requestJson<{
    structuredJd: StructuredJd;
  }>({
    system:
      "你是 JobLoop 的中文 JD 结构化提取助手。只做信息抽取，不做评价，不编造缺失信息。若 JD 未提供某字段，则返回空字符串或空数组。只返回合法 JSON。",
    prompt: {
      task: "extract_structured_jd",
      outputSchema: {
        structuredJd: {
          companyName: "",
          jobTitle: "",
          salaryRange: "",
          responsibilities: [""],
          skillRequirements: [""],
          experienceRequirement: "",
          educationRequirement: "",
          location: "",
          benefits: [""],
          sourceUrl: "",
          rawSummary: "",
        },
      },
      job: {
        companyName: job.companyName,
        jobTitle: job.jobTitle,
        jobUrl: job.jobUrl || "",
        jdText: job.jdText,
      },
    },
  });

  return data.structuredJd;
}

async function buildCompanyResearch(job: JobJd) {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error("Missing OPENROUTER_API_KEY");
  }

  const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...getDefaultHeaders(),
    },
    body: JSON.stringify({
      model: getModel(),
      temperature: 0.1,
      messages: [
        {
          role: "system",
          content:
            "你是 JobLoop 的中文公司研究助手。请围绕目标公司进行联网检索，输出从属行业、公司规模、主营业务、主要产品、公司风评五类信息。只输出保守、可公开支持的摘要；不夸大、不猜测未经证实的融资、估值、排名或内部情况。若某项无法确认，则明确写“待补充”。只返回合法 JSON。",
        },
        {
          role: "user",
          content: JSON.stringify(
            {
              task: "company_research",
              companyName: job.companyName,
              jobTitle: job.jobTitle,
              jobUrl: job.jobUrl || "",
              jdText: job.jdText,
              outputSchema: {
                industry: "",
                companyScale: "",
                mainBusiness: "",
                keyProducts: [""],
                reputation: "",
                summary: "",
              },
            },
            null,
            2,
          ),
        },
      ],
      tools: [{ type: "openrouter:web_search" }],
    }),
  });

  if (!response.ok) {
    throw new Error(`Company research failed with status ${response.status}`);
  }

  const completion = (await response.json()) as {
    choices?: Array<{
      message?: {
        annotations?: unknown;
        content?: unknown;
      };
    }>;
  };

  const message = completion.choices?.[0]?.message;
  const rawText = extractTextContent(message?.content);

  if (!rawText) {
    return {
      industry: "待补充",
      companyScale: "待补充",
      mainBusiness: "待补充",
      keyProducts: [],
      reputation: "待补充",
      summary: "未能完成公司联网检索，建议稍后重试或人工补充。",
      searchedAt: createTimestamp(),
      citations: [],
    } satisfies CompanyResearch;
  }

  const parsed = parseJsonPayload<Omit<CompanyResearch, "searchedAt">>(rawText);

  return {
    industry: parsed.industry || "待补充",
    companyScale: parsed.companyScale || "待补充",
    mainBusiness: parsed.mainBusiness || "待补充",
    keyProducts: parsed.keyProducts || [],
    reputation: parsed.reputation || "待补充",
    summary: parsed.summary || "公司补充信息待补充。",
    searchedAt: createTimestamp(),
    citations: parseSearchCitations(message || {}),
  } satisfies CompanyResearch;
}

export async function generateResumeVersionsWithAi(
  sourceResume: SourceResume,
  trace?: ServerTrace,
) {
  let searchContext: ResumeSearchContext | null = null;
  const fastMode = shouldSkipOptionalAiPasses();
  trace?.log("resume:start", {
    fastMode,
    sourceResumeId: sourceResume.id,
  });

  if (!fastMode) {
    try {
      searchContext = await buildResumeSearchContext(sourceResume, trace);
    } catch (error) {
      trace?.fail("resume:search-context", error);
      console.error("Failed to build resume search context", error);
    }
  } else {
    trace?.log("resume:fast-mode-skip-search");
  }

  const baseSystem =
    '你是 JobLoop 的资深中文求职顾问兼招聘视角简历改写助手。请基于用户原始简历、单一目标岗位方向，以及外部搜索补充得到的 3-4 条市场 JD 样本与岗位解析结果，对原简历进行证据保留式定向改写，生成 1 个可直接投递的基础简历版本草稿。你的核心任务不是“总结简历”，而是“先理解招聘方语言，再保留原始事实证据，把候选人翻译成目标岗位愿意继续看下去的版本”。你必须严格遵循以下工作顺序：1）先使用 searchContext 中的市场 JD 样本理解目标岗位；2）先做 JD 解析，抓出核心职责、硬性要求、加分项、高频关键词、典型产出物、协作对象、语气风格；3）再做候选人经历映射，先判断相关性层级是强相关、中相关还是弱相关，并区分强匹配、可迁移、弱匹配和不支持；4）再制定改写策略，决定哪些经历前置、哪些 bullet 扩写、哪些关键词覆盖、如何控制篇幅；5）最后输出简历正文并执行自检。若原经历与目标岗位存在明确的行业、业务场景、服务对象、产出物或项目流程相关性，可适度使用目标岗位的业务语境改写，但必须以原经历真实可支撑的事实为基础；若相关性不足，则仅允许改写为通用可迁移能力，不得强行贴靠目标产品、目标业务或目标行业经历。桥接表达必须优先写成“动作 + 对象/场景 + 输出/结果”的证据型句式，禁止使用“能够”“具备”“擅长”等潜力型表述作为句子主干，除非后面紧跟明确事实证据。不得把候选人直接改写成已经在目标岗位任职，也不得删除大量原始信息后只留下泛化能力概括。输出必须像可直接投递的一页中文简历正文，而不是分析报告或结构化数据回填。content 字段必须是一个完整的多行字符串，不能输出为对象、数组、basicInfo、education、workExperience、honors、selfEvaluation 等嵌套 JSON 结构。绝对禁止新增原简历未出现的软件、工具、证书、语言成绩、考试分数、人数、场次、项目数量、百分比、倍率、数据规模、调研次数、迭代次数、书面表扬、中标率、AI 技术栈或产品方法论。若目标岗位与原经历跨度较大，只能改写成可迁移能力表达，不能通过新增证据来“补齐”目标岗位经历。正式输出前你必须自检：是否贴合 JD、是否保留真实性、是否长度接近原文、是否存在空话套话、是否每条 bullet 都有信息增量、是否覆盖了最关键的 JD 关键词。只返回合法 JSON，不要输出 markdown 代码块、解释或额外文本。JSON 结构必须是 {"versions":[{"name":"","targetDirection":"","rewriteFocus":"","content":""}] }。';
  const retrySystem = `${baseSystem} 上一次输出失败的常见原因是 content 被错误写成对象，或者正文中混入了原简历未出现的新工具、新证书、新量化数据，或者仍然停留在“负责/参与/配合/能够/具备/擅长”的空泛表述。这一次必须直接输出最终简历正文字符串，正文中必须明确包含“五段结构”：一、个人优势；二、教育背景；三、项目经历；四、工作经验；五、技能证书。若未输出完整字符串正文，或新增了原简历未出现的工具/证书/量化数据，或没有把分点写成“核心词：具体展开”的证据型句式，则视为失败。`;

  const prompt = {
    task: "generate_resume_versions",
    targetCount: 1,
    targetIntent: sourceResume.targetIntent || "",
    sourceResume: sourceResume.content,
    searchContext,
    outputSchema: {
      versions: [
        {
          name: "",
          targetDirection: "",
          rewriteFocus: "",
          content: "",
        },
      ],
    },
    requirements: [
      "只生成 1 个目标岗位定向版本",
      "保留真实公司、岗位、时间、项目、奖项和技能证据",
      "必须先使用 searchContext 中的市场 JD 样本做归纳，再改写简历",
      "必须输出可直接投递的中文简历正文，不要输出结构化对象",
      "必须先判断原经历与目标岗位的相关性层级：强相关、中相关、弱相关",
      "若存在行业、场景、对象、产出物或流程相关性，可适度使用目标岗位业务语境做桥接；若相关性不足，只能保留通用可迁移能力表达",
      "个人优势、项目经历、工作经验中的每条分点都应优先写成“核心词：具体展开”",
      "项目经历中的每个项目应写成 1 句项目总述 + 3-5 条“核心词：具体展开”的技能点分点",
      "工作经验中的每段经历应写成岗位能力模块分点，而不是项目流水账或项目经历复述",
      "若目标岗位是产品类岗位，直接使用产品经理语言改写，但不得虚构产品任职经历",
      "禁止出现 basicInfo、education、workExperience、honors、selfEvaluation 这类 JSON 键名",
      "content 必须是单个字符串，内部通过换行组织正文",
      "禁止新增原简历未出现的软件、证书、语言成绩、考试分数、具体次数和夸张量化数据",
      "禁止使用“能够”“具备”“擅长”作为桥接句或分点主干，优先改写为动作、对象、输出或结果",
      "禁止大面积使用“负责”“参与”“配合”作为分点开头，除非后面紧跟具体对象、动作和产出",
    ],
  };

  const { data, model } = await requestJson<{
    versions: Array<{
      name: string;
      targetDirection: string;
      rewriteFocus: string;
      content: JsonValue;
    }>;
  }>({
    system: baseSystem,
    prompt,
    trace,
    traceStep: "resume:first-pass",
  });

  const firstPass = data.versions.slice(0, 1).map((version) => ({
    ...version,
    content: normalizeResumeContentOutput(version.content),
  }));
  trace?.log("resume:first-pass:normalized", {
    firstPassCount: firstPass.length,
    firstPassLengths: firstPass.map((version) => version.content.length),
  });

  const firstPassRedFlags = firstPass.flatMap((version) =>
    findResumeRedFlags(version.content, sourceResume.content),
  );
  trace?.log("resume:first-pass:red-flags", {
    redFlagCount: firstPassRedFlags.length,
  });

  const finalVersions =
    !fastMode &&
    (firstPass.some((version) => !isUsableResumeContent(version.content)) ||
      firstPassRedFlags.length > 0)
      ? (
          await requestJson<{
            versions: Array<{
              name: string;
              targetDirection: string;
              rewriteFocus: string;
              content: JsonValue;
            }>;
          }>({
            system: retrySystem,
            prompt: {
              ...prompt,
              retryReason: [
                "上一次输出没有形成可直接投递的正文",
                "上一次可能把 content 错误写成了对象",
                "这次必须只输出最终简历正文字符串",
                `需要删除的高风险新增信息：${firstPassRedFlags.join("、") || "无"}`,
              ],
            },
          })
        ).data.versions.slice(0, 1)
      : firstPass;

  trace?.log("resume:final-pass:selected", {
    usedRetryPass: !fastMode && firstPassRedFlags.length > 0,
  });

  const timestamp = createTimestamp();
  const versions: ResumeVersion[] = finalVersions.map((version) => ({
    id: createEntityId("resume"),
    sourceResumeId: sourceResume.id,
    name: version.name,
    targetDirection: version.targetDirection,
    rewriteFocus: version.rewriteFocus,
    content: normalizeResumeContentOutput(version.content),
    status: "draft",
    createdAt: timestamp,
    updatedAt: timestamp,
  }));

  for (const version of versions) {
    if (fastMode) {
      trace?.log("resume:fast-mode-skip-sanitize", {
        versionId: version.id,
      });
      continue;
    }

    const redFlags = findResumeRedFlags(version.content, sourceResume.content);

    if (redFlags.length > 0) {
      try {
        version.content = await sanitizeResumeDraft(
          sourceResume,
          version.targetDirection,
          version.content,
          redFlags,
        );
        trace?.log("resume:sanitize:success", {
          redFlagCount: redFlags.length,
          versionId: version.id,
        });
      } catch (error) {
        trace?.fail("resume:sanitize:failed", error, {
          redFlagCount: redFlags.length,
          versionId: version.id,
        });
        console.error("Failed to sanitize resume draft", error);
      }
    }
  }

  trace?.log("resume:completed", {
    model,
    versionCount: versions.length,
  });

  return { versions, model };
}

export async function generateBatchAnalysisWithAi(
  jobs: JobJd[],
  resumeVersions: ResumeVersion[],
) {
  const enrichedJobs = await Promise.all(
    jobs.map(async (job) => {
      const structuredJd = await extractStructuredJd(job);

      let companyResearch: CompanyResearch;
      try {
        companyResearch = await buildCompanyResearch(job);
      } catch {
        companyResearch = {
          industry: "待补充",
          companyScale: "待补充",
          mainBusiness: "待补充",
          keyProducts: [],
          reputation: "待补充",
          summary: "公司补充信息获取失败，本次分析基于现有 JD 内容完成。",
          searchedAt: createTimestamp(),
          citations: [],
        };
      }

      return {
        ...job,
        structuredJd,
        companyResearch,
        companyInfo: companyResearch.summary,
        updatedAt: createTimestamp(),
      };
    }),
  );

  const { data, model } = await requestJson<{
    analyses: Array<{
      jobId: string;
      recommendedResumeVersionId: string;
      scoreBreakdown: ScoreBreakdown;
      applyDecision: JobAnalysisResult["applyDecision"];
      needsTailoring: boolean;
      mainRisk: string;
      summary: string;
    }>;
  }>({
    system:
      "你是 JobLoop 的岗位评分与投递决策助手。请基于结构化 JD、公司补充信息和简历版本，对每个岗位打分并输出求职决策摘要。评分体系固定：行业匹配度25%、公司实力20%、岗位匹配度30%、薪资竞争力15%、成长性10%。每个维度先单独给 0-100 分，再按权重计算总分。若 JD 缺少薪资信息，薪资竞争力按中性分 50 处理，并在 summary 或 mainRisk 中说明“薪资信息缺失”。只返回合法 JSON。",
    prompt: {
      task: "batch_job_analysis",
      scoringWeights: {
        industryMatch: 25,
        companyStrength: 20,
        roleMatch: 30,
        salaryCompetitiveness: 15,
        growthPotential: 10,
      },
      resumeVersions: resumeVersions.map((version) => ({
        id: version.id,
        name: version.name,
        targetDirection: version.targetDirection,
        rewriteFocus: version.rewriteFocus,
        content: version.content,
      })),
      jobs: enrichedJobs.map((job) => ({
        id: job.id,
        companyName: job.companyName,
        jobTitle: job.jobTitle,
        structuredJd: job.structuredJd,
        companyResearch: job.companyResearch,
      })),
      outputSchema: {
        analyses: [
          {
            jobId: "",
            recommendedResumeVersionId: "",
            scoreBreakdown: {
              industryMatch: 0,
              companyStrength: 0,
              roleMatch: 0,
              salaryCompetitiveness: 0,
              growthPotential: 0,
            },
            applyDecision: "recommend",
            needsTailoring: true,
            mainRisk: "",
            summary: "",
          },
        ],
      },
    },
  });

  const timestamp = createTimestamp();
  const analyses: JobAnalysisResult[] = data.analyses.map((item) => {
    const scoreBreakdown: ScoreBreakdown = {
      industryMatch: clampScore(item.scoreBreakdown?.industryMatch ?? 50),
      companyStrength: clampScore(item.scoreBreakdown?.companyStrength ?? 50),
      roleMatch: clampScore(item.scoreBreakdown?.roleMatch ?? 50),
      salaryCompetitiveness: clampScore(
        item.scoreBreakdown?.salaryCompetitiveness ?? 50,
      ),
      growthPotential: clampScore(item.scoreBreakdown?.growthPotential ?? 50),
    };

    const weightedScore = Math.round(
      scoreBreakdown.industryMatch * 0.25 +
        scoreBreakdown.companyStrength * 0.2 +
        scoreBreakdown.roleMatch * 0.3 +
        scoreBreakdown.salaryCompetitiveness * 0.15 +
        scoreBreakdown.growthPotential * 0.1,
    );

    return {
      id: createEntityId("analysis"),
      jobId: item.jobId,
      recommendedResumeVersionId: item.recommendedResumeVersionId,
      matchScore: clampScore(weightedScore),
      scoreBreakdown,
      applyDecision: item.applyDecision,
      needsTailoring: item.needsTailoring,
      mainRisk: item.mainRisk,
      summary: item.summary,
      createdAt: timestamp,
    };
  });

  return { jobs: enrichedJobs, analyses, model };
}

export async function generateJobDetailWithAi(
  job: JobJd,
  result: JobAnalysisResult,
  resumeVersion?: ResumeVersion,
) {
  const { data, model } = await requestJson<{
    conclusion: string;
    report: string;
    scoreBreakdownReasons: ScoreBreakdownReasons;
    outreachMessage: string;
    interviewPrep: string[];
  }>({
    system: DETAIL_SYSTEM,
    prompt: {
      task: "job_detail_analysis",
      scoringWeights: {
        industryMatch: 25,
        companyStrength: 20,
        roleMatch: 30,
        salaryCompetitiveness: 15,
        growthPotential: 10,
      },
      job,
      analysisResult: result,
      recommendedResumeVersion: resumeVersion || null,
      outputSchema: {
        conclusion: "",
        report: "",
        scoreBreakdownReasons: {
          industryMatch: "",
          companyStrength: "",
          roleMatch: "",
          salaryCompetitiveness: "",
          growthPotential: "",
        },
        outreachMessage: "",
        interviewPrep: ["", "", ""],
      },
    },
  });

  const detail: JobDetailAnalysis = {
    id: createEntityId("detail"),
    jobId: job.id,
    analysisResultId: result.id,
    conclusion: data.conclusion,
    report: data.report,
    scoreBreakdownReasons: data.scoreBreakdownReasons,
    outreachMessage: data.outreachMessage,
    interviewPrep: data.interviewPrep.slice(0, 3),
    strengths: [],
    gaps: [],
    recommendedActions: [],
    createdAt: createTimestamp(),
  };

  return { detail, model };
}

export async function generateTailoredResumeWithAi(
  job: JobJd,
  resumeVersion: ResumeVersion,
  detail?: JobDetailAnalysis,
) {
  const { data, model } = await requestJson<{
    title: string;
    tailoringNotes: string[];
    content: string;
  }>({
    system:
      "你是 JobLoop 的简历微调助手。请在不虚构经历的前提下，针对单个岗位输出微调版简历正文和 3-5 条微调说明。只返回合法 JSON。",
    prompt: {
      task: "tailored_resume",
      job,
      baseResumeVersion: resumeVersion,
      detailAnalysis: detail || null,
      outputSchema: {
        title: "",
        tailoringNotes: [""],
        content: "",
      },
    },
  });

  const tailoredResume: TailoredResume = {
    id: createEntityId("tailored"),
    jobId: job.id,
    sourceResumeVersionId: resumeVersion.id,
    title: data.title,
    tailoringNotes: data.tailoringNotes,
    content: data.content,
    createdAt: createTimestamp(),
  };

  return { tailoredResume, model };
}

export function getAiRuntimeSummary() {
  return {
    provider: "openrouter",
    model: getModel(),
    configured: Boolean(process.env.OPENROUTER_API_KEY),
  };
}
