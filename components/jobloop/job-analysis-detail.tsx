import type {
  JobAnalysisResult,
  JobDetailAnalysis,
  JobJd,
  ResumeVersion,
} from "@/lib/jobloop/types";
import { CompanyInfoPanel } from "./company-info-panel";
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

const scoreMeta = [
  { key: "industryMatch", label: "行业匹配度", weight: "25%" },
  { key: "companyStrength", label: "公司实力", weight: "20%" },
  { key: "roleMatch", label: "岗位匹配度", weight: "30%" },
  { key: "salaryCompetitiveness", label: "薪资竞争力", weight: "15%" },
  { key: "growthPotential", label: "成长性", weight: "10%" },
] as const;

function normalizeReportBody(report: unknown) {
  if (typeof report === "string") {
    return report;
  }

  if (Array.isArray(report)) {
    return report
      .map((item) => (typeof item === "string" ? item : JSON.stringify(item)))
      .join("\n");
  }

  if (report && typeof report === "object") {
    return JSON.stringify(report, null, 2);
  }

  return "";
}

export function JobAnalysisDetail({
  job,
  result,
  detail,
  resumeVersion,
  loading,
}: {
  job: JobJd;
  result: JobAnalysisResult;
  detail: JobDetailAnalysis;
  resumeVersion?: ResumeVersion;
  loading?: boolean;
}) {
  const legacyItems = [
    ...(detail.strengths ?? []).map((item) => `匹配优势：${item}`),
    ...(detail.gaps ?? []).map((item) => `风险提示：${item}`),
    ...(detail.recommendedActions ?? []).map((item) => `建议动作：${item}`),
  ];

  const reportBody = loading
    ? "正在生成分析报告..."
    : normalizeReportBody(detail.report) ||
      legacyItems.join("\n") ||
      "分析报告将在完成最新岗位分析后展示。";

  return (
    <GlassPanel intensity="panel" className="p-6 lg:p-7">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-normal text-cyan-100/70">
            {job.companyName}
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-white">
            {job.jobTitle}
            <span className="text-white/54">
              {formatSalaryMidpoint(job.structuredJd?.salaryRange)}
            </span>
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-white/60">
            {detail.conclusion}
          </p>
        </div>
        <div className="rounded-lg border border-cyan-200/40 bg-cyan-300/12 p-4 text-right">
          <p className="text-xs font-semibold uppercase text-cyan-100/70">
            匹配分数
          </p>
          <p className="mt-1 text-5xl font-semibold text-cyan-50">
            {result.matchScore}%
          </p>
        </div>
      </div>

      <div className="mt-6 grid items-stretch gap-4 lg:grid-cols-[0.72fr_1.28fr]">
        <CompanyInfoPanel
          research={job.companyResearch}
          value={job.companyInfo}
        />
        <div className="flex h-full flex-col rounded-lg border border-white/14 bg-black/12 p-5">
          <p className="text-xs font-semibold uppercase tracking-normal text-cyan-100/60">
            {resumeVersion?.name ?? "分析报告"}
          </p>
          <h3 className="mt-1 text-lg font-semibold text-white">分析报告</h3>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {scoreMeta.map((item) => (
              <div
                className="rounded-md border border-white/12 bg-white/6 p-3"
                key={item.key}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-semibold text-white">
                    {item.label}
                  </span>
                  <span className="text-xs text-cyan-100/70">
                    {item.weight}
                  </span>
                </div>
                <p className="mt-2 text-2xl font-semibold text-cyan-50">
                  {result.scoreBreakdown?.[item.key] ?? 0}
                </p>
                <p className="mt-2 text-sm leading-6 text-white/62">
                  {detail.scoreBreakdownReasons?.[item.key] ||
                    "待补充评分说明。"}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-5 rounded-lg border border-white/12 bg-white/6 p-4">
            <p className="text-sm font-semibold text-white">总结评论</p>
            <p className="mt-2 text-sm leading-7 text-white/68">
              {detail.conclusion}
            </p>
          </div>

          <div className="mt-4 rounded-lg border border-white/12 bg-white/6 p-4">
            <p className="text-sm font-semibold text-white">分析报告正文</p>
            <div className="mt-2 whitespace-pre-wrap text-sm leading-7 text-white/68">
              {loading ? (
                <span className="inline-flex items-center gap-2 text-cyan-200/70">
                  <span className="inline-block size-3 animate-pulse rounded-full bg-cyan-300/60" />
                  正在生成分析报告...
                </span>
              ) : (
                reportBody
              )}
            </div>
          </div>
        </div>
      </div>
    </GlassPanel>
  );
}
