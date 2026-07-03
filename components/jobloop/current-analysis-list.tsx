import Link from "next/link";
import type {
  JobAnalysisResult,
  JobJd,
  ResumeVersion,
} from "@/lib/jobloop/types";
import { GlassPanel } from "./glass-panel";

const decisionLabel = {
  recommend: "值得投",
  cautious: "谨慎投",
  not_recommended: "暂不优先",
} as const;

export function CurrentAnalysisList({
  jobs,
  results,
  resumeVersions,
}: {
  jobs: JobJd[];
  results: JobAnalysisResult[];
  resumeVersions: ResumeVersion[];
}) {
  if (results.length === 0) {
    return (
      <GlassPanel intensity="card" className="min-h-[220px] p-5">
        <p className="text-xs font-semibold uppercase tracking-normal text-cyan-100/70">
          当前分析
        </p>
        <h2 className="mt-1 text-xl font-semibold text-white">当前分析结果</h2>
        <p className="mt-4 text-sm leading-6 text-white/58">
          运行岗位分析后，这里会显示当前批次的分析结果。
        </p>
      </GlassPanel>
    );
  }

  const sortedResults = [...results].sort(
    (left, right) => right.matchScore - left.matchScore,
  );

  return (
    <div className="grid h-full max-h-[520px] gap-4 overflow-auto pr-1">
      {sortedResults.map((result) => {
        const job = jobs.find((item) => item.id === result.jobId);
        const version = resumeVersions.find(
          (item) => item.id === result.recommendedResumeVersionId,
        );

        if (!job) {
          return null;
        }

        return (
          <GlassPanel intensity="card" className="p-5" key={result.id}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold uppercase tracking-normal text-cyan-100/70">
                  {job.companyName}
                </p>
                <h3 className="mt-1 text-xl font-semibold text-white">
                  {job.companyName}·{job.jobTitle}
                </h3>
                <p className="mt-1 text-sm text-white/56">
                  推荐简历：{version?.name ?? "未匹配到简历版本"}
                </p>
              </div>
              <div className="text-right">
                <p className="text-4xl font-semibold text-cyan-50">
                  {result.matchScore}%
                </p>
                <span className="mt-1 inline-flex rounded-full border border-cyan-200/45 bg-cyan-300/12 px-3 py-1 text-xs font-semibold text-cyan-50">
                  {decisionLabel[result.applyDecision]}
                </span>
              </div>
            </div>

            <p className="mt-4 text-sm leading-6 text-white/66">
              {result.summary}
            </p>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="rounded-md border border-white/14 bg-black/12 p-3 text-sm text-white/62">
                是否需要微调：
                <span className="font-semibold text-white">
                  {result.needsTailoring ? " 需要" : " 暂不需要"}
                </span>
              </div>
              <div className="rounded-md border border-white/14 bg-black/12 p-3 text-sm text-white/62">
                主要风险：
                <span className="font-semibold text-white">
                  {" "}
                  {result.mainRisk}
                </span>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                className="inline-flex h-9 items-center justify-center rounded-md border border-cyan-200/60 bg-cyan-300/15 px-3 text-sm font-semibold text-cyan-50"
                href={`/analyses/${job.id}`}
              >
                查看详情
              </Link>
              {job.jobUrl ? (
                <a
                  className="inline-flex h-9 items-center justify-center rounded-md border border-white/20 bg-white/10 px-3 text-sm font-semibold text-white/78"
                  href={job.jobUrl}
                  rel="noreferrer"
                  target="_blank"
                >
                  打开岗位
                </a>
              ) : null}
            </div>
          </GlassPanel>
        );
      })}
    </div>
  );
}
