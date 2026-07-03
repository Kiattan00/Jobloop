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
          </h3>
          <p className="mt-1 text-sm text-white/54">
            推荐简历：{resumeVersion?.name ?? "未找到基础版本"}
          </p>
        </div>
        <div className="text-right">
          <p className="text-4xl font-semibold text-cyan-50">
            {result.matchScore}%
          </p>
          <span
            className={`mt-2 inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${decisionTone[result.applyDecision]}`}
          >
            {decisionLabel[result.applyDecision]}
          </span>
        </div>
      </div>
      <p className="mt-4 text-sm leading-6 text-white/66">{result.summary}</p>
      <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <div className="rounded-md border border-white/14 bg-black/12 p-3 text-white/58">
          是否需微调：
          <span className="font-semibold text-white">
            {result.needsTailoring ? "需要" : "暂不需要"}
          </span>
        </div>
        <div className="rounded-md border border-white/14 bg-black/12 p-3 text-white/58">
          主要风险：
          <span className="font-semibold text-white">{result.mainRisk}</span>
        </div>
      </div>
      <div className="mt-5 flex flex-wrap gap-3">
        <Link
          className="inline-flex h-10 items-center justify-center rounded-md border border-cyan-200/70 bg-cyan-300/18 px-4 text-sm font-semibold text-cyan-50"
          href={`/analyses/${job.id}`}
        >
          查看详情
        </Link>
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
