import type { JdBatch, JobAnalysisResult, JobJd } from "@/lib/jobloop/types";
import { GlassPanel } from "./glass-panel";

export function AnalysisHistory({
  batches,
  jobs,
  results,
  selectedBatchId,
  onSelectBatch,
}: {
  batches: JdBatch[];
  jobs: JobJd[];
  results: JobAnalysisResult[];
  selectedBatchId?: string;
  onSelectBatch?: (batchId: string) => void;
}) {
  if (batches.length === 0) {
    return null;
  }

  return (
    <GlassPanel intensity="card" className="p-5">
      <p className="text-xs font-semibold uppercase tracking-normal text-cyan-100/70">
        Analysis history
      </p>
      <h2 className="mt-1 text-xl font-semibold text-white">历史批次</h2>
      <div className="mt-4 grid gap-3">
        {batches.map((batch) => {
          const batchJobs = jobs.filter((job) => job.batchId === batch.id);
          const batchResults = results.filter((result) =>
            batchJobs.some((job) => job.id === result.jobId),
          );
          return (
            <button
              className={`rounded-md border p-3 text-left text-sm transition ${
                selectedBatchId === batch.id
                  ? "border-cyan-200/50 bg-cyan-300/12 text-white"
                  : "border-white/14 bg-black/12 text-white/64 hover:bg-white/10"
              }`}
              key={batch.id}
              onClick={() => onSelectBatch?.(batch.id)}
              type="button"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="font-semibold text-white">{batch.title}</span>
                <span>{new Date(batch.createdAt).toLocaleString("zh-CN")}</span>
              </div>
              <p className="mt-1">
                {batchJobs.length} 个岗位，{batchResults.length} 条分析结果
              </p>
            </button>
          );
        })}
      </div>
    </GlassPanel>
  );
}
