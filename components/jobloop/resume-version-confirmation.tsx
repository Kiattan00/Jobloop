"use client";

import { CheckCircle2 } from "lucide-react";

export function ResumeVersionConfirmation({
  selectedCount,
  onConfirm,
}: {
  selectedCount: number;
  onConfirm: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-cyan-200/40 bg-cyan-300/10 p-4">
      <div>
        <p className="font-semibold text-white">确认保存到简历库</p>
        <p className="mt-1 text-sm text-white/60">
          已选择 {selectedCount} 个版本。保存后不会被 AI 静默覆盖。
        </p>
      </div>
      <button
        className="inline-flex h-10 items-center gap-2 rounded-md border border-cyan-200/70 bg-cyan-300/18 px-4 text-sm font-semibold text-cyan-50 disabled:cursor-not-allowed disabled:opacity-45"
        disabled={selectedCount === 0}
        onClick={onConfirm}
        type="button"
      >
        <CheckCircle2 className="size-4" aria-hidden="true" />
        保存所选版本
      </button>
    </div>
  );
}
