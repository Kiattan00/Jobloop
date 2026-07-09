import { Trash2 } from "lucide-react";
import type { ParsedJdDraft } from "@/lib/jobloop/jd-parser";
import { GlassPanel } from "./glass-panel";

function previewJdText(text: string) {
  const compact = text.replace(/\s+/g, " ").trim();
  if (compact.length <= 140) {
    return compact;
  }

  return `${compact.slice(0, 140)}...`;
}

export function ParsedJobList({
  drafts,
  warnings,
  onRemove,
}: {
  drafts: ParsedJdDraft[];
  warnings?: string[];
  onRemove: (id: string) => void;
}) {
  if (drafts.length === 0) {
    return (
      <GlassPanel intensity="card" className="p-5 text-sm text-white/58">
        智能拆分后会先在这里生成待确认岗位卡片。确认无误后，再进入 enrich /
        score / detail 分析流程。
      </GlassPanel>
    );
  }

  return (
    <div className="grid gap-4">
      {warnings?.length ? (
        <div className="grid gap-2">
          {warnings.map((warning) => (
            <p
              className="rounded-md border border-amber-200/25 bg-amber-300/10 p-3 text-sm text-amber-50"
              key={warning}
            >
              {warning}
            </p>
          ))}
        </div>
      ) : null}

      {drafts.map((draft, index) => (
        <GlassPanel intensity="card" className="p-5" key={draft.id}>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-normal text-cyan-100/70">
                待确认岗位 {index + 1}
              </p>
              <h3 className="mt-2 text-lg font-semibold text-white">
                {draft.companyName}
              </h3>
              <p className="mt-1 text-sm font-medium text-cyan-50/90">
                {draft.jobTitle}
              </p>
              <p className="mt-3 text-sm leading-6 text-white/62">
                {previewJdText(draft.jdText)}
              </p>
            </div>
            <button
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-white/16 bg-white/8 text-white/72 hover:bg-white/12"
              onClick={() => onRemove(draft.id)}
              type="button"
            >
              <Trash2 className="size-4" aria-hidden="true" />
            </button>
          </div>
        </GlassPanel>
      ))}
    </div>
  );
}
