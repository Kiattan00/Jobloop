"use client";

import { Check, Copy, Pencil, Trash2, X } from "lucide-react";
import { useState } from "react";
import type { ResumeVersion } from "@/lib/jobloop/types";

export function ResumeVersionActions({
  version,
  onSave,
  onDelete,
}: {
  version: ResumeVersion;
  onSave: (version: ResumeVersion) => void;
  onDelete: (versionId: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [draftName, setDraftName] = useState(version.name);
  const [draftDirection, setDraftDirection] = useState(version.targetDirection);
  const [draftFocus, setDraftFocus] = useState(version.rewriteFocus);
  const [draftContent, setDraftContent] = useState(version.content);

  const copyContent = async () => {
    await navigator.clipboard.writeText(draftContent);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  };

  const save = () => {
    onSave({
      ...version,
      name: draftName,
      targetDirection: draftDirection,
      rewriteFocus: draftFocus,
      content: draftContent,
      updatedAt: new Date().toISOString(),
    });
    setEditing(false);
  };

  const cancel = () => {
    setDraftName(version.name);
    setDraftDirection(version.targetDirection);
    setDraftFocus(version.rewriteFocus);
    setDraftContent(version.content);
    setEditing(false);
  };

  return editing ? (
    <div className="grid gap-3">
      <input
        className="h-10 rounded-md border border-white/18 bg-black/16 px-3 text-sm text-white outline-none focus:border-cyan-200/70"
        onChange={(event) => setDraftName(event.target.value)}
        value={draftName}
      />
      <input
        className="h-10 rounded-md border border-white/18 bg-black/16 px-3 text-sm text-white outline-none focus:border-cyan-200/70"
        onChange={(event) => setDraftDirection(event.target.value)}
        value={draftDirection}
      />
      <input
        className="h-10 rounded-md border border-white/18 bg-black/16 px-3 text-sm text-white outline-none focus:border-cyan-200/70"
        onChange={(event) => setDraftFocus(event.target.value)}
        value={draftFocus}
      />
      <textarea
        className="min-h-36 rounded-md border border-white/18 bg-black/16 p-3 text-sm leading-6 text-white outline-none focus:border-cyan-200/70"
        onChange={(event) => setDraftContent(event.target.value)}
        value={draftContent}
      />
      <div className="flex flex-wrap gap-2">
        <button
          className="inline-flex h-9 items-center gap-2 rounded-md border border-cyan-200/60 bg-cyan-300/15 px-3 text-sm font-semibold text-cyan-50"
          onClick={save}
          type="button"
        >
          <Check className="size-4" aria-hidden="true" />
          保存
        </button>
        <button
          className="inline-flex h-9 items-center gap-2 rounded-md border border-white/20 bg-white/10 px-3 text-sm font-semibold text-white/78"
          onClick={cancel}
          type="button"
        >
          <X className="size-4" aria-hidden="true" />
          取消
        </button>
      </div>
    </div>
  ) : (
    <div className="flex flex-wrap gap-2">
      <button
        className="inline-flex h-9 items-center gap-2 rounded-md border border-white/20 bg-white/10 px-3 text-sm font-semibold text-white/78"
        onClick={() => setEditing(true)}
        type="button"
      >
        <Pencil className="size-4" aria-hidden="true" />
        编辑
      </button>
      <button
        className="inline-flex h-9 items-center gap-2 rounded-md border border-white/20 bg-white/10 px-3 text-sm font-semibold text-white/78"
        onClick={() => void copyContent()}
        type="button"
      >
        <Copy className="size-4" aria-hidden="true" />
        {copied ? "已复制" : "复制"}
      </button>
      <button
        className="inline-flex h-9 items-center gap-2 rounded-md border border-rose-200/30 bg-rose-400/10 px-3 text-sm font-semibold text-rose-100"
        onClick={() => onDelete(version.id)}
        type="button"
      >
        <Trash2 className="size-4" aria-hidden="true" />
        删除
      </button>
    </div>
  );
}
