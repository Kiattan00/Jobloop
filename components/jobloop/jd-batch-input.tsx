import { Sparkles } from "lucide-react";
import { GlassPanel } from "./glass-panel";

export function JdBatchInput({
  values,
  onChange,
  onAnalyze,
  canAnalyze,
  filledCount,
}: {
  values: string[];
  onChange: (index: number, value: string) => void;
  onAnalyze: () => void;
  canAnalyze: boolean;
  filledCount: number;
}) {
  return (
    <GlassPanel intensity="panel" className="p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-normal text-cyan-100/70">
            JD 输入
          </p>
          <h2 className="text-lg font-semibold text-white">最多 5 个岗位 JD</h2>
        </div>
        <span className="rounded-full border border-cyan-200/40 bg-cyan-300/12 px-2.5 py-0.5 text-xs font-semibold text-cyan-50">
          {filledCount} / 5
        </span>
      </div>

      <div className="mt-2.5 grid gap-1.5">
        {values.map((value, index) => (
          <div
            className="flex items-start gap-2 rounded-lg border border-white/14 bg-black/12 p-2"
            key={`jd-slot-${index + 1}`}
          >
            <span className="mt-1.5 shrink-0 text-xs font-semibold text-white/55 w-14 text-right">
              岗位 {index + 1}
            </span>
            <textarea
              className="min-h-16 flex-1 resize-none rounded-lg border border-white/18 bg-black/20 p-2 text-sm leading-6 text-white outline-none placeholder:text-white/35 focus:border-cyan-200/70"
              onChange={(event) => onChange(index, event.target.value)}
              placeholder={`粘贴第 ${index + 1} 条 JD`}
              value={value}
            />
            {value.trim() ? (
              <button
                className="mt-1.5 shrink-0 text-xs font-medium text-white/55 hover:text-white/80"
                onClick={() => onChange(index, "")}
                type="button"
              >
                清空
              </button>
            ) : (
              <span className="mt-1.5 w-8 shrink-0" />
            )}
          </div>
        ))}
      </div>

      <div className="mt-2.5 flex flex-wrap gap-3">
        <button
          className="inline-flex h-9 items-center gap-2 rounded-md border border-cyan-200/70 bg-cyan-300/18 px-4 text-sm font-semibold text-cyan-50 shadow-[0_0_28px_rgba(70,210,225,0.18)] disabled:cursor-not-allowed disabled:opacity-45"
          disabled={!canAnalyze}
          onClick={onAnalyze}
          type="button"
        >
          <Sparkles className="size-4" aria-hidden="true" />
          开始岗位分析
        </button>
      </div>
    </GlassPanel>
  );
}
