"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { GlassPanel } from "@/components/jobloop/glass-panel";
import { JobLoopShell } from "@/components/jobloop/jobloop-shell";
import {
  ActionLink,
  PageHeader,
  SectionTitle,
} from "@/components/jobloop/page-chrome";
import { ResumeSourceForm } from "@/components/jobloop/resume-source-form";
import { ResumeVersionConfirmation } from "@/components/jobloop/resume-version-confirmation";
import { ResumeVersionDraftCard } from "@/components/jobloop/resume-version-draft-card";
import { readApiJson } from "@/lib/jobloop/api-client";
import {
  createResumeVersionsAiOutput,
  createSourceResume,
} from "@/lib/jobloop/generators";
import { sampleSourceResume } from "@/lib/jobloop/seed-data";
import {
  getJobLoopState,
  saveResumeVersions,
  upsertSourceResume,
} from "@/lib/jobloop/storage";
import { fetchWithSupabaseAuth } from "@/lib/jobloop/supabase-browser";
import type {
  AiOutput,
  ResumeVersion,
  SourceResume,
} from "@/lib/jobloop/types";

export default function GenerateResumesPage() {
  const [content, setContent] = useState(sampleSourceResume);
  const [targetIntent, setTargetIntent] = useState("政务售前工程师");
  const [sourceResume, setSourceResume] = useState<SourceResume | null>(null);
  const [drafts, setDrafts] = useState<ResumeVersion[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [savedCount, setSavedCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedModel, setGeneratedModel] = useState<string | undefined>();

  useEffect(() => {
    try {
      const latestSourceResume = getJobLoopState().sourceResumes[0];
      if (latestSourceResume?.content) {
        setContent(latestSourceResume.content);
      }
      if (latestSourceResume?.targetIntent) {
        setTargetIntent(latestSourceResume.targetIntent);
      }
    } catch (storageError) {
      console.error("Failed to restore latest source resume", storageError);
    }
  }, []);

  const handleGenerate = async () => {
    try {
      const targetItems = targetIntent
        .split(/[\n,，、;；]/)
        .map((item) => item.trim())
        .filter(Boolean);

      if (targetItems.length !== 1) {
        setError("单次生成仅支持 1 个目标岗位，请只填写一个意向岗位。");
        setDrafts([]);
        setSelectedIds([]);
        return;
      }

      const source = createSourceResume(content, targetIntent);
      upsertSourceResume(source);
      setSourceResume(source);
      setSavedCount(0);
      setLoading(true);
      setError(null);

      const response = await fetchWithSupabaseAuth("/api/ai/resume-versions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ sourceResume: source }),
      });
      const data = await readApiJson<{
        versions?: ResumeVersion[];
        aiOutput?: AiOutput;
        error?: string;
      }>(response);

      if (!response.ok || !data.versions) {
        throw new Error(data.error || "生成失败，请稍后重试。");
      }

      setDrafts(data.versions);
      setSelectedIds(data.versions.map((version) => version.id));
      setGeneratedModel(data.aiOutput?.model);
    } catch (requestError) {
      console.error("Failed to generate resume", requestError);
      setError(
        requestError instanceof Error
          ? requestError.message
          : "生成失败，请稍后重试。",
      );
      setDrafts([]);
      setSelectedIds([]);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (id: string) => {
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  };

  const handleConfirm = () => {
    if (!sourceResume) {
      return;
    }
    const selected = drafts
      .filter((draft) => selectedIds.includes(draft.id))
      .map((draft) => ({ ...draft, status: "saved" as const }));

    const existingSavedCount = getJobLoopState().resumeVersions.length;
    if (existingSavedCount >= 3 || existingSavedCount + selected.length > 3) {
      setError("简历库已满");
      return;
    }

    saveResumeVersions(
      selected,
      createResumeVersionsAiOutput(sourceResume, selected, generatedModel),
    );
    setSavedCount(selected.length);
    setError(null);
  };

  return (
    <JobLoopShell active="/resumes">
      <div className="grid gap-6">
        <Link
          className="text-sm font-semibold text-cyan-100/80 hover:text-cyan-50"
          href="/resumes"
        >
          ← 返回简历库
        </Link>

        <div className="grid gap-5 lg:grid-cols-[0.95fr_1.25fr]">
          <GlassPanel className="p-6 lg:p-8">
            <PageHeader
              eyebrow="Generate versions"
              title="从原始简历生成定向版本"
              subtitle="该入口已降级为辅助能力，适合在你需要额外参考草稿时使用。当前主流程优先推荐在简历库中直接粘贴或上传文本型 PDF。"
            />
            <div className="mt-5 rounded-lg border border-amber-200/30 bg-amber-300/10 p-4 text-sm text-amber-50">
              当前推荐主路径：先在简历库录入真实简历，再进入岗位分析。这里的 AI
              生成功能保留为补充选项，不再作为默认入口。
            </div>
            <div className="mt-6">
              <ResumeSourceForm
                onChange={setContent}
                onIntentChange={setTargetIntent}
                targetIntent={targetIntent}
                value={content}
              />
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                className="inline-flex h-10 items-center rounded-md border border-cyan-200/70 bg-cyan-300/18 px-4 text-sm font-semibold text-cyan-50 disabled:cursor-not-allowed disabled:opacity-45"
                disabled={loading}
                onClick={handleGenerate}
                type="button"
              >
                {loading ? "正在生成..." : "辅助生成 1 个定向版本"}
              </button>
              <ActionLink href="/resumes">查看简历库</ActionLink>
            </div>
            {error ? (
              <p className="mt-4 rounded-md border border-rose-200/25 bg-rose-400/10 p-3 text-sm text-rose-100">
                {error}
              </p>
            ) : null}
          </GlassPanel>

          <div className="grid gap-5">
            <GlassPanel className="p-6">
              <SectionTitle
                title="AI 生成草稿"
                subtitle="本次只生成 1 个定向版本；确认后才会进入简历库。"
              />
              {drafts.length === 0 ? (
                <p className="mt-5 rounded-lg border border-dashed border-white/24 bg-black/16 p-5 text-sm text-white/58">
                  生成后，这里会出现 1
                  个更贴近目标岗位、且尽量保留原始经历细节的定向简历草稿。
                </p>
              ) : (
                <div className="mt-5 grid gap-4">
                  {drafts.map((draft) => (
                    <ResumeVersionDraftCard
                      key={draft.id}
                      onToggle={handleToggle}
                      selected={selectedIds.includes(draft.id)}
                      version={draft}
                    />
                  ))}
                  <ResumeVersionConfirmation
                    onConfirm={handleConfirm}
                    selectedCount={selectedIds.length}
                  />
                </div>
              )}
            </GlassPanel>

            {savedCount > 0 ? (
              <GlassPanel className="border-cyan-200/50 bg-cyan-300/12 p-5">
                <p className="font-semibold text-cyan-50">
                  已保存 {savedCount} 个基础简历版本
                </p>
                <p className="mt-2 text-sm text-white/62">
                  现在可以回到简历库查看，之后岗位分析会从这些版本中推荐最合适的一版。
                </p>
              </GlassPanel>
            ) : null}
          </div>
        </div>
      </div>
    </JobLoopShell>
  );
}
