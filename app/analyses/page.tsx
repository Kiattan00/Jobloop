"use client";

import { History, Sparkles } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CurrentAnalysisList } from "@/components/jobloop/current-analysis-list";
import { JdBatchInput } from "@/components/jobloop/jd-batch-input";
import { JobLoopShell } from "@/components/jobloop/jobloop-shell";
import { EmptyState, PageHeader } from "@/components/jobloop/page-chrome";
import {
  createJdBatch,
  createJobsFromDrafts,
  parseJdBatchText,
} from "@/lib/jobloop/jd-parser";
import {
  getJobLoopState,
  saveBatchAnalysis,
  saveJdBatchWithJobs,
} from "@/lib/jobloop/storage";
import type {
  AiOutput,
  JobAnalysisResult,
  JobJd,
  JobLoopState,
} from "@/lib/jobloop/types";

export default function AnalysesPage() {
  const [state, setState] = useState<JobLoopState | null>(null);
  const [input, setInput] = useState("");
  const [currentBatchId, setCurrentBatchId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const current = getJobLoopState();
    setState(current);
    setCurrentBatchId(current.jdBatches[0]?.id ?? null);
  }, []);

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
    const jobs = createJobsFromDrafts(batch.id, parsedDrafts);
    const completeBatch = { ...batch, jobIds: jobs.map((job) => job.id) };

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/ai/batch-analysis", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          batchId: completeBatch.id,
          jobs,
          resumeVersions: state.resumeVersions,
        }),
      });

      const data = (await response.json()) as {
        jobs?: JobJd[];
        results?: JobAnalysisResult[];
        aiOutput?: AiOutput;
        error?: string;
      };

      if (!response.ok || !data.results || !data.jobs) {
        throw new Error(data.error || "岗位分析生成失败，请稍后重试。");
      }

      saveJdBatchWithJobs(completeBatch, data.jobs);
      saveBatchAnalysis(data.results, data.aiOutput);

      const nextState = getJobLoopState();
      setState(nextState);
      setCurrentBatchId(completeBatch.id);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "岗位分析生成失败，请稍后重试。",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <JobLoopShell active="/analyses">
      <div className="grid min-h-[720px] gap-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <PageHeader
            eyebrow="岗位分析工作台"
            title="岗位分析"
            subtitle="输入多份 JD 后，系统会先联网补全公司信息，再结合结构化岗位信息与简历版本完成评分和分析。"
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
            description="岗位分析需要读取当前简历库中的基础简历版本，请先在简历管理中完成生成。"
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
                      正在联网检索并分析岗位...
                    </div>
                    <p className="mt-2 text-white/68">
                      系统会先补全公司信息、提取结构化
                      JD，再给出总分和投递判断。
                    </p>
                  </div>
                ) : (
                  <div className="mt-4 min-h-0 flex-1">
                    <CurrentAnalysisList
                      jobs={state?.jobs ?? []}
                      results={currentResults}
                      resumeVersions={state?.resumeVersions ?? []}
                    />
                  </div>
                )}
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
