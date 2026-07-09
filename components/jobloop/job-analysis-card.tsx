import Link from "next/link";
import type {
  JobAnalysisResult,
  JobJd,
  ResumeVersion,
} from "@/lib/jobloop/types";
import { GlassPanel } from "./glass-panel";

const decisionLabel = {
  recommend: "推荐",
  cautious: "谨慎",
  not_recommended: "不优先",
};

const decisionTone = {
  recommend: "border-cyan-200/60 bg-cyan-300/16 text-cyan-50",
  cautious: "border-amber-200/55 bg-amber-300/14 text-amber-50",
  not_recommended: "border-white/18 bg-white/10 text-white/62",
};

const statusLabel = {
  draft: "待开始",
  extracting_jd: "提取 JD 中...",
  enriching: "补充公司信息中...",
  scoring: "评分中...",
  ready: "已完成",
  failed: "分析失败",
} as const;

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

export function JobAnalysisCard({
  job,
  result,
  resumeVersion,
}: {
  job: JobJd;
  result: JobAnalysisResult;
  resumeVersion?: ResumeVersion;
}) {
  return (
    <GlassPanel intensity="card" className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-normal text-cyan-100/70">
            {job.companyName}
          </p>
          <h3 className="mt-2 text-xl font-semibold text-white">
            {job.jobTitle}
            <span className="text-cyan-200/80">
              {formatSalaryMidpoint(job.structuredJd?.salaryRange)}
            </span>
          </h3>
          <p className="mt-1 text-sm text-white/54">
            推荐简历：{resumeVersion?.name ?? "未找到基础版本"}
          </p>
        </div>
        <div className="text-right">
          <p className="text-4xl font-semibold text-cyan-50">
            {result.status === "ready" ? `${result.matchScore}%` : "--"}
          </p>
          <span
            className={`mt-2 inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${decisionTone[result.applyDecision]}`}
          >
            {result.status === "ready"
              ? decisionLabel[result.applyDecision]
              : statusLabel[result.status || "ready"]}
          </span>
        </div>
      </div>
      <p className="mt-4 text-sm leading-6 text-white/66">
        {result.errorMessage ||
          result.summary ||
          "系统正在补充岗位信息并准备评分结果。"}
      </p>
      <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <div className="rounded-md border border-white/14 bg-black/12 p-3 text-white/58">
          是否需微调：
          <span className="font-semibold text-white">
            {result.status === "ready"
              ? result.needsTailoring
                ? "需要"
                : "暂不需要"
              : "待判断"}
          </span>
        </div>
        <div className="rounded-md border border-white/14 bg-black/12 p-3 text-white/58">
          主要风险：
          <span className="font-semibold text-white">
            {result.mainRisk || "等待评分后生成"}
          </span>
        </div>
      </div>
      <div className="mt-5 flex flex-wrap gap-3">
        {result.status === "ready" ? (
          <Link
            className="inline-flex h-10 items-center justify-center rounded-md border border-cyan-200/70 bg-cyan-300/18 px-4 text-sm font-semibold text-cyan-50"
            href={`/analyses/${job.id}`}
          >
            查看详情
          </Link>
        ) : (
          <span className="inline-flex h-10 items-center justify-center rounded-md border border-white/16 bg-white/8 px-4 text-sm font-semibold text-white/52">
            详情生成中
          </span>
        )}
        {job.jobUrl ? (
          <a
            className="inline-flex h-10 items-center justify-center rounded-md border border-white/20 bg-white/10 px-4 text-sm font-semibold text-white/74"
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
}
