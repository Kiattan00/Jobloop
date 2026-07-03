import { Sparkles } from "lucide-react";
import type { ReactNode } from "react";
import { GlassPanel } from "./glass-panel";

export function JdBatchInput({
  value,
  onChange,
  onParse,
  onAnalyze,
  canAnalyze,
  parsedCount,
  children,
}: {
  value: string;
  onChange: (value: string) => void;
  onParse: () => void;
  onAnalyze: () => void;
  canAnalyze: boolean;
  parsedCount: number;
  children?: ReactNode;
}) {
  return (
    <GlassPanel intensity="panel" className="self-start p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-normal text-cyan-100/70">
            JD 输入
          </p>
          <h2 className="mt-1 text-xl font-semibold text-white">输入多个 JD</h2>
          <p className="mt-1 text-sm text-white/58">
            用空行、`---` 或 `###`
            分隔多个岗位。解析后会结合简历库中的基础版本逐个完成匹配分析。
          </p>
        </div>
        <span className="rounded-full border border-cyan-200/40 bg-cyan-300/12 px-3 py-1 text-xs font-semibold text-cyan-50">
          已解析 {parsedCount} 个
        </span>
      </div>
      <textarea
        className="mt-5 min-h-80 w-full rounded-lg border border-white/18 bg-black/20 p-4 text-sm leading-6 text-white outline-none placeholder:text-white/35 focus:border-cyan-200/70"
        onChange={(event) => onChange(event.target.value)}
        placeholder="公司：UrbanTech Studio&#10;岗位：AI 产品经理&#10;链接：https://example.com/job&#10;JD：负责 AI 产品需求、Prompt 体验、数据指标与跨团队协作..."
        value={value}
      />
      <div className="mt-4 flex flex-wrap gap-3">
        <button
          className="inline-flex h-10 items-center justify-center rounded-md border border-white/24 bg-white/13 px-4 text-sm font-semibold text-white/82 hover:bg-white/18"
          onClick={onParse}
          type="button"
        >
          解析 JD
        </button>
        <button
          className="inline-flex h-10 items-center gap-2 rounded-md border border-cyan-200/70 bg-cyan-300/18 px-4 text-sm font-semibold text-cyan-50 shadow-[0_0_28px_rgba(70,210,225,0.18)] disabled:cursor-not-allowed disabled:opacity-45"
          disabled={!canAnalyze}
          onClick={onAnalyze}
          type="button"
        >
          <Sparkles className="size-4" aria-hidden="true" />
          生成岗位分析
        </button>
      </div>
      {children ? <div className="mt-4">{children}</div> : null}
    </GlassPanel>
  );
}
