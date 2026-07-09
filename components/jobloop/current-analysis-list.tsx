import Link from "next/link";
import type {
  JobAnalysisResult,
  JobJd,
  ResumeVersion,
} from "@/lib/jobloop/types";
import { GlassPanel } from "./glass-panel";

function formatSalaryMidpoint(salaryRange?: string): string {
  if (!salaryRange) return "";
  const match = salaryRange.match(/(\d+(?:\.\d)?)\s*-\s*(\d+(?:\.\d)?)\s*K/i);
  if (match) {
    const low = Number.parseFloat(match[1]);
    const high = Number.parseFloat(match[2]);
    const mid = Math.round((low + high) / 2);
    return `\u00B7${mid}K`;
  }
  const single = salaryRange.match(/(\d+(?:\.\d)?)\s*K/i);
  if (single) {
    return `\u00B7${single[1]}K`;
  }
  return "";
}

const statusLabel = {
  draft: "待开始",
  extracting_jd: "提取结构化JD",
  enriching: "补充信息中",
  scoring: "评分中",
  ready: "已完成",
  failed: "处理失败",
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
                  <span className="text-white/56">
                    {formatSalaryMidpoint(job.structuredJd?.salaryRange)}
                  </span>
                </h3>
                <p className="mt-1 text-sm text-white/56">
                  {result.status === "failed"
                    ? "分析失败，可稍后重试该批次"
                    : `推荐简历：${version?.name ?? "未匹配到简历版本"}`}
                </p>
              </div>
              <div className="text-right">
                <p className="text-4xl font-semibold text-cyan-50">
                  {result.status === "ready" ? `${result.matchScore}%` : "--"}
                </p>
                <span className="mt-1 inline-flex rounded-full border border-cyan-200/45 bg-cyan-300/12 px-3 py-1 text-xs font-semibold text-cyan-50">
                  {statusLabel[result.status || "ready"]}
                </span>
              </div>
            </div>

            <p className="mt-4 text-sm leading-6 text-white/66">
              {result.errorMessage ||
                result.summary ||
                "系统正在补充岗位信息并准备评分结果。"}
            </p>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="rounded-md border border-white/14 bg-black/12 p-3 text-sm text-white/62">
                是否需要微调：
                <span className="font-semibold text-white">
                  {result.status === "ready"
                    ? result.needsTailoring
                      ? " 需要"
                      : " 暂不需要"
                    : " 待判断"}
                </span>
              </div>
              <div className="rounded-md border border-white/14 bg-black/12 p-3 text-sm text-white/62">
                主要风险：
                <span className="font-semibold text-white">
                  {" "}
                  {result.mainRisk || "等待评分后生成"}
                </span>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              {result.status === "ready" ? (
                <Link
                  className="inline-flex h-9 items-center justify-center rounded-md border border-cyan-200/60 bg-cyan-300/15 px-3 text-sm font-semibold text-cyan-50"
                  href={`/analyses/${job.id}`}
                >
                  查看详情
                </Link>
              ) : (
                <span className="inline-flex h-9 items-center justify-center rounded-md border border-white/16 bg-white/8 px-3 text-sm font-semibold text-white/52">
                  详情生成中
                </span>
              )}
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
