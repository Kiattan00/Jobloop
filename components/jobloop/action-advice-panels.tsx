import type { JobDetailAnalysis } from "@/lib/jobloop/types";
import { GlassPanel } from "./glass-panel";

export function ActionAdvicePanels({ detail }: { detail: JobDetailAnalysis }) {
  return (
    <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
      <GlassPanel intensity="card" className="p-5">
        <p className="text-xs font-semibold uppercase tracking-normal text-cyan-100/70">
          打招呼话术
        </p>
        <h2 className="mt-1 text-xl font-semibold text-white">打招呼话术</h2>
        <p className="mt-4 rounded-lg border border-white/14 bg-black/14 p-4 text-sm leading-7 text-white/68">
          {detail.outreachMessage}
        </p>
      </GlassPanel>
      <GlassPanel intensity="card" className="p-5">
        <p className="text-xs font-semibold uppercase tracking-normal text-cyan-100/70">
          面试准备
        </p>
        <h2 className="mt-1 text-xl font-semibold text-white">面试准备</h2>
        <ul className="mt-4 space-y-3 text-sm leading-6 text-white/64">
          {detail.interviewPrep.map((item) => (
            <li
              className="rounded-md border border-white/14 bg-black/12 p-3"
              key={item}
            >
              {item}
            </li>
          ))}
        </ul>
      </GlassPanel>
    </div>
  );
}
