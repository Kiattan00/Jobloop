"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AnalysisHistory } from "@/components/jobloop/analysis-history";
import { CurrentAnalysisList } from "@/components/jobloop/current-analysis-list";
import { JobLoopShell } from "@/components/jobloop/jobloop-shell";
import { EmptyState, PageHeader } from "@/components/jobloop/page-chrome";
import { getJobLoopState } from "@/lib/jobloop/storage";
import type { JobLoopState } from "@/lib/jobloop/types";

export default function AnalysisHistoryPage() {
  const [state, setState] = useState<JobLoopState | null>(null);
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);

  useEffect(() => {
    const current = getJobLoopState();
    setState(current);
    setSelectedBatchId(current.jdBatches[0]?.id ?? null);
  }, []);

  const visibleResults = useMemo(() => {
    if (!state || !selectedBatchId) {
      return [];
    }
    const batch = state.jdBatches.find((item) => item.id === selectedBatchId);
    const jobIds = new Set(batch?.jobIds ?? []);
    return state.analysisResults.filter((result) => jobIds.has(result.jobId));
  }, [selectedBatchId, state]);

  return (
    <JobLoopShell active="/analyses">
      <div className="grid h-[720px] gap-6 overflow-hidden">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <PageHeader
            eyebrow="Analysis history"
            title="历史分析"
            subtitle="查看不同时间的岗位分析批次，并在右侧查看对应分析内容。"
          />
          <Link
            className="inline-flex h-10 items-center rounded-md border border-white/24 bg-white/12 px-4 text-sm font-semibold text-white/82 hover:bg-white/18"
            href="/analyses"
          >
            返回岗位分析
          </Link>
        </div>

        {!state || state.jdBatches.length === 0 ? (
          <EmptyState
            actionHref="/analyses"
            actionLabel="返回岗位分析"
            description="还没有历史分析记录。先在岗位分析页完成一次分析。"
            title="暂无历史分析"
          />
        ) : (
          <div className="grid min-h-0 gap-6 lg:grid-cols-[340px_1fr]">
            <AnalysisHistory
              batches={state.jdBatches}
              jobs={state.jobs}
              onSelectBatch={setSelectedBatchId}
              results={state.analysisResults}
              selectedBatchId={selectedBatchId ?? undefined}
            />
            <div className="min-h-0 overflow-hidden rounded-lg border border-white/16 bg-white/10 p-5 backdrop-blur-2xl">
              <CurrentAnalysisList
                jobs={state.jobs}
                results={visibleResults}
                resumeVersions={state.resumeVersions}
              />
            </div>
          </div>
        )}
      </div>
    </JobLoopShell>
  );
}
