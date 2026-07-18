"use client";

import { createDemoJobLoopState, createEmptyJobLoopState } from "./seed-data";
import type {
  AiOutput,
  JdBatch,
  JobAnalysisResult,
  JobDetailAnalysis,
  JobJd,
  JobLoopState,
  ResumeVersion,
  SourceResume,
  TailoredResume,
} from "./types";

const STORAGE_KEY = "jobloop:p0-state";
const ANALYSIS_DRAFT_INPUT_KEY = "jobloop:analysis-draft-input";
const ANALYSIS_DRAFT_SLOTS = 5;

const isBrowser = () => typeof window !== "undefined";

const statusPriority = {
  ready: 5,
  failed: 4,
  scoring: 3,
  enriching: 2,
  extracting_jd: 1,
  draft: 0,
} as const;

function getAnalysisResultPriority(result: JobAnalysisResult) {
  return statusPriority[result.status || "draft"] ?? 0;
}

function dedupeAnalysisResults(results: JobAnalysisResult[]) {
  const byJobId = new Map<string, JobAnalysisResult>();

  for (const result of results) {
    const existing = byJobId.get(result.jobId);
    if (!existing) {
      byJobId.set(result.jobId, result);
      continue;
    }

    const existingTime = Date.parse(existing.createdAt || "") || 0;
    const nextTime = Date.parse(result.createdAt || "") || 0;
    const existingPriority = getAnalysisResultPriority(existing);
    const nextPriority = getAnalysisResultPriority(result);

    if (
      nextPriority > existingPriority ||
      (nextPriority === existingPriority && nextTime >= existingTime)
    ) {
      byJobId.set(result.jobId, result);
    }
  }

  return Array.from(byJobId.values()).sort((left, right) => {
    const leftTime = Date.parse(left.createdAt || "") || 0;
    const rightTime = Date.parse(right.createdAt || "") || 0;
    return rightTime - leftTime;
  });
}

function normalizeState(state: JobLoopState): JobLoopState {
  return {
    ...state,
    sourceResumes: state.sourceResumes.map((sourceResume) =>
      sourceResume.fileUrl?.startsWith("data:application/pdf")
        ? { ...sourceResume, fileUrl: undefined }
        : sourceResume,
    ),
    resumeVersions: state.resumeVersions.slice(0, 3),
    analysisResults: dedupeAnalysisResults(state.analysisResults),
  };
}

function getPersistedJobLoopState(): JobLoopState {
  if (!isBrowser()) {
    return createEmptyJobLoopState();
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return createEmptyJobLoopState();
  }

  try {
    return normalizeState({
      ...createEmptyJobLoopState(),
      ...JSON.parse(raw),
    } as JobLoopState);
  } catch {
    return createEmptyJobLoopState();
  }
}

export function hasPersistedJobLoopState() {
  const state = getPersistedJobLoopState();
  return (
    state.sourceResumes.length > 0 ||
    state.resumeVersions.length > 0 ||
    state.jdBatches.length > 0 ||
    state.jobs.length > 0 ||
    state.analysisResults.length > 0 ||
    state.detailAnalyses.length > 0 ||
    state.tailoredResumes.length > 0
  );
}

export function getJobLoopState(): JobLoopState {
  if (!hasPersistedJobLoopState()) {
    return createDemoJobLoopState();
  }

  return getPersistedJobLoopState();
}

export function saveJobLoopState(state: JobLoopState) {
  if (!isBrowser()) {
    return;
  }
  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(normalizeState(state)),
  );
}

export function getAnalysisDraftInput() {
  if (!isBrowser()) {
    return "";
  }

  return window.localStorage.getItem(ANALYSIS_DRAFT_INPUT_KEY) || "";
}

export function saveAnalysisDraftInput(value: string) {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.setItem(ANALYSIS_DRAFT_INPUT_KEY, value);
}

export function getAnalysisDraftInputs() {
  if (!isBrowser()) {
    return Array.from({ length: ANALYSIS_DRAFT_SLOTS }, () => "");
  }

  const raw = window.localStorage.getItem(ANALYSIS_DRAFT_INPUT_KEY) || "";

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return Array.from({ length: ANALYSIS_DRAFT_SLOTS }, (_, index) =>
        typeof parsed[index] === "string" ? parsed[index] : "",
      );
    }
  } catch {
    // fall through to legacy single-input format
  }

  return Array.from({ length: ANALYSIS_DRAFT_SLOTS }, (_, index) =>
    index === 0 ? raw : "",
  );
}

export function saveAnalysisDraftInputs(values: string[]) {
  if (!isBrowser()) {
    return;
  }

  const normalized = Array.from({ length: ANALYSIS_DRAFT_SLOTS }, (_, index) =>
    typeof values[index] === "string" ? values[index] : "",
  );

  window.localStorage.setItem(
    ANALYSIS_DRAFT_INPUT_KEY,
    JSON.stringify(normalized),
  );
}

export function upsertSourceResume(sourceResume: SourceResume) {
  const state = getPersistedJobLoopState();
  const rest = state.sourceResumes.filter(
    (item) => item.id !== sourceResume.id,
  );
  saveJobLoopState({ ...state, sourceResumes: [sourceResume, ...rest] });
}

export function saveResumeVersions(
  versions: ResumeVersion[],
  aiOutput?: AiOutput,
) {
  const state = getPersistedJobLoopState();
  const nextVersions = versions.slice(0, 3);
  const existingIds = new Set(nextVersions.map((version) => version.id));
  const resumeVersions = [
    ...nextVersions,
    ...state.resumeVersions.filter((version) => !existingIds.has(version.id)),
  ].slice(0, 3);
  const aiOutputs = aiOutput ? [aiOutput, ...state.aiOutputs] : state.aiOutputs;

  saveJobLoopState({ ...state, resumeVersions, aiOutputs });
}

export function updateResumeVersion(version: ResumeVersion) {
  const state = getPersistedJobLoopState();
  saveJobLoopState({
    ...state,
    resumeVersions: state.resumeVersions.map((item) =>
      item.id === version.id ? version : item,
    ),
  });
}

export function saveJdBatchWithJobs(batch: JdBatch, jobs: JobJd[]) {
  const state = getPersistedJobLoopState();
  const jobIds = new Set(jobs.map((job) => job.id));

  saveJobLoopState({
    ...state,
    jdBatches: [
      batch,
      ...state.jdBatches.filter((item) => item.id !== batch.id),
    ],
    jobs: [...jobs, ...state.jobs.filter((job) => !jobIds.has(job.id))],
  });
}

export function saveBatchAnalysis(
  results: JobAnalysisResult[],
  aiOutput?: AiOutput,
) {
  const state = getPersistedJobLoopState();
  const jobIds = new Set(results.map((result) => result.jobId));

  saveJobLoopState({
    ...state,
    analysisResults: dedupeAnalysisResults([
      ...results,
      ...state.analysisResults.filter((result) => !jobIds.has(result.jobId)),
    ]),
    aiOutputs: aiOutput ? [aiOutput, ...state.aiOutputs] : state.aiOutputs,
  });
}

export function saveDetailAnalysis(
  detail: JobDetailAnalysis,
  aiOutput?: AiOutput,
) {
  const state = getPersistedJobLoopState();

  saveJobLoopState({
    ...state,
    detailAnalyses: [
      detail,
      ...state.detailAnalyses.filter((item) => item.jobId !== detail.jobId),
    ],
    aiOutputs: aiOutput ? [aiOutput, ...state.aiOutputs] : state.aiOutputs,
  });
}

export function saveTailoredResume(
  tailoredResume: TailoredResume,
  aiOutput?: AiOutput,
) {
  const state = getPersistedJobLoopState();

  saveJobLoopState({
    ...state,
    tailoredResumes: [
      tailoredResume,
      ...state.tailoredResumes.filter(
        (item) =>
          !(
            item.jobId === tailoredResume.jobId &&
            item.sourceResumeVersionId === tailoredResume.sourceResumeVersionId
          ),
      ),
    ],
    aiOutputs: aiOutput ? [aiOutput, ...state.aiOutputs] : state.aiOutputs,
  });
}

export function updateJobCompanyInfo(jobId: string, companyInfo: string) {
  const state = getPersistedJobLoopState();

  saveJobLoopState({
    ...state,
    jobs: state.jobs.map((job) =>
      job.id === jobId
        ? { ...job, companyInfo, updatedAt: new Date().toISOString() }
        : job,
    ),
  });
}

export function updateJob(job: JobJd) {
  const state = getPersistedJobLoopState();
  const exists = state.jobs.some((item) => item.id === job.id);

  saveJobLoopState({
    ...state,
    jobs: exists
      ? state.jobs.map((item) => (item.id === job.id ? job : item))
      : [job, ...state.jobs],
  });
}

export function updateAnalysisResult(result: JobAnalysisResult) {
  const state = getPersistedJobLoopState();
  const exists = state.analysisResults.some((item) => item.id === result.id);

  saveJobLoopState({
    ...state,
    analysisResults: exists
      ? state.analysisResults.map((item) =>
          item.id === result.id ? result : item,
        )
      : [result, ...state.analysisResults],
  });
}

export function getJobById(jobId: string) {
  return getJobLoopState().jobs.find((job) => job.id === jobId);
}

export function getResumeVersionById(versionId: string) {
  return getJobLoopState().resumeVersions.find(
    (version) => version.id === versionId,
  );
}

export function deleteResumeVersion(versionId: string) {
  const state = getPersistedJobLoopState();
  saveJobLoopState({
    ...state,
    resumeVersions: state.resumeVersions.filter(
      (version) => version.id !== versionId,
    ),
  });
}

export function clearJobLoopState() {
  if (!isBrowser()) {
    return;
  }
  window.localStorage.removeItem(STORAGE_KEY);
  window.localStorage.removeItem(ANALYSIS_DRAFT_INPUT_KEY);
}
