"use client";

import { createEmptyJobLoopState } from "./seed-data";
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

const isBrowser = () => typeof window !== "undefined";

export function getJobLoopState(): JobLoopState {
  if (!isBrowser()) {
    return createEmptyJobLoopState();
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return createEmptyJobLoopState();
  }

  try {
    const parsed = {
      ...createEmptyJobLoopState(),
      ...JSON.parse(raw),
    } as JobLoopState;
    return {
      ...parsed,
      resumeVersions: parsed.resumeVersions.slice(0, 3),
    };
  } catch {
    return createEmptyJobLoopState();
  }
}

export function saveJobLoopState(state: JobLoopState) {
  if (!isBrowser()) {
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function upsertSourceResume(sourceResume: SourceResume) {
  const state = getJobLoopState();
  const rest = state.sourceResumes.filter(
    (item) => item.id !== sourceResume.id,
  );
  saveJobLoopState({ ...state, sourceResumes: [sourceResume, ...rest] });
}

export function saveResumeVersions(
  versions: ResumeVersion[],
  aiOutput?: AiOutput,
) {
  const state = getJobLoopState();
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
  const state = getJobLoopState();
  saveJobLoopState({
    ...state,
    resumeVersions: state.resumeVersions.map((item) =>
      item.id === version.id ? version : item,
    ),
  });
}

export function saveJdBatchWithJobs(batch: JdBatch, jobs: JobJd[]) {
  const state = getJobLoopState();
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
  const state = getJobLoopState();
  const resultIds = new Set(results.map((result) => result.id));

  saveJobLoopState({
    ...state,
    analysisResults: [
      ...results,
      ...state.analysisResults.filter((result) => !resultIds.has(result.id)),
    ],
    aiOutputs: aiOutput ? [aiOutput, ...state.aiOutputs] : state.aiOutputs,
  });
}

export function saveDetailAnalysis(
  detail: JobDetailAnalysis,
  aiOutput?: AiOutput,
) {
  const state = getJobLoopState();

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
  const state = getJobLoopState();

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
  const state = getJobLoopState();

  saveJobLoopState({
    ...state,
    jobs: state.jobs.map((job) =>
      job.id === jobId
        ? { ...job, companyInfo, updatedAt: new Date().toISOString() }
        : job,
    ),
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
  const state = getJobLoopState();
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
}
