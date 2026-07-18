import "server-only";

import https from "node:https";
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
  StructuredJd,
  TailoredResume,
} from "./types";

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
const DEFAULT_MODEL = "openai/gpt-4o-mini";
const DEPLOYMENT_FAST_MODE = process.env.AI_FAST_MODE === "true";
const STRUCTURED_JD_TIMEOUT_MS = 18_000;
const COMPANY_RESEARCH_TIMEOUT_MS = 45_000;
const REQUEST_TIMEOUT_MS = 120_000;
const JD_PAGE_FETCH_TIMEOUT_MS = 18_000;
const OPENROUTER_MAX_RETRIES = 3;
const IPV4_ONLY_AGENT = new https.Agent({
  family: 4,
  keepAlive: false,
});
const _DETAIL_SYSTEM_LEGACY = `
你是 JobLoop 的高级求职顾问，擅长从招聘视角拆解岗位本质。你的任务是为候选人生成一份**深度、可执行**的单岗位分析报告。

**输出结构（强制遵守）**：
1. **结论先行**（80字以内）：用一句话明确给出"值得投 / 谨慎投 / 不建议优先投"，并附带核心依据（分数、最强匹配、最大风险）。
2. **公司深度解读**（250-350字）：
   - 细分行业赛道、公司发展阶段（初创/成长/成熟）、市场地位（头部/中游/尾部）。
   - 主营业务与收入结构，核心产品/服务矩阵，目标客户群体。
   - 技术栈或业务壁垒（若有公开信息，否则注明"待补充"）。
   - 企业文化和稳定性评估（基于网络信息，谨慎措辞，若公司研究字段为"待补充"则只做保守推测）。
3. **岗位精准画像**（200-300字）：
   - 该岗位在组织中的定位（执行层/策略层/专家层）。
   - 核心职责按 JD 权重排序，并推测关键绩效指标（KPI）。
   - 硬性要求（学历、经验年限、特定技能）与软性素质（沟通、抗压、创新）的优先级。
4. **匹配度深析**（300-400字）：
   - 逐维度对比候选人简历与岗位要求，指出**至少2个强匹配点**和**至少1个弱项/差距**。
   - 若存在行业或业务场景迁移，给出桥接表达建议（如"您的XX经验可类比为本岗位的YY场景"）。
   - 若薪资信息缺失，明确提示并基于岗位级别和地区给出市场参考区间（若可推断）。
5. **风险与机会**（150-200字）：
   - 列出2~3个主要风险（如公司规模小、行业下行、要求过高）。
   - 列出2~3个机会点（如能接触核心业务、快速成长、行业风口）。
6. **报告总字数须控制在 800~1200 字之间，采用分节标题（二级标题）组织，段落清晰，杜绝空话套话。**

**outreachMessage 字段专属指令**：
- 这是候选人投递时发给 HR 的打招呼话术，严格按以下 5 段式结构生成，每段 1-2 句话，总字数 150-200：

  **第1段 — 岗位意向**：以"您好，我对贵司{jobTitle}很感兴趣。"开头，直接表达对该具体岗位的投递意向。
  **第2段 — 经验量化**：从简历中提取最相关的经验年限和量化成果，如"近X年XX经验，擅长XX，累计XX次"。
  **第3段 — 技能匹配**：对照 JD 要求，列举 1-2 个具体技术/业务能力，与岗位职责直接呼应。
  **第4段 — 附加亮点**：补充学历、证书、语言等硬性资质中与 JD 相关的加分项，无则跳过。
  **第5段 — 沟通意愿**：以"希望能有机会深入交流！"或类似表达收尾。

- 全程候选人第一人称，用"我"自称，禁止出现"JobLoop""求职顾问""建议您""推荐您"。
- 以下为参考示例（请根据实际 JD 和简历替换内容，勿照抄）：

  "您好，我对贵司AI售前技术支持岗很感兴趣。近3年政企项目经验，擅长需求挖掘、解决方案设计及客户沟通（累计汇报超20次）。曾搭建AI智能体并运用于工作业务上（coze平台），了解大模型/RAG基础，具备将AI技术与业务场景结合的能力。英语流利（CET-6高分），适应出差。希望能有机会深入交流！"

**额外指令**：
- 所有分析必须基于传入的 \`job\`（含结构化JD、公司研究）和 \`analysisResult\`，不得凭空编造。
- 若公司研究字段为"待补充"，请注明"联网信息有限，以下分析主要依据 JD 文本"，并减少对公司层面的推测。
- 输出必须为合法 JSON，格式与 outputSchema 完全一致。
`;

const DETAIL_SYSTEM = `
你是 JobLoop 的中文求职顾问。你的任务不是写长篇报告，而是基于传入的 job、analysisResult、recommendedResumeVersion 输出一份短、准、可执行的单岗位分析。

你必须遵守以下规则：
1. 只基于输入信息判断，不得编造候选人经历、公司信息、团队规模、业务阶段或薪资细节。
2. 不要重复 JD 已经明确写出的职责、要求、福利，不要写百度百科式公司介绍。
3. report 必须是中文纯文本字符串，按下面 5 个二级标题输出：
## 概论
## 匹配度分析
## 简历修改建议
## 面试准备
## 风险提示
4. report 总字数控制在 500-700 字之间，不含标题行。

各部分硬性要求如下：
- 概论：30字内，只写明确结论 + 核心依据；不得用"但"字开头；不要模糊措辞。
- 匹配度分析：不超过150字，只写 1 个最强匹配点 + 1 个最需要补的短板，不要罗列多点。
- 简历修改建议：100字内，必须给出具体到句式的修改指令，使用“把X改为Y / 删除X改成Y / 增加一句Y”这类表达，不能只写“建议强调”“建议优化”。
- 面试准备：100字内，预测 3 个具体问题，每个问题后都要附“回答框架：...”；问题必须具体，不能空泛。
- 风险提示：50字内，只写 1 个最大风险 + 1 个面试时应该追问的问题。

outreachMessage 字段要求：
- 这是候选人发给 HR 的打招呼话术。
- 用第一人称“我”，150-200字。
- 结构保持为：岗位兴趣 -> 相关经历/结果 -> 技能匹配 -> 附加亮点 -> 沟通收口。
- 禁止出现“JobLoop”“求职顾问”“建议您”等第三方视角措辞。

interviewPrep 字段要求：
- 返回长度为 3 的字符串数组。
- 每一项格式统一为：问题：... 回答框架：...
- 3 个问题必须和 report 中“面试准备”部分一致或高度对应。

scoreBreakdownReasons 字段要求：
- 每个维度 1 句话，解释该维度给分依据。
- 每句尽量控制在 40 字内，避免复述 summary。

可参考以下风格，但不要照抄，要根据实际 JD 和简历内容改写：
### 概论
值得投，先微调简历再投；分数可争取，关键在把 AI 项目经历翻译成岗位语言。

### 匹配度分析
最强匹配点是你已有 AI 项目与需求沟通经历，和岗位关注的场景理解直接相关。最大短板是简历里缺少岗位语言下的交付表达，面试官难判断你是否能直接上手。

### 简历修改建议
把“负责需求调研和方案输出”改为“输出需求文档并推动研发落地”；把“做过 AI 项目”改为“参与 AI Agent 场景方案设计与跨团队推进”。

### 面试准备
问题：你如何推动跨团队落地？回答框架：冲突场景-协调动作-结果。
问题：你如何判断需求优先级？回答框架：目标-标准-取舍。
问题：你如何理解 AI 在该岗位中的价值？回答框架：场景-方案-收益。

### 风险提示
最大风险是岗位要产品/业务表达而你简历偏技术；面试追问：这个岗位前 3 个月的核心交付是什么？

如果 companyResearch 主要为“待补充”或信息有限，请明确降低对公司层面的推断，把判断重心放在 JD 与简历匹配上。
你必须只返回合法 JSON，且严格符合 outputSchema。`;

type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

const getModel = () => process.env.OPENROUTER_MODEL || DEFAULT_MODEL;
const getDetailModel = () => process.env.OPENROUTER_DETAIL_MODEL || getModel();
const getVisionModel = () => process.env.OPENROUTER_VISION_MODEL || getModel();

function getDefaultHeaders() {
  return {
    "HTTP-Referer": process.env.OPENROUTER_SITE_URL || "http://localhost:3001",
    "X-OpenRouter-Title": process.env.OPENROUTER_APP_NAME || "JobLoop",
  };
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
  let cleaned = payload.trim();

  cleaned = cleaned
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "");

  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      const extracted = cleaned.slice(firstBrace, lastBrace + 1);
      return JSON.parse(extracted) as T;
    }
    throw new Error(
      "模型返回内容无法解析为 JSON，前 200 字符: " + cleaned.slice(0, 200),
    );
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function withTimeout<T>(promise: Promise<T>, ms: number, message: string) {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(message)), ms);
    }),
  ]);
}

function shouldRetryOpenRouterError(error: unknown) {
  if (!(error instanceof Error)) return false;

  return [
    "Client network socket disconnected before secure TLS connection was established",
    "ECONNRESET",
    "ETIMEDOUT",
    "fetch failed",
    "socket hang up",
  ].some((keyword) => error.message.includes(keyword));
}

async function postOpenRouterChatCompletion(body: Record<string, unknown>) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("Missing OPENROUTER_API_KEY");

  const url = new URL(`${OPENROUTER_BASE_URL}/chat/completions`);
  const payload = JSON.stringify(body);
  let lastError: unknown;

  for (let attempt = 0; attempt <= OPENROUTER_MAX_RETRIES; attempt += 1) {
    try {
      return await new Promise<string>((resolve, reject) => {
        const request = https.request(
          url,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Length": Buffer.byteLength(payload),
              "Content-Type": "application/json",
              ...getDefaultHeaders(),
            },
            agent: IPV4_ONLY_AGENT,
            timeout: REQUEST_TIMEOUT_MS,
          },
          (response) => {
            const chunks: Buffer[] = [];

            response.on("data", (chunk) => {
              chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
            });

            response.on("end", () => {
              const responseText = Buffer.concat(chunks).toString("utf8");

              if ((response.statusCode || 500) >= 400) {
                reject(
                  new Error(
                    `OpenRouter request failed with status ${response.statusCode}: ${responseText.slice(0, 200)}`,
                  ),
                );
                return;
              }

              resolve(responseText);
            });
          },
        );

        request.on("timeout", () => {
          request.destroy(
            new Error(
              `OpenRouter request timed out after ${REQUEST_TIMEOUT_MS}ms`,
            ),
          );
        });

        request.on("error", (error) => {
          reject(error);
        });

        request.write(payload);
        request.end();
      });
    } catch (error) {
      lastError = error;
      if (
        attempt < OPENROUTER_MAX_RETRIES &&
        shouldRetryOpenRouterError(error)
      ) {
        await sleep(800 * (attempt + 1));
        continue;
      }
      throw error;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("OpenRouter request failed");
}

function formatStructuredReport(
  value: unknown,
  depth = 0,
  title?: string,
): string[] {
  if (value == null) return [];

  if (typeof value === "string") {
    const text = value.trim();
    if (!text) return [];
    return title ? [`## ${title}`, text] : [text];
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return title ? [`## ${title}`, String(value)] : [String(value)];
  }

  if (Array.isArray(value)) {
    const items = value
      .flatMap((item) => formatStructuredReport(item, depth + 1))
      .filter(Boolean);

    if (!items.length) return [];

    const lines = items.map((item) =>
      item.startsWith("## ") || item.startsWith("- ") ? item : `- ${item}`,
    );

    return title ? [`## ${title}`, ...lines] : lines;
  }

  if (typeof value === "object") {
    const entries = Object.entries(value).filter(([, item]) => item != null);
    if (!entries.length) return [];

    const sections = entries.flatMap(([key, item]) =>
      formatStructuredReport(item, depth + 1, key),
    );

    if (!sections.length) return [];

    if (title && depth > 0) {
      return [`## ${title}`, ...sections];
    }

    return sections;
  }

  return [];
}

function normalizeDetailReport(report: unknown) {
  if (typeof report === "string") {
    return report.trim();
  }

  const formatted = formatStructuredReport(report).join("\n\n").trim();
  return formatted || "暂未生成完整分析报告。";
}

async function requestJson<T>({
  system,
  prompt,
  model: modelOverride,
  trace,
  traceStep,
}: {
  system: string;
  prompt: JsonValue;
  model?: string;
  trace?: ServerTrace;
  traceStep?: string;
}) {
  const model = modelOverride || getModel();
  const step = traceStep || "openrouter:request";
  const messages = [
    { role: "system" as const, content: system },
    { role: "user" as const, content: JSON.stringify(prompt, null, 2) },
  ];
  trace?.log(`${step}:start`, {
    messageCount: messages.length,
    model,
    promptLength: messages[1]?.content.length ?? 0,
    systemLength: system.length,
  });

  let completion: {
    choices?: Array<{
      message?: {
        content?: unknown;
      };
    }>;
  };

  try {
    const responseText = await postOpenRouterChatCompletion({
      model,
      temperature: 0.2,
      max_tokens: 4096,
      messages,
      response_format: { type: "json_object" },
    });
    completion = JSON.parse(responseText) as typeof completion;
  } catch (error) {
    trace?.fail(`${step}:request-failed`, error, {
      model,
    });
    throw error;
  }

  const rawText = extractTextContent(completion.choices?.[0]?.message?.content);
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

function normalizeExtractedJdText(text: string) {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function extractBulletLikeSections(jdText: string, limit: number) {
  return jdText
    .split(/\r?\n|[;；]/)
    .map((item) => item.trim().replace(/^[-*•\d.\s]+/, ""))
    .filter((item) => item.length >= 6)
    .slice(0, limit);
}

function extractStructuredJdQuick(job: JobJd): StructuredJd {
  return {
    companyName: job.companyName,
    jobTitle: job.jobTitle,
    salaryRange: job.structuredJd?.salaryRange,
    responsibilities: extractBulletLikeSections(job.jdText, 6),
    skillRequirements: extractBulletLikeSections(job.jdText, 8),
    benefits: [],
    sourceUrl: job.jobUrl,
    rawSummary: job.jdText.slice(0, 600),
  };
}

function isUsableStructuredJobTitle(value?: string | null) {
  const text = value?.trim();
  if (!text || text.length < 2 || text.length > 40) {
    return false;
  }

  if (/^(?:\d+|[一二三四五六七八九十]+)[、.．)]/.test(text)) {
    return false;
  }

  if (/[;；。！？]/.test(text)) {
    return false;
  }

  const productMentions = text.match(/产品/g)?.length ?? 0;
  const hasRoleSuffix =
    /(经理|助理|顾问|工程师|架构师|专家|实习生|负责人|主管|专员|总监|售前|运营|分析师|开发|测试)$/i.test(
      text,
    );
  if (productMentions >= 3 && !hasRoleSuffix) {
    return false;
  }

  return ![
    "负责",
    "职位描述",
    "岗位职责",
    "工作职责",
    "职位要求",
    "任职要求",
    "需求分析",
    "产品规划",
    "原型设计",
    "PRD",
    "输出",
  ].some((keyword) => text.includes(keyword));
}

function normalizeStructuredJdIdentity(
  structuredJd: StructuredJd,
  job: JobJd,
): StructuredJd {
  const companyName = structuredJd.companyName?.trim() || job.companyName;
  const jobTitle = isUsableStructuredJobTitle(structuredJd.jobTitle)
    ? structuredJd.jobTitle.trim()
    : job.jobTitle;

  return {
    ...structuredJd,
    companyName,
    jobTitle,
  };
}

function toPromptStructuredJd(structuredJd?: StructuredJd | null) {
  if (!structuredJd) {
    return null;
  }

  return {
    companyName: structuredJd.companyName,
    jobTitle: structuredJd.jobTitle,
    salaryRange: structuredJd.salaryRange || "",
    responsibilities: structuredJd.responsibilities,
    skillRequirements: structuredJd.skillRequirements,
    experienceRequirement: structuredJd.experienceRequirement || "",
    educationRequirement: structuredJd.educationRequirement || "",
    location: structuredJd.location || "",
    benefits: structuredJd.benefits,
    sourceUrl: structuredJd.sourceUrl || "",
    rawSummary: structuredJd.rawSummary,
  };
}

function toPromptCompanyResearch(companyResearch?: CompanyResearch | null) {
  if (!companyResearch) {
    return null;
  }

  return {
    industry: companyResearch.industry || "",
    companyScale: companyResearch.companyScale || "",
    mainBusiness: companyResearch.mainBusiness || "",
    keyProducts: companyResearch.keyProducts,
    reputation: companyResearch.reputation || "",
    summary: companyResearch.summary,
    searchedAt: companyResearch.searchedAt,
    citations: (companyResearch.citations || []).map((citation) => ({
      title: citation.title,
      url: citation.url,
    })),
  };
}

function buildFallbackCompanyResearch(): CompanyResearch {
  return {
    industry: "待补充",
    companyScale: "待补充",
    mainBusiness: "待补充",
    keyProducts: [],
    reputation: "待补充",
    summary: "联网公司补充暂未完成，本次先基于 JD 文本继续完成评分和分析。",
    searchedAt: createTimestamp(),
    citations: [],
  };
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

function buildHeuristicScoreBreakdown(
  job: JobJd,
  resumeVersions: ResumeVersion[],
): ScoreBreakdown {
  const bestResumeScore = Math.min(
    100,
    Math.max(
      0,
      ...resumeVersions.map((version) =>
        scoreResumeVersionForJob(job, version),
      ),
    ),
  );
  const normalizedJobText = normalizeMatchText(
    [job.jobTitle, job.jdText, job.structuredJd?.rawSummary]
      .filter(Boolean)
      .join(" "),
  );
  const hasAiSignal =
    normalizedJobText.includes("ai") || normalizedJobText.includes("人工智能");
  const roleMatch =
    bestResumeScore >= 70 ? 76 : bestResumeScore >= 40 ? 66 : 56;

  return {
    industryMatch: hasAiSignal ? 72 : 60,
    companyStrength: job.companyResearch?.summary ? 62 : 50,
    roleMatch,
    salaryCompetitiveness: job.structuredJd?.salaryRange ? 65 : 50,
    growthPotential: hasAiSignal ? 72 : 62,
  };
}

function cleanInlineText(text?: string | null) {
  return (text || "")
    .replace(/\s+/g, " ")
    .replace(/【[^】]{1,20}】/g, "")
    .trim();
}

function truncateSentence(text: string, maxLength: number) {
  const cleaned = cleanInlineText(text);
  if (cleaned.length <= maxLength) {
    return cleaned;
  }

  const sliced = cleaned.slice(0, maxLength);
  const breakIndex = Math.max(
    sliced.lastIndexOf("。"),
    sliced.lastIndexOf("；"),
    sliced.lastIndexOf(";"),
    sliced.lastIndexOf("，"),
    sliced.lastIndexOf(","),
  );

  return `${sliced.slice(0, breakIndex > 40 ? breakIndex : maxLength).trim()}...`;
}

function decisionSummaryLabel(decision: JobAnalysisResult["applyDecision"]) {
  if (decision === "recommend") return "推荐投递";
  if (decision === "not_recommended") return "不建议优先投递";
  return "建议谨慎投递";
}

function scoreLevel(score: number) {
  if (score >= 80) return "高";
  if (score >= 65) return "较好";
  if (score >= 50) return "中等";
  return "偏低";
}

function normalizeCardSummary({
  item,
  job,
  matchScore,
  recommendedResumeVersionId,
  resumeVersions,
  scoreBreakdown,
}: {
  item: {
    applyDecision: JobAnalysisResult["applyDecision"];
    mainRisk: string;
    summary: string;
  };
  job: JobJd;
  matchScore: number;
  recommendedResumeVersionId: string;
  resumeVersions: ResumeVersion[];
  scoreBreakdown: ScoreBreakdown;
}) {
  const sourceSummary = cleanInlineText(item.summary);
  const isVerboseReport =
    sourceSummary.length > 260 ||
    /【[^】]+】/.test(sourceSummary) ||
    /行业匹配度|公司实力|岗位匹配度|薪资竞争力|成长性|评分体系|总评/.test(
      sourceSummary,
    );

  if (sourceSummary && !isVerboseReport) {
    return truncateSentence(sourceSummary, 220);
  }

  const companyName = job.companyName ? `${job.companyName}` : "";
  const title = `${companyName}${job.jobTitle}岗位`;
  const resumeName =
    resumeVersions.find((version) => version.id === recommendedResumeVersionId)
      ?.name || "当前最匹配简历";
  const salary = scoreLevel(scoreBreakdown.salaryCompetitiveness);
  const company = scoreLevel(scoreBreakdown.companyStrength);
  const growth = scoreLevel(scoreBreakdown.growthPotential);
  const role = scoreLevel(scoreBreakdown.roleMatch);
  const risk = truncateSentence(item.mainRisk, 46).replace(/[。；;，,]+$/g, "");
  const tailoring =
    item.summary.includes("微调") || item.mainRisk.includes("微调")
      ? "需定制简历突出岗位相关交付经验"
      : "建议投递前微调简历表达";

  return truncateSentence(
    `${title}综合评分${matchScore}分（满分100），${decisionSummaryLabel(item.applyDecision)}。薪资竞争力${salary}，公司实力${company}，成长性${growth}。岗位匹配度${role}，推荐使用${resumeName}，${tailoring}${risk ? `，重点留意：${risk}` : ""}。`,
    240,
  );
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
    summary: normalizeCardSummary({
      item,
      job,
      matchScore: clampScore(weightedScore),
      recommendedResumeVersionId,
      resumeVersions,
      scoreBreakdown,
    }),
    status: "ready",
    createdAt: createTimestamp(),
  };
}

async function extractStructuredJd(job: JobJd) {
  const { data } = await requestJson<
    { structuredJd?: StructuredJd } & Partial<StructuredJd>
  >({
    system:
      "你是 JobLoop 的中文 JD 结构化提取助手。你只做信息抽取，不做评价，不编造缺失信息。必须先确认当前输入只对应 1 份 JD，再从该 JD 中准确抽取以下字段：公司名称（companyName）、招聘岗位名称（jobTitle）、工作地点（location）、工作年限要求（experienceRequirement）、薪资范围（salaryRange）。公司名称不能误填为招聘人姓名、活跃时间、城市、薪资或福利标签；岗位名称不能误填为整段职责、日期、招聘文案或\u201C职位详情\u201D。工作地点从 JD 中提取城市名（如\u201C深圳\u201D\u201C北京\u201D），不要附带区/街道。工作年限从 JD 中提取如\u201C1-3年\u201D\u201C3-5年\u201D等。薪资范围（salaryRange）请从 JD 文本中提取，常见格式如\u201C10-15K\u201D、\u201C15K-25K\u201D等，preExtractedSalary 字段已提供初步识别结果供参考。若 JD 未提供某字段，则返回空字符串或空数组。只返回合法 JSON。",
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
        preExtractedSalary: job.structuredJd?.salaryRange || "",
      },
    },
  });

  const nested = data.structuredJd;
  if (nested && typeof nested === "object" && "companyName" in nested) {
    return {
      ...nested,
      salaryRange: nested.salaryRange || job.structuredJd?.salaryRange,
    };
  }

  if (data && typeof data === "object" && "companyName" in data) {
    const result = data as unknown as StructuredJd;
    return {
      ...result,
      salaryRange: result.salaryRange || job.structuredJd?.salaryRange,
    };
  }

  return extractStructuredJdQuick(job);
}

async function buildCompanyResearch(job: JobJd, trace?: ServerTrace) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("Missing OPENROUTER_API_KEY");

  trace?.log("batch-analysis:job:company-research:start", {
    companyName: job.companyName,
    jobId: job.id,
    timeoutMs: COMPANY_RESEARCH_TIMEOUT_MS,
  });

  let lastError: unknown;

  for (let attempt = 0; attempt <= 0; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      COMPANY_RESEARCH_TIMEOUT_MS,
    );

    try {
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
                '你是 JobLoop 的中文公司研究助手。请围绕目标公司进行联网检索，输出从属行业、公司规模、主营业务、主要产品、公司风评五类信息。公司规模（companyScale）必须尽可能精确：若能查到员工人数（如"约464人"），请直接写明人数；若无法查到精确人数，则用"小型（<50人）/ 中小型（50-300人）/ 中型（300-1000人）/ 大型（1000+人）"描述。只输出保守、可公开支持的摘要；不夸大、不猜测未经证实的融资、估值、排名或内部情况。若某项无法确认，则明确写"待补充"。只返回合法 JSON。',
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
          max_tokens: 2048,
          tools: [
            {
              type: "openrouter:web_search",
              parameters: {
                engine: "exa",
                max_results: 5,
                max_characters: 3000,
              },
            },
          ],
        }),
      });
      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(
          `Company research failed with status ${response.status}`,
        );
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

      const parsed =
        parseJsonPayload<Omit<CompanyResearch, "searchedAt">>(rawText);
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
    } catch (error) {
      clearTimeout(timeout);
      lastError = error;
      if (
        attempt < OPENROUTER_MAX_RETRIES &&
        shouldRetryOpenRouterError(error)
      ) {
        await sleep(600 * (attempt + 1));
        continue;
      }
      trace?.fail("batch-analysis:job:company-research", error, {
        jobId: job.id,
      });
      return buildFallbackCompanyResearch();
    }
  }

  trace?.fail(
    "batch-analysis:job:company-research",
    lastError instanceof Error
      ? lastError
      : new Error("Company research failed after retries"),
    { jobId: job.id },
  );
  return buildFallbackCompanyResearch();
}

export async function extractStructuredJdOnly(
  job: JobJd,
): Promise<StructuredJd> {
  try {
    return normalizeStructuredJdIdentity(await extractStructuredJd(job), job);
  } catch {
    return normalizeStructuredJdIdentity(extractStructuredJdQuick(job), job);
  }
}

const DIRECT_JD_FETCH_HOST_SUFFIXES = [
  "zhipin.com",
  "liepin.com",
  "lagou.com",
  "jobs.bytedance.com",
  "jobs.tencent.com",
  "jobs.alibaba.com",
  "jobs.meituan.com",
];

function shouldDirectFetchJdUrl(rawUrl: string) {
  try {
    const hostname = new URL(rawUrl).hostname.toLowerCase();
    return DIRECT_JD_FETCH_HOST_SUFFIXES.some(
      (suffix) => hostname === suffix || hostname.endsWith(`.${suffix}`),
    );
  } catch {
    return false;
  }
}

function decodeHtmlEntities(text: string) {
  return text
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_match, hex: string) =>
      String.fromCodePoint(Number.parseInt(hex, 16)),
    )
    .replace(/&#(\d+);/g, (_match, value: string) =>
      String.fromCodePoint(Number.parseInt(value, 10)),
    );
}

function getHtmlAttribute(tag: string, name: string) {
  const pattern = new RegExp(
    `${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`,
    "i",
  );
  const match = tag.match(pattern);
  return match?.[2] || match?.[3] || match?.[4] || "";
}

function extractHtmlMetadata(html: string) {
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "";
  const metaValues = Array.from(html.matchAll(/<meta\b[^>]*>/gi)).flatMap(
    ([tag]) => {
      const key = (
        getHtmlAttribute(tag, "name") || getHtmlAttribute(tag, "property")
      ).toLowerCase();
      if (
        !["description", "keywords", "og:title", "og:description"].includes(key)
      ) {
        return [];
      }
      const content = getHtmlAttribute(tag, "content").trim();
      return content ? [content] : [];
    },
  );

  return [title, ...metaValues].filter(Boolean).join("\n");
}

function htmlToReadableText(html: string) {
  const metadata = extractHtmlMetadata(html);
  const bodyText = html
    .replace(/<script\b[\s\S]*?<\/script>/gi, "\n")
    .replace(/<style\b[\s\S]*?<\/style>/gi, "\n")
    .replace(/<noscript\b[\s\S]*?<\/noscript>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(?:p|div|li|section|article|h[1-6]|tr)>/gi, "\n")
    .replace(/<[^>]+>/g, " ");

  return normalizeExtractedJdText(
    decodeHtmlEntities(`${metadata}\n${bodyText}`)
      .split("\n")
      .map((line) => line.trim().replace(/\s+/g, " "))
      .filter(Boolean)
      .join("\n"),
  ).slice(0, 18_000);
}

function looksLikeBlockedJobPage(text: string) {
  const normalized = text.toLowerCase();
  const blockedSignals = [
    "安全验证",
    "验证码",
    "访问过于频繁",
    "boss直聘安全中心",
    "security check",
    "verify you are human",
  ];
  const jdSignals = ["职位描述", "岗位职责", "任职要求", "岗位要求"];

  return (
    blockedSignals.some((signal) =>
      normalized.includes(signal.toLowerCase()),
    ) && !jdSignals.some((signal) => text.includes(signal))
  );
}

async function fetchJdPageReadableText(url: string) {
  if (!shouldDirectFetchJdUrl(url)) {
    return "";
  }

  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    JD_PAGE_FETCH_TIMEOUT_MS,
  );

  try {
    const response = await fetch(url, {
      headers: {
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,text/plain;q=0.8,*/*;q=0.7",
        "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
        "Cache-Control": "no-cache",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
      },
      redirect: "follow",
      signal: controller.signal,
    });

    if (!response.ok) {
      return "";
    }

    const html = await response.text();
    const readableText = htmlToReadableText(html);
    if (looksLikeBlockedJobPage(readableText)) {
      return "";
    }

    return readableText;
  } catch {
    return "";
  } finally {
    clearTimeout(timeout);
  }
}

function parseJdExtractionCompletion(
  responseText: string,
  fallbackUrl: string,
  model: string,
) {
  const completion = JSON.parse(responseText) as {
    choices?: Array<{
      message?: {
        content?: unknown;
      };
    }>;
  };
  const rawText = extractTextContent(completion.choices?.[0]?.message?.content);
  if (!rawText) {
    throw new Error("URL 识别没有返回内容");
  }

  const data = parseJsonPayload<{
    companyName?: string;
    jobTitle?: string;
    jdText?: string;
    sourceUrl?: string;
  }>(rawText);
  const jdText = normalizeExtractedJdText(data.jdText || "");

  return {
    companyName: data.companyName?.trim() || "",
    jobTitle: data.jobTitle?.trim() || "",
    jdText,
    sourceUrl: data.sourceUrl?.trim() || fallbackUrl,
    model,
  };
}

async function extractJdFromReadablePageText(url: string, pageText: string) {
  const model = getModel();
  const responseText = await postOpenRouterChatCompletion({
    model,
    temperature: 0,
    max_tokens: 4096,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "你是 JobLoop 的招聘页面正文抽取器。用户会给你招聘链接和服务端读取到的页面可见文本。只从给定文本中抽取该链接对应的岗位信息，禁止补写、推断或混入其他岗位。只返回合法 JSON。",
      },
      {
        role: "user",
        content: JSON.stringify(
          {
            task: "extract_job_description_from_readable_page_text",
            url,
            pageText,
            outputSchema: {
              companyName: "",
              jobTitle: "",
              jdText: "",
              sourceUrl: "",
            },
            requirements: [
              "jdText 必须保留原文可见的职位描述、岗位职责、任职要求、薪资、地点、经验、学历等信息",
              "不要改写成分析报告，不要补充页面中没有的职责或要求",
              "忽略登录提示、导航栏、按钮、分享、举报、推荐岗位和平台广告",
              "如果页面正文被安全验证拦截，jdText 返回空字符串",
            ],
          },
          null,
          2,
        ),
      },
    ],
  });

  return parseJdExtractionCompletion(responseText, url, model);
}

export async function extractJdFromUrlWithAi(url: string) {
  const pageText = await fetchJdPageReadableText(url);

  if (pageText.length >= 120) {
    const directResult = await extractJdFromReadablePageText(url, pageText);
    if (directResult.jdText.length >= 40) {
      return directResult;
    }
  }

  throw new Error(
    "该岗位链接页面未开放足够正文，可能被招聘平台登录/安全验证限制。请上传岗位截图，或直接粘贴 JD 正文后再分析。",
  );
}

export async function extractJdFromImageWithAi(params: {
  imageDataUrl: string;
  fileName: string;
}) {
  const { imageDataUrl, fileName } = params;
  const responseText = await postOpenRouterChatCompletion({
    model: getVisionModel(),
    temperature: 0,
    max_tokens: 4096,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "你是严格 OCR 转写引擎，不是 JD 分析器。你的唯一任务是逐字转写图片中可见的招聘文字。禁止补全、改写、总结、推断、纠错、同义替换或根据常识添加图片中不存在的工具/职责/要求。保留原始标题、薪资、地点、经验、学历、标签、段落、编号和换行顺序。看不清的字写为[无法辨认]。只返回合法 JSON。",
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: JSON.stringify({
              task: "verbatim_ocr_job_description_image",
              fileName,
              outputSchema: {
                jdText: "",
              },
              requirements: [
                "jdText 只能包含图片中肉眼可见的文字",
                "从顶部职位标题、薪资、地点、经验、学历开始转写，继续转写职位描述、岗位职责、任职要求等正文",
                "工具名、平台名、英文大小写、数字、标点必须尽量按图片原文保留",
                "不要把标签词推断成岗位名，不要生成 companyName 或 jobTitle 字段",
                "不要添加图片中没有出现的技术、平台、指标、项目管理、团队管理或合规内容",
                "可忽略按钮、侧边栏、聊天入口、推荐职位、头像姓名等非 JD 主体内容",
                "如果截图只包含部分 JD，只转写可见部分，不要补齐不可见内容",
              ],
            }),
          },
          {
            type: "image_url",
            image_url: {
              url: imageDataUrl,
            },
          },
        ],
      },
    ],
  });
  const completion = JSON.parse(responseText) as {
    choices?: Array<{
      message?: {
        content?: unknown;
      };
    }>;
  };
  const rawText = extractTextContent(completion.choices?.[0]?.message?.content);
  if (!rawText) {
    throw new Error("图片识别没有返回内容");
  }

  const data = parseJsonPayload<{
    jdText?: string;
  }>(rawText);
  const jdText = normalizeExtractedJdText(data.jdText || "");

  if (jdText.length < 30) {
    throw new Error("未能从图片识别出足够的岗位文字");
  }

  return {
    jdText,
    model: getVisionModel(),
  };
}

export async function enrichCompanyOnly(job: JobJd): Promise<CompanyResearch> {
  return buildCompanyResearch(job);
}

export async function enrichJobWithAi(job: JobJd, trace?: ServerTrace) {
  const fastMode = DEPLOYMENT_FAST_MODE;
  trace?.log("job-enrich:start", {
    fastMode,
    jobId: job.id,
    jobTitle: job.jobTitle,
  });

  let structuredJd: StructuredJd;
  if (fastMode) {
    structuredJd = extractStructuredJdQuick(job);
  } else {
    try {
      structuredJd = await withTimeout(
        extractStructuredJd(job),
        STRUCTURED_JD_TIMEOUT_MS,
        "Structured JD extraction timed out",
      );
    } catch (error) {
      trace?.fail("job-enrich:extract-structured-jd", error, {
        jobId: job.id,
      });
      structuredJd = extractStructuredJdQuick(job);
    }
  }
  let companyResearch: CompanyResearch = buildFallbackCompanyResearch();

  if (!fastMode) {
    try {
      companyResearch = await buildCompanyResearch(job, trace);
    } catch (error) {
      trace?.fail("job-enrich:company-research", error, {
        jobId: job.id,
      });
      companyResearch = buildFallbackCompanyResearch();
    }
  }

  structuredJd = normalizeStructuredJdIdentity(structuredJd, job);

  const enrichedJob: JobJd = {
    ...job,
    companyName: structuredJd.companyName,
    jobTitle: structuredJd.jobTitle,
    structuredJd,
    companyResearch,
    companyInfo: companyResearch.summary,
    processingStatus: "scoring",
    processingError: undefined,
    updatedAt: createTimestamp(),
  };

  trace?.log("job-enrich:completed", {
    jobId: job.id,
  });

  return { job: enrichedJob, model: getModel() };
}

function buildFallbackScoreResult(
  job: JobJd,
  resumeVersions: ResumeVersion[] = [],
  error: unknown,
): JobAnalysisResult {
  const errorMsg = error instanceof Error ? error.message : "AI score fallback";
  const safeResumeVersions = Array.isArray(resumeVersions)
    ? resumeVersions
    : [];
  const scoreBreakdown = buildHeuristicScoreBreakdown(job, safeResumeVersions);
  const matchScore = Math.round(
    scoreBreakdown.industryMatch * 0.25 +
      scoreBreakdown.companyStrength * 0.2 +
      scoreBreakdown.roleMatch * 0.3 +
      scoreBreakdown.salaryCompetitiveness * 0.15 +
      scoreBreakdown.growthPotential * 0.1,
  );

  return {
    id: createEntityId("analysis"),
    jobId: job.id,
    recommendedResumeVersionId: pickFallbackResumeVersionId(
      job,
      safeResumeVersions,
    ),
    matchScore: clampScore(matchScore),
    scoreBreakdown,
    applyDecision: matchScore >= 65 ? "recommend" : "cautious",
    needsTailoring: true,
    mainRisk: `AI score model returned an invalid shape, fallback used: ${errorMsg}`,
    summary:
      "AI 评分模型本次返回格式异常，系统已基于 JD、公司信息和简历关键词生成保守评分。建议查看详情并人工确认关键匹配点。",
    status: "ready",
    createdAt: new Date().toISOString(),
  };
}

export async function scoreJobWithAi(
  job: JobJd,
  resumeVersions: ResumeVersion[] = [],
  trace?: ServerTrace,
) {
  const safeResumeVersions = Array.isArray(resumeVersions)
    ? resumeVersions
    : [];
  try {
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
        "你是 JobLoop 的岗位评分与投递决策助手。请基于结构化 JD、公司补充信息和简历版本，对单个岗位打分并输出求职决策摘要。评分体系固定：行业匹配度25%、公司实力20%、岗位匹配度30%、薪资竞争力15%、成长性10%。每个维度先单独给0-100分，再按权重计算总分。\n\n【summary 字段严格要求】summary 只写 2-4 句短摘要，120-220 字；格式接近“XX岗位综合评分81分（满分100），推荐投递。薪资竞争力高，公司实力强，成长性好。岗位匹配度良好，候选人具备XX能力，但需定制简历突出XX经验。”禁止写分项公式、逐项长报告、【总评】、【行业匹配度】等标题。\n\n【STRICT】薪资竞争力必须严格按以下查表规则打分，禁止基于自身知识调整：\n1. 取 JD 薪资区间的最低值，结合 location（城市）和 experienceRequirement（工作年限）查下表。\n2. 城市归为两类：一线（北上广深）、其他（新一线/二线/三线统一按此档）。若 location 缺失，按\u201C其他\u201D处理。\n\n一线城市（北上广深）：\n  1-3年：\u226515K→高(80-90)，10-14K→中(55-70)，<10K→低(30-50)\n  3-5年：\u226520K→高(80-90)，15-19K→中(55-70)，<15K→低(30-50)\n  \u22655年：\u226525K→高(80-90)，18-24K→中(55-70)，<18K→低(30-50)\n\n其他城市：\n  1-3年：\u226512K→高(80-90)，8-11K→中(55-70)，<8K→低(30-50)\n  3-5年：\u226516K→高(80-90)，10-15K→中(55-70)，<10K→低(30-50)\n  \u22655年：\u226520K→高(80-90)，13-19K→中(55-70)，<13K→低(30-50)\n\n3. 若 JD 缺少薪资信息，按中性分50处理并在 summary 中说明。\n4. 若 JD 缺少城市或年限，在 summary 中注明\u201C因缺少XX信息，薪资竞争力评估可能偏差\u201D。\n\n只返回合法 JSON。",
      prompt: {
        task: "single_job_score",
        scoringWeights: {
          industryMatch: 25,
          companyStrength: 20,
          roleMatch: 30,
          salaryCompetitiveness: 15,
          growthPotential: 10,
        },
        resumeVersions: safeResumeVersions.map((version) => ({
          id: version.id,
          name: version.name,
          targetDirection: version.targetDirection,
          rewriteFocus: version.rewriteFocus,
          content: version.content,
        })),
        jobs: [
          {
            id: job.id,
            companyName: job.companyName,
            jobTitle: job.jobTitle,
            structuredJd: toPromptStructuredJd(job.structuredJd),
            companyResearch: toPromptCompanyResearch(job.companyResearch),
          },
        ],
        outputSchema: {
          analyses: [
            {
              jobId: job.id,
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
      trace,
      traceStep: "job-score:model",
    });

    if (!Array.isArray(data.analyses)) {
      throw new Error("Score model response missing analyses array");
    }

    const item = data.analyses.find((analysis) => analysis.jobId === job.id);

    if (!item) {
      throw new Error(`缺少岗位 ${job.jobTitle} 的评分结果`);
    }

    return {
      result: normalizeAnalysisRecord(item, job, safeResumeVersions),
      model,
    };
  } catch (error) {
    trace?.fail("job-score:ai-failed", error, { jobId: job.id });
    return {
      result: buildFallbackScoreResult(job, safeResumeVersions, error),
      model: getModel(),
    };
  }
}

export async function generateBatchAnalysisWithAi(
  jobs: JobJd[],
  resumeVersions: ResumeVersion[],
  trace?: ServerTrace,
) {
  const fastMode = DEPLOYMENT_FAST_MODE;
  trace?.log("batch-analysis:start", {
    fastMode,
    jobCount: jobs.length,
    resumeVersionCount: resumeVersions.length,
  });
  const enrichedJobs = await Promise.all(
    jobs.map(async (job) => {
      trace?.log("batch-analysis:job:start", {
        jobId: job.id,
        jobTitle: job.jobTitle,
      });
      let structuredJd: StructuredJd;
      if (fastMode) {
        structuredJd = extractStructuredJdQuick(job);
      } else {
        try {
          structuredJd = await extractStructuredJd(job);
        } catch (error) {
          trace?.fail("batch-analysis:job:extract-structured-jd", error, {
            jobId: job.id,
            jobTitle: job.jobTitle,
          });
          structuredJd = extractStructuredJdQuick(job);
        }
      }
      let companyResearch: CompanyResearch = buildFallbackCompanyResearch();

      if (!fastMode) {
        try {
          companyResearch = await buildCompanyResearch(job);
        } catch (error) {
          trace?.fail("batch-analysis:job:company-research", error, {
            jobId: job.id,
            jobTitle: job.jobTitle,
          });
          companyResearch = buildFallbackCompanyResearch();
        }
      }

      structuredJd = normalizeStructuredJdIdentity(structuredJd, job);

      return {
        ...job,
        companyName: structuredJd.companyName,
        jobTitle: structuredJd.jobTitle,
        structuredJd,
        companyResearch,
        companyInfo: companyResearch.summary,
        updatedAt: createTimestamp(),
      };
    }),
  );
  trace?.log("batch-analysis:jobs:enriched", {
    enrichedJobCount: enrichedJobs.length,
  });

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
      "你是 JobLoop 的岗位评分与投递决策助手。请基于结构化 JD、公司补充信息和简历版本，对每个岗位打分并输出求职决策摘要。评分体系固定：行业匹配度25%、公司实力20%、岗位匹配度30%、薪资竞争力15%、成长性10%。每个维度先单独给0-100分，再按权重计算总分。summary 只写 2-4 句短摘要，120-220 字，禁止写分项公式、逐项长报告、【总评】、【行业匹配度】等标题。若 JD 缺少薪资信息，薪资竞争力按中性分50处理，并在 summary 或 mainRisk 中说明“薪资信息缺失”。只返回合法 JSON。",
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
    trace,
    traceStep: "batch-analysis:model",
  });
  trace?.log("batch-analysis:model:parsed", {
    analysisCount: data.analyses.length,
    model,
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
    trace?.log("batch-analysis:model:mismatch", {
      enrichedJobCount: enrichedJobs.length,
      uniqueAnalysisCount: uniqueAnalyses.size,
    });
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
  trace?.log("batch-analysis:completed", {
    analysisCount: analyses.length,
    model,
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
    model: getDetailModel(),
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
      reportRequirements: {
        headings: [
          "## 匹配度分析",
          "## 简历修改建议",
          "## 面试准备",
          "## 风险提示",
        ],
        conclusionMaxChars: 30,
        reportTotalCharsRange: "500-700",
        interviewPrepItemFormat: "问题：... 回答框架：...",
      },
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
    report: normalizeDetailReport(data.report),
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
