import type { ResumeVersion } from "@/lib/jobloop/types";
import { GlassPanel } from "./glass-panel";
import { ResumeVersionActions } from "./resume-version-actions";

const formatDirectionLabel = (version: ResumeVersion) => {
  const fromName = version.name.replace(/版$/u, "").trim();
  if (fromName) {
    return fromName.endsWith("方向") ? fromName : `${fromName}方向`;
  }

  const cleaned = version.targetDirection.replace(/岗位$/u, "").trim();
  return cleaned.endsWith("方向") ? cleaned : `${cleaned}方向`;
};

export function ResumeVersionCard({
  version,
  onSave,
  onDelete,
}: {
  version: ResumeVersion;
  onSave: (version: ResumeVersion) => void;
  onDelete: (versionId: string) => void;
}) {
  return (
    <GlassPanel intensity="card" className="flex h-full flex-col p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-normal text-cyan-100/70">
            {version.status === "saved" ? "SAVED VERSION" : "DRAFT VERSION"}
          </p>
          <h3 className="mt-2 text-xl font-semibold text-white">
            {version.name}
          </h3>
          <p className="mt-1 text-sm text-white/58">
            {formatDirectionLabel(version)}
          </p>
        </div>
        <span className="rounded-full border border-cyan-200/50 bg-cyan-300/12 px-3 py-1 text-xs font-semibold text-cyan-50">
          {version.status === "saved" ? "已保存" : "草稿"}
        </span>
      </div>

      <p className="mt-4 text-sm leading-6 text-white/66">
        {version.rewriteFocus}
      </p>

      <div className="mt-4 max-h-64 overflow-auto rounded-md border border-white/14 bg-black/18 p-3 text-xs leading-6 whitespace-pre-wrap text-white/62">
        {version.content}
      </div>

      <div className="mt-5 flex-1">
        <ResumeVersionActions
          onDelete={onDelete}
          onSave={onSave}
          version={version}
        />
      </div>
    </GlassPanel>
  );
}
