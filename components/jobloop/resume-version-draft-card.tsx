import type { ResumeVersion } from "@/lib/jobloop/types";
import { GlassPanel } from "./glass-panel";

export function ResumeVersionDraftCard({
  version,
  selected,
  onToggle,
}: {
  version: ResumeVersion;
  selected: boolean;
  onToggle: (id: string) => void;
}) {
  return (
    <GlassPanel
      intensity="card"
      className={selected ? "border-cyan-200/70 p-5" : "p-5"}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-normal text-cyan-100/70">
            AI DRAFT
          </p>
          <h3 className="mt-2 text-xl font-semibold text-white">
            {version.name}
          </h3>
          <p className="mt-1 text-sm text-white/58">
            {version.targetDirection}
          </p>
        </div>
        <input
          aria-label={`选择 ${version.name}`}
          checked={selected}
          className="mt-1 size-5 accent-cyan-300"
          onChange={() => onToggle(version.id)}
          type="checkbox"
        />
      </div>
      <p className="mt-4 text-sm leading-6 text-white/68">
        {version.rewriteFocus}
      </p>
      <div className="mt-4 max-h-64 overflow-auto rounded-md border border-white/14 bg-black/18 p-3 text-xs leading-6 whitespace-pre-wrap text-white/62">
        {version.content}
      </div>
    </GlassPanel>
  );
}
