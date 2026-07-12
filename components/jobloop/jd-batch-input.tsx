import { Image, Sparkles, X } from "lucide-react";
import { GlassPanel } from "./glass-panel";

export function JdBatchInput({
  values,
  onChange,
  onImageUpload,
  onAnalyze,
  canAnalyze,
  filledCount,
  busySlotIndex,
}: {
  values: string[];
  onChange: (index: number, value: string) => void;
  onImageUpload: (index: number, file: File) => void;
  onAnalyze: () => void;
  canAnalyze: boolean;
  filledCount: number;
  busySlotIndex?: number | null;
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
            className="flex min-h-20 items-start gap-2 rounded-lg border border-white/14 bg-black/12 p-2"
            key={`jd-slot-${index + 1}`}
          >
            <span className="mt-1.5 w-14 shrink-0 text-right text-xs font-semibold text-white/55">
              岗位 {index + 1}
            </span>
            <textarea
              className="min-h-16 flex-1 resize-none rounded-lg border border-white/18 bg-black/20 p-2 text-sm leading-6 text-white outline-none placeholder:text-white/35 focus:border-cyan-200/70"
              onChange={(event) => onChange(index, event.target.value)}
              placeholder={`粘贴第 ${index + 1} 条 JD 或岗位链接`}
              value={value}
            />
            <div className="mt-1 flex w-14 shrink-0 items-center justify-end gap-1">
              <label
                className={`inline-flex size-8 items-center justify-center rounded-full border border-white/18 bg-white/10 text-white/62 hover:bg-white/16 hover:text-white ${
                  busySlotIndex === index
                    ? "pointer-events-none cursor-wait opacity-45"
                    : "cursor-pointer"
                }`}
                title={
                  busySlotIndex === index ? "正在识别岗位截图" : "上传岗位截图"
                }
              >
                <Image className="size-4" aria-hidden="true" />
                <input
                  accept="image/png,image/jpeg,image/webp"
                  className="sr-only"
                  disabled={busySlotIndex === index}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    event.target.value = "";
                    if (file) {
                      onImageUpload(index, file);
                    }
                  }}
                  type="file"
                />
              </label>
              {value.trim() ? (
                <button
                  className="inline-flex size-8 items-center justify-center rounded-full text-white/50 hover:bg-white/10 hover:text-white/80"
                  onClick={() => onChange(index, "")}
                  title="清空"
                  type="button"
                >
                  <X className="size-4" aria-hidden="true" />
                </button>
              ) : (
                <span className="size-8 shrink-0" />
              )}
            </div>
            {busySlotIndex === index ? (
              <span className="sr-only">正在识别岗位截图</span>
            ) : null}
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
          {busySlotIndex === null || busySlotIndex === undefined
            ? "开始岗位分析"
            : "正在识别"}
        </button>
      </div>
    </GlassPanel>
  );
}
