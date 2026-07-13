import type { JdBatch, JobJd } from "./types";

const now = () => new Date().toISOString();

const slug = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const MAX_BATCH_JOBS = 5;
const MIN_BLOCK_LENGTH = 40;
const START_THRESHOLD = 5;
const FOLLOWUP_SCAN_LIMIT = 8;

export type ParsedJdDraft = {
  id: string;
  companyName: string;
  jobTitle: string;
  jobUrl?: string;
  jdText: string;
  companyInfo?: string;
  salaryRange?: string;
};

export type ParsedJdBatchResult = {
  drafts: ParsedJdDraft[];
  detectedCount: number;
  hasMoreThanLimit: boolean;
  mayBeIncomplete: boolean;
  warnings: string[];
};

const ROLE_HINTS = [
  "产品",
  "产品经理",
  "产品助理",
  "售前",
  "架构师",
  "工程师",
  "顾问",
  "运营",
  "解决方案",
  "咨询",
  "项目经理",
  "实施",
  "交付",
  "数据",
  "算法",
  "AI",
  "LLM",
  "Agent",
  "RAG",
  "product",
  "assistant",
  "manager",
  "consultant",
  "engineer",
  "architect",
  "presales",
  "solution",
];

const ROLE_SUFFIXES = [
  "经理",
  "助理",
  "顾问",
  "工程师",
  "架构师",
  "专家",
  "实习生",
  "负责人",
  "主管",
  "专员",
  "总监",
  "售前",
  "运营",
  "分析师",
  "开发",
  "测试",
  "assistant",
  "manager",
  "consultant",
  "engineer",
  "architect",
];

const BODY_SECTION_HINTS = [
  "岗位职责",
  "工作职责",
  "职位详情",
  "岗位要求",
  "任职要求",
  "任职资格",
  "岗位描述",
  "职位描述",
  "加分项",
];

const BODY_SENTENCE_HINTS = [
  "负责",
  "熟悉",
  "具备",
  "参与",
  "推进",
  "协同",
  "完成",
  "支持",
  "优先",
];

const PLATFORM_NOISE_HINTS = [
  "BOSS直聘",
  "扫码查看职位详情",
  "找工作，上BOSS直聘直接谈",
  "立即沟通",
  "继续沟通",
  "分享",
  "举报",
  "微信扫码",
  "感兴趣",
  "取消感兴趣",
  "刚刚活跃",
  "今日活跃",
  "本周活跃",
  "本月活跃",
  "人事经理",
  "招聘经理",
  "招聘专员",
];

const META_HINTS = [
  "本科",
  "大专",
  "硕士",
  "博士",
  "应届生",
  "全职",
  "兼职",
  "实习",
  "13薪",
  "14薪",
  "五险一金",
];

const CITY_HINTS = [
  "北京",
  "上海",
  "深圳",
  "广州",
  "杭州",
  "成都",
  "武汉",
  "苏州",
  "南京",
  "西安",
  "长沙",
  "厦门",
  "珠海",
  "东莞",
  "天津",
  "重庆",
  "合肥",
  "青岛",
  "佛山",
  "宁波",
  "无锡",
  "郑州",
  "福州",
  "南昌",
  "昆明",
  "济南",
  "香港",
  "新加坡",
];

const explicitBlockSeparator = /\n\s*(?:---+|___+|###)\s*\n|\n{3,}/;

type CandidateBlock = {
  lines: string[];
  startIndexes: number[];
};

const normalizeText = (text: string) =>
  text
    .replace(/\r\n/g, "\n")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .trim();

const cleanLine = (line: string) => line.trim().replace(/\s+/g, " ");

const normalizeForMatch = (text: string) =>
  cleanLine(text).toLowerCase().replace(/\s+/g, "");

const findUrl = (text: string) =>
  normalizeText(text)
    .match(/https?:\/\/[^\s)]+/i)?.[0]
    ?.trim();

const findValue = (text: string, labels: string[]) => {
  const lines = normalizeText(text)
    .split("\n")
    .map((line) => cleanLine(line))
    .filter(Boolean);

  for (const label of labels) {
    const matched = lines.find((line) =>
      new RegExp(`^${label}\\s*[:：]`, "i").test(line),
    );

    if (matched) {
      return matched.replace(new RegExp(`^${label}\\s*[:：]\\s*`, "i"), "");
    }
  }

  return "";
};

function isDateLine(line: string) {
  const text = cleanLine(line);
  return (
    /^\d{1,2}[A-Za-z]{3}\.\d{4}$/i.test(text) ||
    /^\d{4}[./-]\d{1,2}[./-]\d{1,2}$/.test(text)
  );
}

function isPlatformNoiseLine(line: string) {
  const text = cleanLine(line);
  if (!text) {
    return true;
  }

  if (isDateLine(text)) {
    return true;
  }

  return (
    text.includes("活跃") ||
    PLATFORM_NOISE_HINTS.some((hint) => text.includes(hint)) ||
    /[·・]\s*(?:人事|招聘|HR)/i.test(text)
  );
}

function extractCompanyFromRecruiterLine(line: string) {
  const text = cleanLine(line);
  const match = text.match(
    /^(.{2,30}?)[·・]\s*(?:人事|招聘|HR|招聘经理|招聘专员|人事经理)/i,
  );
  return match?.[1]?.trim() || "";
}

function isLikelyMetaLine(line: string) {
  const text = cleanLine(line);
  if (!text) {
    return false;
  }

  const parts = text
    .split(/[/|｜·]/)
    .map((item) => item.trim())
    .filter(Boolean);

  const hasSalary =
    /\d{1,2}(?:\.\d)?\s*-\s*\d{1,2}(?:\.\d)?\s*K/i.test(text) ||
    /\d{1,2}(?:\.\d)?\s*K(?:以上|以下)?/i.test(text);
  const hasExperience =
    /\d+\s*-\s*\d+\s*年/.test(text) ||
    /\d+\s*年(?:以上|以下)?/.test(text) ||
    text.includes("应届生");
  const hasEducation = /(本科|大专|硕士|博士|学历不限)/.test(text);
  const hasEmployment = /(全职|兼职|实习)/.test(text);
  const hasCity = CITY_HINTS.some((city) => text.includes(city));

  if (
    parts.length >= 2 &&
    [hasSalary, hasExperience, hasEducation, hasCity].filter(Boolean).length >=
      2
  ) {
    return true;
  }

  if (hasSalary || hasExperience || hasEducation || hasEmployment) {
    return text.length <= 40;
  }

  return false;
}

function extractSalaryRange(text: string): string | undefined {
  const salaryPatterns = [
    /(\d{1,2}(?:\.\d)?)\s*-\s*(\d{1,2}(?:\.\d)?)\s*K/i,
    /(\d{1,2}(?:\.\d)?)\s*[Kk]\s*-\s*(\d{1,2}(?:\.\d)?)\s*[Kk]/i,
    /(\d{1,2}(?:\.\d)?)\s*-\s*(\d{1,2}(?:\.\d)?)\s*[Kk]/i,
    /(\d{1,3})\s*-\s*(\d{1,3})\s*[Kk]/i,
  ];

  for (const pattern of salaryPatterns) {
    const match = text.match(pattern);
    if (match) {
      const low = Number.parseFloat(match[1]);
      const high = Number.parseFloat(match[2]);
      if (low > 0 && high > low) {
        return `${low}-${high}K`;
      }
    }
  }

  const singleSalaryPattern = /(\d{1,2}(?:\.\d)?)\s*K(?:以上|以下)?/i;
  const singleMatch = text.match(singleSalaryPattern);
  if (singleMatch) {
    return `${singleMatch[1]}K`;
  }

  return undefined;
}

function looksLikeBodySection(line: string) {
  const text = cleanLine(line);
  return BODY_SECTION_HINTS.some((hint) => text.includes(hint));
}

function looksLikeBodySentence(line: string) {
  const text = cleanLine(line);
  if (!text) {
    return false;
  }

  return (
    BODY_SENTENCE_HINTS.some((hint) => text.includes(hint)) ||
    /[；。:：]/.test(text)
  );
}

function looksLikeCompanyStart(line: string) {
  const text = cleanLine(line);
  if (!text) {
    return false;
  }

  return (
    text.includes("正在招聘") ||
    text.includes("招聘中") ||
    /^公司[:：]/.test(text)
  );
}

function looksLikeJobTitle(line: string) {
  const text = cleanLine(line);
  const normalized = normalizeForMatch(text);
  if (!text || isPlatformNoiseLine(text) || isLikelyMetaLine(text)) {
    return false;
  }

  if (text.length < 4 || text.length > 40) {
    return false;
  }

  if (looksLikeBodySection(text) || looksLikeBodySentence(text)) {
    return false;
  }

  if (/^[A-Za-z0-9\-_/]+$/.test(text) && text.length < 6) {
    return false;
  }

  const productMentions = text.match(/产品/g)?.length ?? 0;
  const hasRoleSuffix = ROLE_SUFFIXES.some((suffix) =>
    normalized.endsWith(normalizeForMatch(suffix)),
  );
  if (productMentions >= 3 && !hasRoleSuffix) {
    return false;
  }

  const hasRoleHint =
    ROLE_HINTS.some((hint) => normalized.includes(normalizeForMatch(hint))) ||
    hasRoleSuffix;

  const looksLikeTitleShape =
    !/[，,；;。！？!?]/.test(text) &&
    /[\u4e00-\u9fa5A-Za-z]/.test(text) &&
    !text.startsWith("岗位") &&
    !text.startsWith("职责") &&
    !text.startsWith("要求");

  return hasRoleHint && looksLikeTitleShape;
}

function removeTrailingCity(text: string) {
  const normalized = cleanLine(text).replace(/[/|｜·\s]+$/g, "");
  const matchedCity = CITY_HINTS.find((city) => normalized.endsWith(city));
  if (!matchedCity) {
    return normalized;
  }

  return normalized.slice(0, -matchedCity.length).trim();
}

function extractMixedMetaJobTitle(line: string) {
  const text = cleanLine(line);
  const salaryMatch = text.match(
    /\d{1,3}(?:\.\d)?\s*-\s*\d{1,3}(?:\.\d)?\s*K/i,
  );
  if (!salaryMatch || salaryMatch.index === undefined) {
    return "";
  }

  const candidate = removeTrailingCity(text.slice(0, salaryMatch.index));
  return looksLikeJobTitle(candidate) ? candidate : "";
}

function extractJobTitleFromLine(line: string) {
  const text = cleanLine(line);
  if (looksLikeJobTitle(text)) {
    return text;
  }

  return extractMixedMetaJobTitle(text);
}

function hasBodySignal(block: string) {
  const normalized = normalizeText(block);
  return (
    BODY_SECTION_HINTS.some((hint) => normalized.includes(hint)) ||
    BODY_SENTENCE_HINTS.some((hint) => normalized.includes(hint))
  );
}

function countBodySections(lines: string[]) {
  return lines.filter((line) => looksLikeBodySection(line)).length;
}

function scoreStart(lines: string[], index: number) {
  const current = lines[index];
  const prev = lines[index - 1] || "";
  const next = lines[index + 1] || "";
  const nextTwo = lines.slice(index + 1, index + 4);
  const nextEight = lines.slice(index + 1, index + 1 + FOLLOWUP_SCAN_LIMIT);
  let score = 0;
  const currentTitle = extractJobTitleFromLine(current);
  const currentCompanyStart = looksLikeCompanyStart(current);

  if (isPlatformNoiseLine(current)) {
    return -4;
  }

  if (currentCompanyStart) {
    score += 5;
  }

  if (currentTitle) {
    score += 3;
  }

  if (looksLikeCompanyStart(prev) && extractJobTitleFromLine(current)) {
    score -= 4;
  }

  if ((currentTitle || currentCompanyStart) && isLikelyMetaLine(next)) {
    score += 3;
  }

  if (
    nextTwo.some((line) => extractJobTitleFromLine(line)) &&
    nextTwo.some((line) => isLikelyMetaLine(line))
  ) {
    score += 2;
  }

  if (
    (currentTitle || currentCompanyStart) &&
    nextEight.some((line) => looksLikeBodySection(line))
  ) {
    score += 2;
  }

  if (looksLikeBodySentence(current)) {
    score -= 3;
  }

  if (looksLikeBodySection(current)) {
    score -= 2;
  }

  return score;
}

function splitSourceBlock(source: string) {
  const lines = source
    .split("\n")
    .map((line) => cleanLine(line))
    .filter(Boolean);

  if (lines.length === 0) {
    return [] as CandidateBlock[];
  }

  const startIndexes = new Set<number>();

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (isPlatformNoiseLine(line)) {
      continue;
    }

    if (index === 0) {
      startIndexes.add(index);
      continue;
    }

    const startScore = scoreStart(lines, index);
    if (startScore >= START_THRESHOLD) {
      const previousCompany = extractCompanyFromRecruiterLine(
        lines[index - 1] || "",
      );
      startIndexes.add(previousCompany ? index - 1 : index);
    }
  }

  const orderedStarts = [...startIndexes].sort((left, right) => left - right);
  const blocks: CandidateBlock[] = [];

  for (let i = 0; i < orderedStarts.length; i += 1) {
    const start = orderedStarts[i];
    const end = orderedStarts[i + 1] ?? lines.length;
    const slice = lines
      .slice(start, end)
      .map((line) => extractCompanyFromRecruiterLine(line) || line)
      .filter((line) => !isPlatformNoiseLine(line))
      .filter(Boolean);

    if (slice.length > 0) {
      blocks.push({
        lines: slice,
        startIndexes: [start],
      });
    }
  }

  if (blocks.length === 0) {
    return [
      {
        lines: lines
          .map((line) => extractCompanyFromRecruiterLine(line) || line)
          .filter((line) => !isPlatformNoiseLine(line)),
        startIndexes: [0],
      },
    ];
  }

  return blocks;
}

function splitBlocks(text: string) {
  const normalized = normalizeText(text);
  if (!normalized) {
    return [] as CandidateBlock[];
  }

  const explicitBlocks = normalized
    .split(explicitBlockSeparator)
    .map((block) => block.trim())
    .filter(Boolean);

  const sourceBlocks =
    explicitBlocks.length > 1 ? explicitBlocks : [normalized];
  const candidates = sourceBlocks.flatMap((source) => splitSourceBlock(source));
  const merged: CandidateBlock[] = [];

  for (const candidate of candidates) {
    const textBlock = candidate.lines.join("\n").trim();
    if (!textBlock) {
      continue;
    }

    if (
      merged.length > 0 &&
      !hasBodySignal(textBlock) &&
      !candidate.lines.some((line) => looksLikeCompanyStart(line))
    ) {
      const prev = merged[merged.length - 1];
      merged[merged.length - 1] = {
        lines: [...prev.lines, ...candidate.lines],
        startIndexes: [...prev.startIndexes, ...candidate.startIndexes],
      };
      continue;
    }

    merged.push(candidate);
  }

  return merged;
}

function extractCompanyName(lines: string[], block: string, index: number) {
  const labeled =
    findValue(block, ["公司", "公司名称", "企业名称", "Company"]) ||
    findValue(block, ["所在公司"]);

  if (labeled) {
    return labeled;
  }

  for (const line of lines) {
    const text = cleanLine(line);

    if (text.includes("正在招聘")) {
      return text.replace(/正在招聘.*$/u, "").trim();
    }
  }

  const fallback = lines.find(
    (line) =>
      !isPlatformNoiseLine(line) &&
      !isLikelyMetaLine(line) &&
      !looksLikeBodySection(line) &&
      !extractJobTitleFromLine(line),
  );
  return fallback || `公司${index + 1}`;
}

function extractJobTitle(lines: string[], block: string, index: number) {
  const labeled = findValue(block, ["岗位", "职位", "招聘岗位", "Job Title"]);
  const labeledTitle = extractJobTitleFromLine(labeled);
  if (labeledTitle) {
    return labeledTitle;
  }

  for (let i = 0; i < lines.length; i += 1) {
    const title = extractJobTitleFromLine(lines[i]);
    if (title) {
      return title;
    }
  }

  return `岗位${index + 1}`;
}

function isDateOnlyBlock(block: string) {
  const lines = normalizeText(block)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  return lines.length === 1 && isDateLine(lines[0]);
}

function isValidCandidateBlock(block: CandidateBlock) {
  const text = block.lines.join("\n").trim();
  if (!text || text.length < MIN_BLOCK_LENGTH || isDateOnlyBlock(text)) {
    return false;
  }

  const hasJobTitle = block.lines.some((line) => extractJobTitleFromLine(line));
  const hasBody = hasBodySignal(text);
  return hasJobTitle && hasBody;
}

function dedupeDrafts(drafts: ParsedJdDraft[]) {
  const seen = new Set<string>();
  return drafts.filter((draft) => {
    const key = `${draft.companyName.trim().toLowerCase()}|${draft.jobTitle.trim().toLowerCase()}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function countPotentialStartSignals(text: string) {
  const lines = normalizeText(text)
    .split("\n")
    .map((line) => cleanLine(line))
    .filter(Boolean);

  return lines.reduce((count, _line, index) => {
    return scoreStart(lines, index) >= START_THRESHOLD ? count + 1 : count;
  }, 0);
}

export function parseJdBatchText(text: string): ParsedJdDraft[] {
  return analyzeJdBatchText(text).drafts;
}

export function analyzeJdBatchText(text: string): ParsedJdBatchResult {
  const candidateBlocks = splitBlocks(text).filter(isValidCandidateBlock);
  const drafts = dedupeDrafts(
    candidateBlocks.map((candidate, index) => {
      const block = candidate.lines.join("\n").trim();
      const companyInfo =
        findValue(block, ["公司补充信息", "公司信息", "Company info"]) || "";

      return {
        id: `draft-${slug()}`,
        companyName: extractCompanyName(candidate.lines, block, index),
        jobTitle: extractJobTitle(candidate.lines, block, index),
        jobUrl: findUrl(block),
        jdText: block,
        companyInfo,
        salaryRange: extractSalaryRange(block),
      };
    }),
  );

  const detectedCount = drafts.length;
  const hasMoreThanLimit = detectedCount > MAX_BATCH_JOBS;
  const limitedDrafts = drafts.slice(0, MAX_BATCH_JOBS);
  const potentialStartSignals = countPotentialStartSignals(text);
  const multipleBodySections = countBodySections(
    normalizeText(text)
      .split("\n")
      .map((line) => cleanLine(line))
      .filter(Boolean),
  );
  const mayBeIncomplete =
    limitedDrafts.length === 1 &&
    (potentialStartSignals >= 2 || multipleBodySections >= 2);

  const warnings: string[] = [];
  if (hasMoreThanLimit) {
    warnings.push("单次最多处理 5 条岗位，已仅保留前 5 条。");
  }
  if (mayBeIncomplete) {
    warnings.push(
      "当前只识别出 1 条岗位，但文本里可能还存在多个 JD，建议检查拆分结果。",
    );
  }

  return {
    drafts: limitedDrafts,
    detectedCount,
    hasMoreThanLimit,
    mayBeIncomplete,
    warnings,
  };
}

export function createJdBatch(title = "岗位分析") {
  return {
    id: `batch-${slug()}`,
    title,
    jobIds: [],
    createdAt: now(),
  } satisfies JdBatch;
}

export function createJobsFromDrafts(
  batchId: string,
  drafts: ParsedJdDraft[],
): JobJd[] {
  const timestamp = now();

  return drafts.map((draft) => ({
    id: `job-${slug()}`,
    batchId,
    companyName: draft.companyName,
    jobTitle: draft.jobTitle,
    jobUrl: draft.jobUrl,
    jdText: draft.jdText,
    companyInfo: draft.companyInfo,
    structuredJd: draft.salaryRange
      ? {
          companyName: draft.companyName,
          jobTitle: draft.jobTitle,
          salaryRange: draft.salaryRange,
          responsibilities: [],
          skillRequirements: [],
          benefits: [],
          rawSummary: draft.jdText.slice(0, 600),
        }
      : undefined,
    createdAt: timestamp,
    updatedAt: timestamp,
  }));
}
