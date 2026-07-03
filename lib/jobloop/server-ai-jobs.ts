import "server-only";

import OpenAI from "openai";
import { createEntityId, createTimestamp } from "@/lib/jobloop/generators";
import type {
  CompanyResearch,
  JobAnalysisResult,
  JobDetailAnalysis,
  JobJd,
  ResumeVersion,
  ScoreBreakdown,
  ScoreBreakdownReasons,
  StructuredJd,
  TailoredResume,
} from "./types";

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
const DEFAULT_MODEL = "deepseek/deepseek-v4-flash";
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

const getModel = () => process.env.OPENROUTER_MODEL || DEFAULT_MODEL;

function getDefaultHeaders() {
  return {
    "HTTP-Referer": process.env.OPENROUTER_SITE_URL || "http://localhost:3001",
    "X-OpenRouter-Title": process.env.OPENROUTER_APP_NAME || "JobLoop",
  };
}

function getClient() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("Missing OPENROUTER_API_KEY");

  return new OpenAI({
    baseURL: OPENROUTER_BASE_URL,
    apiKey,
    defaultHeaders: getDefaultHeaders(),
  });
}

function extractTextContent(content: unknown) {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((item) => {
        if (typeof item === "string") return item;
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

async function requestJson<T>({
  system,
  prompt,
}: {
  system: string;
  prompt: JsonValue;
}) {
  const client = getClient();
  const model = getModel();
  const completion = await client.chat.completions.create({
    model,
    temperature: 0.2,
    messages: [
      { role: "system", content: system },
      { role: "user", content: JSON.stringify(prompt, null, 2) },
    ],
    response_format: { type: "json_object" },
  });

  const rawText = extractTextContent(completion.choices[0]?.message?.content);
  if (!rawText) throw new Error("Model returned empty content");

  return {
    model,
    data: parseJsonPayload<T>(rawText),
  };
}

type SearchCitation = {
  title: string;
  url: string;
};

function parseSearchCitations(message: {
  annotations?: unknown;
}): SearchCitation[] {
  if (!Array.isArray(message.annotations)) return [];

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

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function normalizeMatchText(text: string) {
  return text
    .toLowerCase()
    .replace(/[\s，。！？；：、·（）()【】[\]{}<>/\\\-_=+*'"`~|,.!?;:]+/g, "");
}

const resumeMatchKeywords = [
  "ai",
  "llm",
  "rag",
  "agent",
  "产品",
  "产品经理",
  "助理",
  "经理",
  "技术支持",
  "售前",
  "交付",
  "实施",
  "运营",
  "增长",
  "数据",
  "saas",
  "b端",
  "平台",
  "法律",
  "风控",
  "客服",
  "工程师",
  "研发",
  "测试",
  "商务",
  "销售",
  "咨询",
  "web",
  "app",
  "小程序",
];

function scoreResumeVersionForJob(job: JobJd, version: ResumeVersion) {
  const jobText = normalizeMatchText(
    [
      job.companyName,
      job.jobTitle,
      job.companyInfo,
      job.jdText,
      job.structuredJd?.companyName,
      job.structuredJd?.jobTitle,
      job.structuredJd?.rawSummary,
      job.structuredJd?.responsibilities?.join(" "),
      job.structuredJd?.skillRequirements?.join(" "),
      job.structuredJd?.experienceRequirement,
      job.structuredJd?.educationRequirement,
      job.structuredJd?.location,
      job.structuredJd?.benefits?.join(" "),
      job.companyResearch?.industry,
      job.companyResearch?.companyScale,
      job.companyResearch?.mainBusiness,
      job.companyResearch?.keyProducts?.join(" "),
      job.companyResearch?.reputation,
      job.companyResearch?.summary,
    ]
      .filter(Boolean)
      .join(" "),
  );

  const versionText = normalizeMatchText(
    [
      version.name,
      version.targetDirection,
      version.rewriteFocus,
      version.content,
    ]
      .filter(Boolean)
      .join(" "),
  );

  let score = 0;

  const directOverlap = [job.jobTitle, job.companyName].some((fragment) => {
    const normalized = normalizeMatchText(fragment);
    return Boolean(normalized) && versionText.includes(normalized);
  });

  if (directOverlap) {
    score += 40;
  }

  for (const keyword of resumeMatchKeywords) {
    if (jobText.includes(keyword) && versionText.includes(keyword)) {
      score += keyword.length >= 4 ? 12 : 8;
    }
  }

  const normalizedTargetDirection = normalizeMatchText(version.targetDirection);
  const normalizedJobTitle = normalizeMatchText(job.jobTitle);
  const normalizedStructuredTitle = normalizeMatchText(
    job.structuredJd?.jobTitle || "",
  );

  if (
    normalizedTargetDirection &&
    normalizedStructuredTitle &&
    normalizedTargetDirection.includes(normalizedStructuredTitle)
  ) {
    score += 20;
  }

  if (
    normalizedJobTitle &&
    normalizedTargetDirection &&
    (normalizedJobTitle.includes(normalizedTargetDirection) ||
      normalizedTargetDirection.includes(normalizedJobTitle))
  ) {
    score += 25;
  }

  return score;
}

function pickFallbackResumeVersionId(
  job: JobJd,
  resumeVersions: ResumeVersion[],
) {
  const sorted = [...resumeVersions].sort(
    (left, right) =>
      scoreResumeVersionForJob(job, right) -
      scoreResumeVersionForJob(job, left),
  );

  return sorted[0]?.id ?? resumeVersions[0]?.id ?? "";
}

function normalizeAnalysisRecord(
  item: {
    jobId: string;
    recommendedResumeVersionId: string;
    scoreBreakdown?: Partial<ScoreBreakdown>;
    applyDecision: JobAnalysisResult["applyDecision"];
    needsTailoring: boolean;
    mainRisk: string;
    summary: string;
  },
  job: JobJd,
  resumeVersions: ResumeVersion[],
): JobAnalysisResult {
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

  const resumeVersionIds = new Set(resumeVersions.map((version) => version.id));
  const recommendedResumeVersionId = resumeVersionIds.has(
    item.recommendedResumeVersionId,
  )
    ? item.recommendedResumeVersionId
    : pickFallbackResumeVersionId(job, resumeVersions);

  return {
    id: createEntityId("analysis"),
    jobId: item.jobId,
    recommendedResumeVersionId,
    matchScore: clampScore(weightedScore),
    scoreBreakdown,
    applyDecision: item.applyDecision,
    needsTailoring: item.needsTailoring,
    mainRisk: item.mainRisk,
    summary: item.summary,
    createdAt: createTimestamp(),
  };
}

async function extractStructuredJd(job: JobJd) {
  const { data } = await requestJson<{ structuredJd: StructuredJd }>({
    system:
      "你是 JobLoop 的中文 JD 结构化提取助手。你只做信息抽取，不做评价，不编造缺失信息。必须先确认当前输入只对应 1 份 JD，再从该 JD 中准确抽取公司名称和招聘岗位名称。公司名称不能误填为招聘人姓名、活跃时间、城市、薪资或福利标签；岗位名称不能误填为整段职责、日期、招聘文案或“职位详情”。若 JD 未提供某字段，则返回空字符串或空数组。只返回合法 JSON。",
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
  if (!apiKey) throw new Error("Missing OPENROUTER_API_KEY");

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
        companyName: structuredJd.companyName?.trim() || job.companyName,
        jobTitle: structuredJd.jobTitle?.trim() || job.jobTitle,
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
      "你是 JobLoop 的岗位评分与投递决策助手。请基于结构化 JD、公司补充信息和简历版本，对每个岗位打分并输出求职决策摘要。评分体系固定：行业匹配度25%、公司实力20%、岗位匹配度30%、薪资竞争力15%、成长性10%。每个维度先单独给0-100分，再按权重计算总分。若 JD 缺少薪资信息，薪资竞争力按中性分50处理，并在 summary 或 mainRisk 中说明“薪资信息缺失”。只返回合法 JSON。",
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

  const jobById = new Map(enrichedJobs.map((job) => [job.id, job]));
  const uniqueAnalyses = new Map<string, (typeof data.analyses)[number]>();

  for (const item of data.analyses) {
    if (!jobById.has(item.jobId)) {
      continue;
    }

    if (!uniqueAnalyses.has(item.jobId)) {
      uniqueAnalyses.set(item.jobId, item);
    }
  }

  if (uniqueAnalyses.size !== enrichedJobs.length) {
    throw new Error(
      `批量分析结果条数不匹配：本次输入 ${enrichedJobs.length} 个岗位，但模型仅返回 ${uniqueAnalyses.size} 条结果，请重试。`,
    );
  }

  const analyses: JobAnalysisResult[] = enrichedJobs.map((job) => {
    const item = uniqueAnalyses.get(job.id);

    if (!item) {
      throw new Error(`缺少岗位 ${job.jobTitle} 的分析结果`);
    }

    return normalizeAnalysisRecord(item, job, resumeVersions);
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
      "你是 JobLoop 的简历微调助手。请在不虚构经历的前提下，针对单个岗位输出微调版简历正文和3-5条微调说明。只返回合法 JSON。",
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
