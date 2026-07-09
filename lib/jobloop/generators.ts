import type {
  AiOutput,
  JobAnalysisResult,
  JobDetailAnalysis,
  JobJd,
  ResumeVersion,
  SourceResume,
  TailoredResume,
} from "./types";

export const createTimestamp = () => new Date().toISOString();

export const createEntityId = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const normalizeResumeContent = (content: string) =>
  content
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n");

export function createSourceResume(
  content: string,
  targetIntent?: string,
): SourceResume {
  const timestamp = createTimestamp();
  return {
    id: createEntityId("source"),
    title: "原始简历",
    content: normalizeResumeContent(content),
    targetIntent: targetIntent?.trim() || undefined,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function createImportedResumeAsset({
  title,
  content,
  sourceType,
  fileName,
  fileUrl,
  sourceRecordId,
  pdfStoragePath,
  pdfPageCount,
  extractionStatus,
}: {
  title: string;
  content: string;
  sourceType: SourceResume["sourceType"];
  fileName?: string;
  fileUrl?: string;
  sourceRecordId?: string;
  pdfStoragePath?: string;
  pdfPageCount?: number;
  extractionStatus?: SourceResume["extractionStatus"];
}) {
  const sourceResume = createSourceResume(content);
  const timestamp = createTimestamp();
  const normalizedTitle = title.trim() || "基础简历";

  sourceResume.title = normalizedTitle;
  sourceResume.sourceType = sourceType;
  sourceResume.fileName = fileName;
  sourceResume.fileUrl = fileUrl;
  sourceResume.sourceRecordId = sourceRecordId;
  sourceResume.pdfStoragePath = pdfStoragePath;
  sourceResume.pdfPageCount = pdfPageCount;
  sourceResume.extractionStatus = extractionStatus;
  sourceResume.extractionMethod = sourceType === "pdf" ? "pdf-text" : undefined;
  sourceResume.updatedAt = timestamp;

  const resumeVersion: ResumeVersion = {
    id: createEntityId("resume"),
    sourceResumeId: sourceResume.id,
    name: normalizedTitle,
    targetDirection: "通用基础版",
    rewriteFocus:
      sourceType === "pdf"
        ? "由 PDF 文本提取生成，可继续校对并作为 AI 分析输入。"
        : "由粘贴文本创建，可继续编辑并作为 AI 分析输入。",
    content: normalizeResumeContent(content),
    status: "saved",
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  return { sourceResume, resumeVersion };
}

export function createManualResumeVersion({
  name,
  targetDirection,
  rewriteFocus,
  content,
}: {
  name: string;
  targetDirection: string;
  rewriteFocus: string;
  content: string;
}): { sourceResume: SourceResume; resumeVersion: ResumeVersion } {
  const sourceResume = createSourceResume(content, targetDirection);
  const timestamp = createTimestamp();

  return {
    sourceResume,
    resumeVersion: {
      id: createEntityId("resume"),
      sourceResumeId: sourceResume.id,
      name: name.trim(),
      targetDirection: targetDirection.trim(),
      rewriteFocus: rewriteFocus.trim(),
      content: normalizeResumeContent(content),
      status: "saved",
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  };
}

export function createResumeVersionsAiOutput(
  sourceResume: SourceResume,
  versions: ResumeVersion[],
  model?: string,
): AiOutput {
  return {
    id: createEntityId("ai-resume"),
    type: "resume_versions",
    provider: "openrouter",
    model,
    sourceResumeId: sourceResume.id,
    resumeVersionIds: versions.map((version) => version.id),
    jobIds: [],
    inputSummary: `基于 ${sourceResume.title} 生成 ${versions.length} 个基础简历版本`,
    outputRefId: versions[0]?.id ?? sourceResume.id,
    createdAt: createTimestamp(),
  };
}

export function createBatchAnalysisAiOutput(
  batchId: string,
  jobs: JobJd[],
  results: JobAnalysisResult[],
  model?: string,
): AiOutput {
  return {
    id: createEntityId("ai-batch"),
    type: "batch_analysis",
    provider: "openrouter",
    model,
    resumeVersionIds: results.map(
      (result) => result.recommendedResumeVersionId,
    ),
    jobIds: jobs.map((job) => job.id),
    inputSummary: `批量分析 ${jobs.length} 个 JD，批次 ${batchId}，已包含结构化 JD 与公司补充信息`,
    outputRefId: results[0]?.id ?? batchId,
    createdAt: createTimestamp(),
  };
}

export function createJobDetailAiOutput(
  detail: JobDetailAnalysis,
  job: JobJd,
  version?: ResumeVersion,
  model?: string,
): AiOutput {
  return {
    id: createEntityId("ai-detail"),
    type: "job_detail_analysis",
    provider: "openrouter",
    model,
    resumeVersionIds: version ? [version.id] : [],
    jobIds: [job.id],
    inputSummary: `为 ${job.companyName} / ${job.jobTitle} 生成单岗位求职报告、打招呼话术和面试准备`,
    outputRefId: detail.id,
    createdAt: createTimestamp(),
  };
}

export function createTailoredResumeAiOutput(
  tailoredResume: TailoredResume,
  model?: string,
): AiOutput {
  return {
    id: createEntityId("ai-tailored"),
    type: "tailored_resume",
    provider: "openrouter",
    model,
    resumeVersionIds: [tailoredResume.sourceResumeVersionId],
    jobIds: [tailoredResume.jobId],
    inputSummary: `生成 ${tailoredResume.title}`,
    outputRefId: tailoredResume.id,
    createdAt: createTimestamp(),
  };
}
