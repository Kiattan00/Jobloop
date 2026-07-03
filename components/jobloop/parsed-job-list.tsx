import type { ParsedJdDraft } from "@/lib/jobloop/jd-parser";
import { CompanyInfoPanel } from "./company-info-panel";
import { GlassPanel } from "./glass-panel";

export function ParsedJobList({
  drafts,
  onChange,
}: {
  drafts: ParsedJdDraft[];
  onChange: (drafts: ParsedJdDraft[]) => void;
}) {
  const updateDraft = (id: string, patch: Partial<ParsedJdDraft>) => {
    onChange(
      drafts.map((draft) => (draft.id === id ? { ...draft, ...patch } : draft)),
    );
  };

  if (drafts.length === 0) {
    return (
      <GlassPanel intensity="card" className="p-5 text-sm text-white/58">
        解析后会在这里展示岗位卡片，你可以在生成分析前修正公司、职位和公司补充信息。
      </GlassPanel>
    );
  }

  return (
    <div className="grid gap-4">
      {drafts.map((draft, index) => (
        <GlassPanel intensity="card" className="p-5" key={draft.id}>
          <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-normal text-cyan-100/70">
                Parsed job {index + 1}
              </p>
              <input
                className="mt-3 h-10 w-full rounded-md border border-white/18 bg-black/16 px-3 text-sm font-semibold text-white outline-none focus:border-cyan-200/70"
                onChange={(event) =>
                  updateDraft(draft.id, { companyName: event.target.value })
                }
                value={draft.companyName}
              />
              <input
                className="mt-3 h-10 w-full rounded-md border border-white/18 bg-black/16 px-3 text-sm text-white outline-none focus:border-cyan-200/70"
                onChange={(event) =>
                  updateDraft(draft.id, { jobTitle: event.target.value })
                }
                value={draft.jobTitle}
              />
              <input
                className="mt-3 h-10 w-full rounded-md border border-white/18 bg-black/16 px-3 text-sm text-white/78 outline-none placeholder:text-white/35 focus:border-cyan-200/70"
                onChange={(event) =>
                  updateDraft(draft.id, { jobUrl: event.target.value })
                }
                placeholder="岗位链接，可选"
                value={draft.jobUrl ?? ""}
              />
              <p className="mt-3 line-clamp-4 text-xs leading-5 text-white/48">
                {draft.jdText}
              </p>
            </div>
            <CompanyInfoPanel
              compact
              onChange={(value) =>
                updateDraft(draft.id, { companyInfo: value })
              }
              value={draft.companyInfo}
            />
          </div>
        </GlassPanel>
      ))}
    </div>
  );
}
