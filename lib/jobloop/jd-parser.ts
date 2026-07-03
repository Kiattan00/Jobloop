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

const normalizeText = (text: string) =>
  text
    .replace(/\r\n/g, "\n")
    .replace(/\u00a0/g, " ")
    .trim();

const cleanLine = (line: string) => line.trim().replace(/\s+/g, " ");

const findValue = (text: string, labels: string[]) => {
  const lines = normalizeText(text)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  for (const label of labels) {
    const matched = lines.find((line) =>
      line.toLowerCase().startsWith(label.toLowerCase()),
    );

    if (matched) {
      return matched.replace(new RegExp(`^${label}\\s*[:：\\-\\s]*`, "i"), "");
    }
  }

  return "";
};

const findUrl = (text: string) =>
  normalizeText(text)
    .match(/https?:\/\/[^\s)]+/i)?.[0]
    .trim();

const explicitBlockSeparator = /\n\s*(?:---+|###)\s*\n|\n{3,}/;

const recruiterHints = [
  "招聘经理",
  "人事经理",
  "HR",
  "招聘",
  "猎头",
  "招聘顾问",
  "人才顾问",
];

const jobTitleHints = [
  "产品",
  "经理",
  "助理",
  "工程师",
  "技术支持",
  "售前",
  "交付",
  "实施",
  "运营",
  "专员",
  "顾问",
  "开发",
  "测试",
  "分析",
  "设计",
  "架构",
  "客户成功",
  "商务",
  "销售",
  "研究员",
];

const noiseHints = [
  "职位详情",
  "职位描述",
  "岗位职责",
  "任职要求",
  "继续沟通",
  "微信扫码",
  "分享",
  "举报",
  "感兴趣",
  "取消感兴趣",
  "加分项",
  "福利",
  "标签",
];

function looksLikeBlockStart(line: string) {
  const text = cleanLine(line).replace(/\s+/g, "");
  if (!text) {
    return false;
  }

  if (/正在招聘|招聘中|诚聘|招募/.test(text)) {
    return true;
  }

  const parts = text.split("·");
  if (parts.length >= 2) {
    const tail = parts.slice(1).join("·");
    if (recruiterHints.some((hint) => tail.includes(hint))) {
      return true;
    }
  }

  if (parts.length >= 2) {
    const last = parts[parts.length - 1];
    if (recruiterHints.some((hint) => last.includes(hint))) {
      return true;
    }
  }

  return false;
}

function looksLikeJobTitle(line: string) {
  const text = cleanLine(line).replace(/\s+/g, "");
  if (!text || noiseHints.some((hint) => text.includes(hint))) {
    return false;
  }

  if (/^\d{1,2}\w{2}\.\d{4}$/.test(text)) {
    return false;
  }

  if (/^\d+\/\d+K/i.test(text)) {
    return false;
  }

  if (jobTitleHints.some((hint) => text.includes(hint))) {
    return true;
  }

  return /[A-Za-z\u4e00-\u9fa5]{2,20}(?:\/[A-Za-z\u4e00-\u9fa5]{1,12})?/.test(
    text,
  );
}

function isNoiseLine(line: string) {
  const text = cleanLine(line).replace(/\s+/g, "");
  if (!text) {
    return true;
  }

  if (/^\d{1,2}\w{2}\.\d{4}$/.test(text)) {
    return true;
  }

  return noiseHints.some((hint) => text.includes(hint));
}

function splitBlocks(text: string) {
  const normalized = normalizeText(text);
  const explicitBlocks = normalized
    .split(explicitBlockSeparator)
    .map((block) => block.trim())
    .filter(Boolean);

  if (explicitBlocks.length > 1) {
    return explicitBlocks;
  }

  const lines = normalized
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const blocks: string[] = [];
  let current: string[] = [];

  for (const line of lines) {
    if (current.length > 0 && looksLikeBlockStart(line)) {
      blocks.push(current.join("\n").trim());
      current = [line];
      continue;
    }

    current.push(line);
  }

  if (current.length > 0) {
    blocks.push(current.join("\n").trim());
  }

  return blocks.filter(Boolean);
}

function findCompanyNameFromLines(lines: string[]) {
  for (const line of lines) {
    const text = cleanLine(line).replace(/\s+/g, "");
    if (!text) {
      continue;
    }

    const fromLabel = findValue(line, ["公司", "Company"]);
    if (fromLabel) {
      return fromLabel;
    }

    if (text.includes("正在招聘")) {
      return text.replace(/正在招聘.*$/u, "");
    }

    const parts = text.split("·");
    if (parts.length >= 2) {
      const tail = parts.slice(1).join("·");
      if (recruiterHints.some((hint) => tail.includes(hint))) {
        return parts[0];
      }
    }
  }

  return "";
}

function findJobTitleFromLines(lines: string[], startIndex: number) {
  for (let i = startIndex + 1; i < lines.length; i += 1) {
    const line = cleanLine(lines[i]);
    if (!line || isNoiseLine(line)) {
      continue;
    }

    const fromLabel = findValue(line, ["岗位", "职位", "Job", "Title"]);
    if (fromLabel) {
      return fromLabel;
    }

    if (looksLikeJobTitle(line)) {
      return line;
    }
  }

  return "";
}

export function parseJdBatchText(text: string): ParsedJdDraft[] {
  return splitBlocks(text).map((block, index) => {
    const lines = normalizeText(block)
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    const companyInfo =
      findValue(block, ["公司补充信息", "公司信息", "Company info"]) || "";

    const companyName =
      findCompanyNameFromLines(lines) ||
      findValue(block, ["公司", "Company"]) ||
      lines.find((line) => !isNoiseLine(line))?.replace(/\s+/g, "") ||
      `公司${index + 1}`;

    const companyHeaderIndex = lines.findIndex((line) => {
      const text = cleanLine(line).replace(/\s+/g, "");
      return (
        text.includes("正在招聘") ||
        (text.includes("·") &&
          recruiterHints.some((hint) => text.includes(hint)))
      );
    });

    const jobTitle =
      findValue(block, ["岗位", "职位", "Job", "Title"]) ||
      (companyHeaderIndex >= 0
        ? findJobTitleFromLines(lines, companyHeaderIndex)
        : "") ||
      lines.find((line) => looksLikeJobTitle(line)) ||
      lines[1] ||
      lines[0] ||
      `岗位${index + 1}`;

    return {
      id: `draft-${slug()}`,
      companyName,
      jobTitle,
      jobUrl: findUrl(block),
      jdText: block,
      companyInfo,
    };
  });
}

export function createJdBatch(title = "批量岗位分析"): JdBatch {
  return {
    id: `batch-${slug()}`,
    title,
    jobIds: [],
    createdAt: now(),
  };
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
