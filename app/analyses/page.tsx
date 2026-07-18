"use client";

import { History, Sparkles } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CurrentAnalysisList } from "@/components/jobloop/current-analysis-list";
import { JdBatchInput } from "@/components/jobloop/jd-batch-input";
import { JobLoopShell } from "@/components/jobloop/jobloop-shell";
import { EmptyState, PageHeader } from "@/components/jobloop/page-chrome";
import { readApiJson } from "@/lib/jobloop/api-client";
import { createEntityId } from "@/lib/jobloop/generators";
import {
  analyzeJdBatchText,
  createJdBatch,
  createJobsFromDrafts,
  type ParsedJdDraft,
} from "@/lib/jobloop/jd-parser";
import { sampleJdBatchInput } from "@/lib/jobloop/seed-data";
import {
  getAnalysisDraftInputs,
  getJobLoopState,
  hasPersistedJobLoopState,
  saveAnalysisDraftInputs,
  saveBatchAnalysis,
  saveDetailAnalysis,
  saveJdBatchWithJobs,
  updateAnalysisResult,
  updateJob,
} from "@/lib/jobloop/storage";
import { fetchWithSupabaseAuth } from "@/lib/jobloop/supabase-browser";
import type {
  AiOutput,
  JobAnalysisResult,
  JobDetailAnalysis,
  JobJd,
  JobLoopState,
} from "@/lib/jobloop/types";

const MAX_JD_INPUTS = 5;

function createEmptyInputs() {
  return Array.from({ length: MAX_JD_INPUTS }, () => "");
}

function parseHttpUrl(value: string) {
  try {
    const url = new URL(value.trim());
    if (!["http:", "https:"].includes(url.protocol)) {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
}

function isUrlOnlyInput(value: string) {
  const trimmed = value.trim();
  return (
    Boolean(trimmed) && /^\S+$/u.test(trimmed) && Boolean(parseHttpUrl(trimmed))
  );
}

function formatRecognizedJd({
  companyName,
  jobTitle,
  jdText,
  sourceUrl,
}: {
  companyName?: string;
  jobTitle?: string;
  jdText: string;
  sourceUrl?: string;
}) {
  return [
    companyName ? `公司：${companyName}` : "",
    jobTitle ? `岗位：${jobTitle}` : "",
    sourceUrl ? `链接：${sourceUrl}` : "",
    jdText,
  ]
    .filter(Boolean)
    .join("\n");
}

function createPendingResult(jobId: string): JobAnalysisResult {
  return {
    id: createEntityId("analysis"),
    jobId,
    recommendedResumeVersionId: "",
    matchScore: 0,
    scoreBreakdown: {
      industryMatch: 0,
      companyStrength: 0,
      roleMatch: 0,
      salaryCompetitiveness: 0,
      growthPotential: 0,
    },
    applyDecision: "cautious",
    needsTailoring: false,
    mainRisk: "",
    summary: "系统已识别岗位标题，正在补充公司信息与结构化 JD。",
    status: "extracting_jd",
    createdAt: new Date().toISOString(),
  };
}

function parseSingleJobDrafts(inputs: string[]) {
  const drafts: ParsedJdDraft[] = [];
  const warnings: string[] = [];

  inputs.forEach((value, index) => {
    const trimmed = value.trim();
    if (!trimmed) {
      return;
    }

    const result = analyzeJdBatchText(trimmed);
    if (result.drafts.length === 0) {
      warnings.push(`岗位 ${index + 1} 未识别出有效 JD，请检查内容。`);
      return;
    }

    if (result.detectedCount > 1 || result.hasMoreThanLimit) {
      warnings.push(
        `岗位 ${index + 1} 中识别到多个 JD，请确保每个输入框只填写 1 条岗位。`,
      );
      return;
    }

    drafts.push(result.drafts[0]);
  });

  return { drafts, warnings };
}

export default function AnalysesPage() {
  const [state, setState] = useState<JobLoopState | null>(null);
  const [inputs, setInputs] = useState<string[]>(createEmptyInputs);
  const [currentBatchId, setCurrentBatchId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [recognizingSlotIndex, setRecognizingSlotIndex] = useState<
    number | null
  >(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const current = getJobLoopState();
    const persistedDraftInputs = getAnalysisDraftInputs();
    setState(current);
    setCurrentBatchId(current.jdBatches[0]?.id ?? null);
    setInputs(
      hasPersistedJobLoopState()
        ? persistedDraftInputs
        : [sampleJdBatchInput, "", "", "", ""],
    );
  }, []);

  useEffect(() => {
    saveAnalysisDraftInputs(inputs);
  }, [inputs]);

  const hasResumeVersions = (state?.resumeVersions.length ?? 0) > 0;
  const filledCount = inputs.filter((value) => value.trim().length > 0).length;
  const canAnalyze =
    filledCount > 0 && !loading && recognizingSlotIndex === null;

  const currentResults = useMemo(() => {
    if (!state || !currentBatchId) {
      return [] as JobAnalysisResult[];
    }

    const batch = state.jdBatches.find((item) => item.id === currentBatchId);
    const jobIds = new Set(batch?.jobIds ?? []);
    return state.analysisResults.filter((result) => jobIds.has(result.jobId));
  }, [currentBatchId, state]);

  const refreshState = () => {
    setState(getJobLoopState());
  };

  const handleInputChange = (index: number, value: string) => {
    setInputs((current) =>
      current.map((item, currentIndex) =>
        currentIndex === index ? value : item,
      ),
    );
    setError(null);
  };

  const handleImageUpload = async (index: number, file: File) => {
    setRecognizingSlotIndex(index);
    setError(null);

    try {
      const formData = new FormData();
      formData.set("files", file);

      const response = await fetchWithSupabaseAuth("/api/ai/jd-image", {
        method: "POST",
        body: formData,
      });
      const data = await readApiJson<{
        items?: Array<{
          jdText: string;
          fileName: string;
        }>;
        error?: string;
      }>(response);

      const item = data.items?.[0];
      if (!response.ok || !item?.jdText) {
        throw new Error(data.error || "岗位截图识别失败，请稍后重试。");
      }

      setInputs((current) =>
        current.map((value, currentIndex) =>
          currentIndex === index ? item.jdText : value,
        ),
      );
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "岗位截图识别失败，请稍后重试。",
      );
    } finally {
      setRecognizingSlotIndex(null);
    }
  };

  const resolveUrlInputs = async (currentInputs: string[]) => {
    const nextInputs = [...currentInputs];

    for (let index = 0; index < nextInputs.length; index += 1) {
      const value = nextInputs[index];
      if (!isUrlOnlyInput(value)) {
        continue;
      }

      const url = parseHttpUrl(value);
      if (!url) {
        continue;
      }

      setRecognizingSlotIndex(index);
      const response = await fetchWithSupabaseAuth("/api/ai/jd-url", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url }),
      });
      const data = await readApiJson<{
        companyName?: string;
        jobTitle?: string;
        jdText?: string;
        sourceUrl?: string;
        error?: string;
      }>(response);

      if (!response.ok || !data.jdText) {
        throw new Error(data.error || `岗位 ${index + 1} 的链接识别失败。`);
      }

      nextInputs[index] = formatRecognizedJd({
        companyName: data.companyName,
        jobTitle: data.jobTitle,
        jdText: data.jdText,
        sourceUrl: data.sourceUrl || url,
      });
    }

    return nextInputs;
  };

  const handleAnalyze = async () => {
    if (!state) {
      return;
    }

    setError(null);

    let preparedInputs = inputs;

    try {
      preparedInputs = await resolveUrlInputs(inputs);
      setInputs(preparedInputs);
    } catch (resolveError) {
      setError(
        resolveError instanceof Error
          ? resolveError.message
          : "岗位链接识别失败，请稍后重试。",
      );
      setRecognizingSlotIndex(null);
      return;
    } finally {
      setRecognizingSlotIndex(null);
    }

    const { drafts, warnings } = parseSingleJobDrafts(preparedInputs);

    if (warnings.length > 0) {
      setError(warnings[0]);
      return;
    }

    if (drafts.length === 0) {
      setError("请至少填写 1 条可识别的岗位 JD。");
      return;
    }

    const batch = createJdBatch(`岗位分析 ${state.jdBatches.length + 1}`);
    const jobs = createJobsFromDrafts(batch.id, drafts).map((job) => ({
      ...job,
      processingStatus: "enriching" as const,
    }));
    const completeBatch = { ...batch, jobIds: jobs.map((job) => job.id) };
    const placeholderResults = jobs.map((job) => createPendingResult(job.id));

    saveJdBatchWithJobs(completeBatch, jobs);
    saveBatchAnalysis(placeholderResults);
    refreshState();
    setCurrentBatchId(completeBatch.id);
    setLoading(true);
    setError(null);

    let failedCount = 0;

    for (let index = 0; index < jobs.length; index += 1) {
      const job = jobs[index];
      try {
        updateJob({
          ...job,
          processingStatus: "extracting_jd",
          processingError: undefined,
          updatedAt: new Date().toISOString(),
        });
        updateAnalysisResult({
          ...placeholderResults[index],
          summary: "正在提取结构化 JD 并补充公司信息...",
          status: "extracting_jd",
        });
        refreshState();

        const enrichController = new AbortController();
        const enrichTimer = setTimeout(() => enrichController.abort(), 150_000);
        const enrichResponse = await fetchWithSupabaseAuth(
          "/api/ai/job-enrich",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ job }),
            signal: enrichController.signal,
          },
        );
        clearTimeout(enrichTimer);

        const enrichData = await readApiJson<{
          job?: JobJd;
          error?: string;
        }>(enrichResponse);

        if (!enrichResponse.ok || !enrichData.job) {
          throw new Error(enrichData.error || "岗位信息补充失败，请稍后重试。");
        }

        updateJob({
          ...enrichData.job,
          processingStatus: "scoring",
          processingError: undefined,
        });
        updateAnalysisResult({
          ...placeholderResults[index],
          summary: "岗位信息补充完成，正在计算匹配分与投递建议。",
          status: "scoring",
        });
        refreshState();

        const scoreController = new AbortController();
        const scoreTimer = setTimeout(() => scoreController.abort(), 150_000);
        const scoreResponse = await fetchWithSupabaseAuth("/api/ai/job-score", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            batchId: completeBatch.id,
            job: enrichData.job,
            resumeVersions: state.resumeVersions,
          }),
          signal: scoreController.signal,
        });
        clearTimeout(scoreTimer);

        const scoreData = await readApiJson<{
          result?: JobAnalysisResult;
          aiOutput?: AiOutput;
          error?: string;
        }>(scoreResponse);

        if (!scoreResponse.ok || !scoreData.result) {
          throw new Error(scoreData.error || "岗位评分失败，请稍后重试。");
        }

        saveBatchAnalysis(
          [{ ...scoreData.result, status: "ready" as const }],
          scoreData.aiOutput,
        );
        updateJob({
          ...enrichData.job,
          processingStatus: "ready",
          processingError: undefined,
          updatedAt: new Date().toISOString(),
        });
        refreshState();

        const recommendedVersion = state.resumeVersions.find(
          (v) => v.id === scoreData.result?.recommendedResumeVersionId,
        );
        try {
          const detailController = new AbortController();
          const detailTimer = setTimeout(
            () => detailController.abort(),
            185_000,
          );
          const detailResponse = await fetchWithSupabaseAuth(
            "/api/ai/job-detail",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                job: enrichData.job,
                result: scoreData.result,
                resumeVersion: recommendedVersion,
              }),
              signal: detailController.signal,
            },
          );
          clearTimeout(detailTimer);

          const detailData = await readApiJson<{
            detail?: JobDetailAnalysis;
            aiOutput?: AiOutput;
            error?: string;
          }>(detailResponse);

          if (detailResponse.ok && detailData.detail) {
            saveDetailAnalysis(detailData.detail, detailData.aiOutput);
            refreshState();
          }
        } catch (detailError) {
          console.warn("job-detail generation failed", {
            jobId: enrichData.job.id,
            error:
              detailError instanceof Error ? detailError.message : detailError,
          });
        }
      } catch (requestError) {
        const isTimeout =
          requestError instanceof Error &&
          (requestError.name === "AbortError" ||
            requestError.message.includes("aborted"));
        const message = isTimeout
          ? "岗位分析超时，请稍后重试该批次。"
          : requestError instanceof Error
            ? requestError.message
            : "岗位分析失败，请稍后重试。";

        updateJob({
          ...job,
          processingStatus: "failed",
          processingError: message,
          updatedAt: new Date().toISOString(),
        });
        updateAnalysisResult({
          ...placeholderResults[index],
          summary: "当前岗位分析失败，可稍后重新分析该批次。",
          mainRisk: message,
          status: "failed",
          errorMessage: message,
        });
        refreshState();
      }
    }

    const nextState = getJobLoopState();
    setState(nextState);
    setLoading(false);

    failedCount = nextState.analysisResults.filter(
      (result) =>
        completeBatch.jobIds.includes(result.jobId) &&
        result.status === "failed",
    ).length;

    if (failedCount > 0) {
      setError(`本批次有 ${failedCount} 个岗位处理失败，其余岗位已继续完成。`);
    }
  };

  return (
    <JobLoopShell active="/analyses">
      <div className="grid min-h-[720px] gap-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <PageHeader
            eyebrow="岗位分析工作台"
            title="岗位分析"
            subtitle="使用最多 5 个输入框逐条填写岗位 JD。少于 5 条也可直接分析，系统会自动忽略空白输入框。"
          />
          <Link
            className="inline-flex h-10 items-center gap-2 self-end rounded-md border border-white/24 bg-white/12 px-4 text-sm font-semibold text-white/82 hover:bg-white/18"
            href="/analyses/history"
          >
            <History className="size-4" aria-hidden="true" />
            历史分析
          </Link>
        </div>

        {!hasResumeVersions ? (
          <EmptyState
            actionHref="/resumes"
            actionLabel="先去简历库"
            description="岗位分析需要读取当前简历库中的基础简历版本，请先在简历管理中录入或上传简历。"
            title="还没有可用于匹配的基础简历"
          />
        ) : (
          <>
            <div className="grid gap-5 lg:grid-cols-[1.06fr_0.94fr]">
              <JdBatchInput
                busySlotIndex={recognizingSlotIndex}
                canAnalyze={canAnalyze}
                filledCount={filledCount}
                onAnalyze={handleAnalyze}
                onChange={handleInputChange}
                onImageUpload={(index, file) =>
                  void handleImageUpload(index, file)
                }
                values={inputs}
              />

              <div className="flex min-h-[400px] flex-col overflow-hidden rounded-lg border border-white/16 bg-white/10 p-5 backdrop-blur-2xl">
                <p className="text-xs font-semibold uppercase tracking-normal text-cyan-100/70">
                  当前分析
                </p>
                <h2 className="mt-1 text-xl font-semibold text-white">
                  当前分析结果
                </h2>
                {loading ? (
                  <div className="mt-4 rounded-lg border border-cyan-200/30 bg-cyan-300/10 p-5 text-sm text-cyan-50">
                    <div className="flex items-center gap-2 font-semibold">
                      <Sparkles className="size-4" aria-hidden="true" />
                      正在逐个补充岗位信息并计算匹配分...
                    </div>
                    <p className="mt-2 text-white/68">
                      卡片会先出现，再依次回填公司信息、评分和投递建议。
                    </p>
                  </div>
                ) : null}
                <div className="mt-4 min-h-0 flex-1">
                  <CurrentAnalysisList
                    jobs={state?.jobs ?? []}
                    results={currentResults}
                    resumeVersions={state?.resumeVersions ?? []}
                  />
                </div>
              </div>
            </div>

            {error ? (
              <p className="rounded-md border border-rose-200/25 bg-rose-400/10 p-3 text-sm text-rose-100">
                {error}
              </p>
            ) : null}
          </>
        )}
      </div>
    </JobLoopShell>
  );
}
