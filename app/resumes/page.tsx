"use client";

import { Plus, X } from "lucide-react";
import { useEffect, useState } from "react";
import { JobLoopShell } from "@/components/jobloop/jobloop-shell";
import {
  ActionLink,
  EmptyState,
  PageHeader,
} from "@/components/jobloop/page-chrome";
import { ResumeVersionCard } from "@/components/jobloop/resume-version-card";
import { createManualResumeVersion } from "@/lib/jobloop/generators";
import {
  deleteResumeVersion,
  getJobLoopState,
  saveResumeVersions,
  updateResumeVersion,
  upsertSourceResume,
} from "@/lib/jobloop/storage";
import type { JobLoopState, ResumeVersion } from "@/lib/jobloop/types";

export default function ResumesPage() {
  const [state, setState] = useState<JobLoopState | null>(null);
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualName, setManualName] = useState("");
  const [manualDirection, setManualDirection] = useState("");
  const [manualFocus, setManualFocus] = useState("");
  const [manualContent, setManualContent] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setState(getJobLoopState());
  }, []);

  const versions = (state?.resumeVersions ?? []).slice(0, 3);
  const tailoredResumes = state?.tailoredResumes ?? [];

  const refresh = () => setState(getJobLoopState());

  const handleSave = (version: ResumeVersion) => {
    updateResumeVersion(version);
    refresh();
  };

  const handleDelete = (versionId: string) => {
    deleteResumeVersion(versionId);
    refresh();
  };

  const handleCreateManual = () => {
    if (versions.length >= 3) {
      setMessage("简历库已满");
      return;
    }

    if (
      !manualName.trim() ||
      !manualDirection.trim() ||
      !manualFocus.trim() ||
      !manualContent.trim()
    ) {
      setMessage("请完整填写新增简历信息");
      return;
    }

    const { sourceResume, resumeVersion } = createManualResumeVersion({
      name: manualName,
      targetDirection: manualDirection,
      rewriteFocus: manualFocus,
      content: manualContent,
    });

    upsertSourceResume(sourceResume);
    saveResumeVersions([resumeVersion]);
    setManualName("");
    setManualDirection("");
    setManualFocus("");
    setManualContent("");
    setShowManualForm(false);
    setMessage("已新增基础简历");
    refresh();
  };

  return (
    <JobLoopShell active="/resumes">
      <div className="grid min-h-[720px] gap-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <PageHeader
            eyebrow="Resume library"
            title="简历库"
            subtitle="最多保留 3 个基础简历版本。后续岗位分析会从这里选择推荐版本。"
          />
          <div className="flex flex-wrap gap-3">
            <button
              className="inline-flex h-10 items-center gap-2 rounded-md border border-white/24 bg-white/12 px-4 text-sm font-semibold text-white/82 hover:bg-white/18"
              onClick={() => setShowManualForm((current) => !current)}
              type="button"
            >
              {showManualForm ? (
                <X className="size-4" aria-hidden="true" />
              ) : (
                <Plus className="size-4" aria-hidden="true" />
              )}
              新增简历
            </button>
            <ActionLink href="/resumes/generate" tone="primary">
              进入生成页
            </ActionLink>
          </div>
        </div>

        {showManualForm ? (
          <div className="rounded-lg border border-white/18 bg-white/10 p-5 backdrop-blur-2xl">
            <p className="text-xs font-semibold uppercase tracking-normal text-cyan-100/70">
              Manual resume
            </p>
            <h2 className="mt-1 text-xl font-semibold text-white">
              手动新增基础简历
            </h2>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <input
                className="h-10 rounded-md border border-white/18 bg-black/16 px-3 text-sm text-white outline-none focus:border-cyan-200/70"
                onChange={(event) => setManualName(event.target.value)}
                placeholder="简历名称，例如 AI 产品版"
                value={manualName}
              />
              <input
                className="h-10 rounded-md border border-white/18 bg-black/16 px-3 text-sm text-white outline-none focus:border-cyan-200/70"
                onChange={(event) => setManualDirection(event.target.value)}
                placeholder="岗位方向，例如 AI 产品经理方向"
                value={manualDirection}
              />
              <input
                className="h-10 rounded-md border border-white/18 bg-black/16 px-3 text-sm text-white outline-none focus:border-cyan-200/70 lg:col-span-2"
                onChange={(event) => setManualFocus(event.target.value)}
                placeholder="改写重点，例如 强调 AI 功能落地、Prompt 体验、跨团队协作"
                value={manualFocus}
              />
              <textarea
                className="min-h-48 rounded-md border border-white/18 bg-black/16 p-3 text-sm leading-6 text-white outline-none focus:border-cyan-200/70 lg:col-span-2"
                onChange={(event) => setManualContent(event.target.value)}
                placeholder="直接粘贴你的基础简历内容"
                value={manualContent}
              />
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                className="inline-flex h-10 items-center rounded-md border border-cyan-200/70 bg-cyan-300/18 px-4 text-sm font-semibold text-cyan-50"
                onClick={handleCreateManual}
                type="button"
              >
                保存到简历库
              </button>
              <p className="self-center text-sm text-white/56">
                当前已保存 {versions.length}/3 个基础简历
              </p>
            </div>
          </div>
        ) : null}

        {message ? (
          <p className="rounded-md border border-white/18 bg-white/10 p-3 text-sm text-white/78">
            {message}
          </p>
        ) : null}

        {versions.length === 0 ? (
          <EmptyState
            actionHref="/resumes/generate"
            actionLabel="生成基础简历"
            description="先粘贴一份原始简历，让 JobLoop 针对单一目标岗位生成 1 个定向基础版本。"
            title="还没有保存的基础简历版本"
          />
        ) : (
          <div className="grid gap-4 lg:grid-cols-3">
            {versions.map((version) => (
              <ResumeVersionCard
                key={version.id}
                onDelete={handleDelete}
                onSave={handleSave}
                version={version}
              />
            ))}
          </div>
        )}

        {tailoredResumes.length > 0 ? (
          <div className="rounded-lg border border-white/18 bg-white/10 p-5 backdrop-blur-2xl">
            <p className="text-xs font-semibold uppercase tracking-normal text-cyan-100/70">
              Tailored resumes
            </p>
            <h2 className="mt-1 text-xl font-semibold text-white">
              岗位微调版本
            </h2>
            <div className="mt-4 grid gap-3">
              {tailoredResumes.map((resume) => {
                const job = state?.jobs.find(
                  (item) => item.id === resume.jobId,
                );
                const source = state?.resumeVersions.find(
                  (version) => version.id === resume.sourceResumeVersionId,
                );
                return (
                  <div
                    className="rounded-md border border-white/14 bg-black/12 p-4 text-sm leading-6 text-white/62"
                    key={resume.id}
                  >
                    <p className="font-semibold text-white">{resume.title}</p>
                    <p>
                      来源岗位：
                      {job ? `${job.companyName} / ${job.jobTitle}` : "未找到"}
                    </p>
                    <p>来源基础简历：{source?.name ?? "未找到"}</p>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>
    </JobLoopShell>
  );
}
