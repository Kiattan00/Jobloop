"use client";

import { History, Sparkles } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CurrentAnalysisList } from "@/components/jobloop/current-analysis-list";
import { JdBatchInput } from "@/components/jobloop/jd-batch-input";
import { JobLoopShell } from "@/components/jobloop/jobloop-shell";
import { EmptyState, PageHeader } from "@/components/jobloop/page-chrome";
import { createEntityId } from "@/lib/jobloop/generators";
import {
  createJdBatch,
  createJobsFromDrafts,
  parseJdBatchText,
} from "@/lib/jobloop/jd-parser";
import { sampleJdBatchInput } from "@/lib/jobloop/seed-data";
import {
  getAnalysisDraftInput,
  getJobLoopState,
  hasPersistedJobLoopState,
  saveAnalysisDraftInput,
  saveBatchAnalysis,
  saveJdBatchWithJobs,
  updateAnalysisResult,
  updateJob,
} from "@/lib/jobloop/storage";
import type {
  AiOutput,
  JobAnalysisResult,
  JobJd,
  JobLoopState,
} from "@/lib/jobloop/types";

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
    status: "enriching",
    createdAt: new Date().toISOString(),
  };
}

export default function AnalysesPage() {
  const [state, setState] = useState<JobLoopState | null>(null);
  const [input, setInput] = useState("");
  const [currentBatchId, setCurrentBatchId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const current = getJobLoopState();
    const persistedDraftInput = getAnalysisDraftInput();
    setState(current);
    setCurrentBatchId(current.jdBatches[0]?.id ?? null);
    setInput(
      persistedDraftInput ||
        (!hasPersistedJobLoopState() ? sampleJdBatchInput : ""),
    );
  }, []);

  useEffect(() => {
    saveAnalysisDraftInput(input);
  }, [input]);

  const hasResumeVersions = (state?.resumeVersions.length ?? 0) > 0;
  const liveDrafts = useMemo(() => parseJdBatchText(input), [input]);

  const currentResults = useMemo(() => {
    if (!state || !currentBatchId) {
      return [] as JobAnalysisResult[];
    }

    const batch = state.jdBatches.find((item) => item.id === currentBatchId);
    const jobIds = new Set(batch?.jobIds ?? []);
    return state.analysisResults.filter((result) => jobIds.has(result.jobId));
  }, [currentBatchId, state]);

  const parseInput = () => {
    setError(null);
  };

  const refreshState = () => {
    setState(getJobLoopState());
  };

  const handleAnalyze = async () => {
    if (!state) {
      return;
    }

    const parsedDrafts = parseJdBatchText(input);
    if (parsedDrafts.length === 0) {
      setError("请先输入至少 1 份可识别的 JD，再开始分析。");
      return;
    }

    const batch = createJdBatch(`岗位分析 ${state.jdBatches.length + 1}`);
    const jobs = createJobsFromDrafts(batch.id, parsedDrafts).map((job) => ({
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

    const outputs: AiOutput[] = [];

    const tasks = jobs.map(async (job, index) => {
      try {
        const enrichController = new AbortController();
        const enrichTimer = setTimeout(() => enrichController.abort(), 90_000);
        const enrichResponse = await fetch("/api/ai/job-enrich", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ job }),
          signal: enrichController.signal,
        });
        clearTimeout(enrichTimer);

        const enrichData = (await enrichResponse.json()) as {
          job?: JobJd;
          error?: string;
        };

        if (!enrichResponse.ok || !enrichData.job) {
          throw new Error(enrichData.error || "岗位信息补充失败，请稍后重试。");
        }

        updateJob(enrichData.job);
        updateAnalysisResult({
          ...placeholderResults[index],
          summary: "岗位信息补充完成，正在计算匹配分与投递建议。",
          status: "scoring",
        });
        refreshState();

        const scoreController = new AbortController();
        const scoreTimer = setTimeout(() => scoreController.abort(), 90_000);
        const scoreResponse = await fetch("/api/ai/job-score", {
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

        const scoreData = (await scoreResponse.json()) as {
          result?: JobAnalysisResult;
          aiOutput?: AiOutput;
          error?: string;
        };

        if (!scoreResponse.ok || !scoreData.result) {
          throw new Error(scoreData.error || "岗位评分失败，请稍后重试。");
        }

        saveBatchAnalysis(
          [{ ...scoreData.result, status: "ready" as const }],
          scoreData.aiOutput,
        );
        outputs.push(scoreData.aiOutput as AiOutput);
        updateJob({
          ...enrichData.job,
          processingStatus: "ready",
          processingError: undefined,
          updatedAt: new Date().toISOString(),
        });
        refreshState();
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
    });

    await Promise.allSettled(tasks);

    const nextState = getJobLoopState();
    setState(nextState);
    setLoading(false);

    const failedCount = nextState.analysisResults.filter(
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
      <div className="grid min-h-[720px] gap-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <PageHeader
            eyebrow="岗位分析工作台"
            title="岗位分析"
            subtitle="输入多份 JD 后，系统会先解析岗位标题卡片，再逐个补充公司信息、结构化 JD 和匹配分数。完整报告会在详情页继续加载。"
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
          <div className="grid gap-6 pt-6">
            <div className="grid gap-6 lg:grid-cols-[420px_minmax(0,1fr)] lg:items-start">
              <div>
                <JdBatchInput
                  canAnalyze={liveDrafts.length > 0 && !loading}
                  onAnalyze={handleAnalyze}
                  onChange={setInput}
                  onParse={parseInput}
                  parsedCount={liveDrafts.length}
                  value={input}
                />
              </div>

              <div className="flex min-h-[520px] flex-col overflow-hidden rounded-lg border border-white/16 bg-white/10 p-5 backdrop-blur-2xl">
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
          </div>
        )}
      </div>
    </JobLoopShell>
  );
}
