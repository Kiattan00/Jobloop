import type { JdBatch, JobJd } from "./types";

const now = () => new Date().toISOString();

const slug = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export type ParsedJdDraft = {
  id: string;
  companyName: string;
  jobTitle: string;
  jobUrl?: string;
  jdText: string;
  companyInfo?: string;
};

const ROLE_HINTS = [
  "产品",
  "产品经理",
  "产品助理",
  "技术支持",
  "售前",
  "交付",
  "实施",
  "运营",
  "增长",
  "数据",
  "工程师",
  "开发",
  "测试",
  "顾问",
  "专员",
  "主管",
  "总监",
  "项目经理",
  "解决方案",
  "客户成功",
  "AI",
  "Agent",
  "RAG",
];

const RECRUITER_HINTS = [
  "招聘经理",
  "人事经理",
  "HR",
  "招聘",
  "猎头",
  "顾问",
  "刚刚活跃",
  "刚刚在线",
  "今日活跃",
  "昨天活跃",
];

const NOISE_HINTS = [
  "继续沟通",
  "微信扫码分享",
  "分享",
  "举报",
  "感兴趣",
  "取消感兴趣",
  "加分项",
  "职位详情",
  "职位描述",
  "岗位职责",
  "岗位要求",
  "任职要求",
  "福利待遇",
];

const JD_BODY_HINTS = [
  "岗位职责",
  "岗位要求",
  "任职要求",
  "职位描述",
  "职位详情",
  "职责",
  "要求",
  "工作内容",
  "工作职责",
];

const explicitBlockSeparator = /\n\s*(?:---+|___+|###)\s*\n|\n{3,}/;

const normalizeText = (text: string) =>
  text
    .replace(/\r\n/g, "\n")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .trim();

const cleanLine = (line: string) => line.trim().replace(/\s+/g, " ");

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
      line.toLowerCase().startsWith(label.toLowerCase()),
    );

    if (matched) {
      return matched.replace(new RegExp(`^${label}\\s*[:：-]?\\s*`, "i"), "");
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

function isMetaLine(line: string) {
  const text = cleanLine(line);
  if (!text) {
    return true;
  }

  return (
    /^(深圳|广州|北京|上海|杭州|成都|武汉|苏州|东莞|珠海)/.test(text) ||
    /\d{1,2}-\d{1,2}K/i.test(text) ||
    /(本科|大专|硕士|博士|经验|应届|五险一金|双休|年终奖)/.test(text)
  );
}

function isNoiseLine(line: string) {
  const text = cleanLine(line);
  if (!text) {
    return true;
  }

  if (isDateLine(text)) {
    return true;
  }

  return NOISE_HINTS.some((hint) => text.includes(hint));
}

function looksLikeRecruiterCompanyLine(line: string) {
  const text = cleanLine(line);
  if (!text.includes("·")) {
    return false;
  }

  const [, tail = ""] = text.split("·", 2);
  return RECRUITER_HINTS.some((hint) => tail.includes(hint));
}

function looksLikeCompanyStart(line: string) {
  const text = cleanLine(line);
  if (!text) {
    return false;
  }

  return text.includes("正在招聘") || looksLikeRecruiterCompanyLine(text);
}

function looksLikeJobTitle(line: string) {
  const text = cleanLine(line);
  if (!text || isNoiseLine(text) || isMetaLine(text)) {
    return false;
  }

  if (text.length > 40) {
    return false;
  }

  if (
    JD_BODY_HINTS.some((hint) => text.includes(hint)) ||
    RECRUITER_HINTS.some((hint) => text.includes(hint))
  ) {
    return false;
  }

  return ROLE_HINTS.some((hint) => text.includes(hint));
}

function hasJdSignal(block: string) {
  const normalized = normalizeText(block);
  return JD_BODY_HINTS.some((hint) => normalized.includes(hint));
}

function splitBlocks(text: string) {
  const normalized = normalizeText(text);
  if (!normalized) {
    return [];
  }

  const explicitBlocks = normalized
    .split(explicitBlockSeparator)
    .map((block) => block.trim())
    .filter(Boolean);

  const sourceBlocks =
    explicitBlocks.length > 1 ? explicitBlocks : [normalized];
  const result: string[] = [];

  for (const source of sourceBlocks) {
    const lines = source
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    let current: string[] = [];

    for (const line of lines) {
      if (current.length > 0 && looksLikeCompanyStart(line)) {
        result.push(current.join("\n").trim());
        current = [line];
        continue;
      }

      current.push(line);
    }

    if (current.length > 0) {
      result.push(current.join("\n").trim());
    }
  }

  const merged: string[] = [];
  for (const block of result) {
    if (!block) {
      continue;
    }

    if (!hasJdSignal(block) && merged.length > 0) {
      merged[merged.length - 1] =
        `${merged[merged.length - 1]}\n${block}`.trim();
      continue;
    }

    merged.push(block);
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

    if (looksLikeRecruiterCompanyLine(text)) {
      return text.split("·", 2)[0].trim();
    }
  }

  const fallback = lines.find(
    (line) => !isNoiseLine(line) && !isMetaLine(line),
  );
  return fallback || `公司${index + 1}`;
}

function extractJobTitle(lines: string[], block: string, index: number) {
  const labeled = findValue(block, ["岗位", "职位", "招聘岗位", "Job Title"]);
  if (labeled) {
    return labeled;
  }

  const startIndex = lines.findIndex((line) => looksLikeCompanyStart(line));

  for (let i = startIndex >= 0 ? startIndex + 1 : 0; i < lines.length; i += 1) {
    const line = cleanLine(lines[i]);
    if (looksLikeJobTitle(line)) {
      return line;
    }
  }

  const fallback = lines.find((line) => looksLikeJobTitle(line));
  return fallback || `岗位${index + 1}`;
}

export function parseJdBatchText(text: string): ParsedJdDraft[] {
  return splitBlocks(text).map((block, index) => {
    const lines = normalizeText(block)
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    const companyInfo =
      findValue(block, ["公司补充信息", "公司信息", "Company info"]) || "";

    return {
      id: `draft-${slug()}`,
      companyName: extractCompanyName(lines, block, index),
      jobTitle: extractJobTitle(lines, block, index),
      jobUrl: findUrl(block),
      jdText: block,
      companyInfo,
    };
  });
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
    createdAt: timestamp,
    updatedAt: timestamp,
  }));
}
