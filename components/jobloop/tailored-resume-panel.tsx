import { WandSparkles } from "lucide-react";
import type { TailoredResume } from "@/lib/jobloop/types";
import { GlassPanel } from "./glass-panel";

export function TailoredResumePanel({
  tailoredResume,
  onGenerate,
  canGenerate = true,
  helperText,
}: {
  tailoredResume?: TailoredResume;
  onGenerate: () => void;
  canGenerate?: boolean;
  helperText?: string;
}) {
  return (
    <GlassPanel intensity="card" className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-normal text-cyan-100/70">
            岗位微调简历
          </p>
          <h2 className="mt-1 text-xl font-semibold text-white">
            岗位微调简历
          </h2>
          <p className="mt-1 text-sm text-white/58">
            微调版会绑定来源岗位和基础简历，不会覆盖你当前的基础版本。
          </p>
        </div>
        <button
          className="inline-flex h-10 items-center gap-2 rounded-md border border-cyan-200/70 bg-cyan-300/18 px-4 text-sm font-semibold text-cyan-50 disabled:cursor-not-allowed disabled:opacity-45"
          disabled={!canGenerate}
          onClick={onGenerate}
          type="button"
        >
          <WandSparkles className="size-4" aria-hidden="true" />
          {tailoredResume ? "重新生成" : "生成微调版"}
        </button>
      </div>
      {tailoredResume ? (
        <div className="mt-5">
          <h3 className="font-semibold text-white">{tailoredResume.title}</h3>
          <ul className="mt-3 grid gap-2 text-sm leading-6 text-white/64">
            {tailoredResume.tailoringNotes.map((note) => (
              <li
                className="rounded-md border border-white/14 bg-black/12 p-3"
                key={note}
              >
                {note}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="mt-5 rounded-md border border-white/14 bg-black/12 p-4 text-sm text-white/58">
          {helperText || "还没有为该岗位生成微调版本。"}
        </p>
      )}
    </GlassPanel>
  );
}
