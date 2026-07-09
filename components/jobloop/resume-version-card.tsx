import type { ResumeVersion, SourceResume } from "@/lib/jobloop/types";
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
  sourceResume,
  onSave,
  onDelete,
  readOnly = false,
}: {
  version: ResumeVersion;
  sourceResume?: SourceResume;
  onSave: (version: ResumeVersion) => void;
  onDelete: (versionId: string) => void;
  readOnly?: boolean;
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

      <div className="mt-4 flex flex-wrap gap-2 text-xs">
        <span className="rounded-full border border-white/16 bg-black/16 px-3 py-1 font-semibold text-white/68">
          {sourceResume?.sourceType === "pdf" ? "PDF 导入" : "文本录入"}
        </span>
        {sourceResume?.extractionStatus === "success" ? (
          <span className="rounded-full border border-cyan-200/40 bg-cyan-300/12 px-3 py-1 font-semibold text-cyan-50">
            文本已提取
          </span>
        ) : null}
        {sourceResume?.fileName ? (
          <span className="rounded-full border border-white/16 bg-black/16 px-3 py-1 font-semibold text-white/68">
            {sourceResume.fileName}
          </span>
        ) : null}
      </div>

      <div className="mt-4 max-h-64 overflow-auto rounded-md border border-white/14 bg-black/18 p-3 text-xs leading-6 whitespace-pre-wrap text-white/62">
        {version.content}
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {sourceResume?.fileUrl ? (
          <a
            className="inline-flex h-9 items-center gap-2 rounded-md border border-white/20 bg-white/10 px-3 text-sm font-semibold text-white/78"
            href={sourceResume.fileUrl}
            rel="noreferrer"
            target="_blank"
          >
            查看 PDF
          </a>
        ) : null}
        {readOnly ? (
          <p className="self-center text-sm text-white/54">
            当前为预设示例内容，录入真实简历后会替换展示。
          </p>
        ) : (
          <div className="flex-1">
            <ResumeVersionActions
              onDelete={onDelete}
              onSave={onSave}
              version={version}
            />
          </div>
        )}
      </div>
    </GlassPanel>
  );
}
