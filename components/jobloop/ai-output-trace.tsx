import type { AiOutput, JobJd, ResumeVersion } from "@/lib/jobloop/types";
import { GlassPanel } from "./glass-panel";

export function AiOutputTrace({
  outputs,
  job,
  resumeVersion,
}: {
  outputs: AiOutput[];
  job?: JobJd;
  resumeVersion?: ResumeVersion;
}) {
  return (
    <GlassPanel intensity="card" className="p-5">
      <p className="text-xs font-semibold uppercase tracking-normal text-cyan-100/70">
        AI trace
      </p>
      <h2 className="mt-1 text-xl font-semibold text-white">生成追踪</h2>
      <div className="mt-4 grid gap-3 text-sm leading-6 text-white/62">
        <p>
          来源岗位：{job ? `${job.companyName} / ${job.jobTitle}` : "未找到"}
        </p>
        <p>来源简历：{resumeVersion?.name ?? "未找到"}</p>
        <p>
          公司补充信息：
          {job?.companyResearch?.summary || job?.companyInfo || "待补充"}
        </p>
        <p>
          结构化 JD：
          {job?.structuredJd
            ? `${job.structuredJd.jobTitle} / ${job.structuredJd.location || "地点待补充"} / ${job.structuredJd.salaryRange || "薪资待补充"}`
            : "待补充"}
        </p>
      </div>
      <div className="mt-4 grid gap-2">
        {outputs.length === 0 ? (
          <p className="rounded-md border border-white/14 bg-black/12 p-3 text-sm text-white/52">
            暂无可追踪的 AI 输出。
          </p>
        ) : (
          outputs.map((output) => (
            <div
              className="rounded-md border border-white/14 bg-black/12 p-3 text-xs leading-5 text-white/58"
              key={output.id}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="font-semibold uppercase text-cyan-100/70">
                  {output.type}
                </span>
                <span>
                  {new Date(output.createdAt).toLocaleString("zh-CN")}
                </span>
              </div>
              <p className="mt-1">
                {output.provider || "unknown"} / {output.model || "unknown"}
              </p>
              <p className="mt-1">{output.inputSummary}</p>
            </div>
          ))
        )}
      </div>
    </GlassPanel>
  );
}
