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
import { readApiJson } from "@/lib/jobloop/api-client";
import {
  createImportedResumeAsset,
  createManualResumeVersion,
} from "@/lib/jobloop/generators";
import {
  createLocalPdfFileUrl,
  saveLocalResumePdf,
} from "@/lib/jobloop/pdf-local-storage";
import {
  deleteResumeVersion,
  getJobLoopState,
  hasPersistedJobLoopState,
  saveResumeVersions,
  updateResumeVersion,
  upsertSourceResume,
} from "@/lib/jobloop/storage";
import {
  fetchWithSupabaseAuth,
  isSupabaseEnabledInBrowser,
} from "@/lib/jobloop/supabase-browser";
import type { JobLoopState, ResumeVersion } from "@/lib/jobloop/types";

export default function ResumesPage() {
  const [state, setState] = useState<JobLoopState | null>(null);
  const [demoMode, setDemoMode] = useState(false);
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualName, setManualName] = useState("");
  const [manualDirection, setManualDirection] = useState("");
  const [manualFocus, setManualFocus] = useState("");
  const [manualContent, setManualContent] = useState("");
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadInputKey, setUploadInputKey] = useState(0);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setState(getJobLoopState());
    setDemoMode(!hasPersistedJobLoopState());
  }, []);

  const versions = (state?.resumeVersions ?? []).slice(0, 3);
  const tailoredResumes = state?.tailoredResumes ?? [];
  const realVersionCount = demoMode ? 0 : (state?.resumeVersions.length ?? 0);

  const refresh = () => {
    setState(getJobLoopState());
    setDemoMode(!hasPersistedJobLoopState());
  };

  const handleSave = (version: ResumeVersion) => {
    updateResumeVersion(version);
    refresh();
  };

  const handleDelete = (versionId: string) => {
    deleteResumeVersion(versionId);
    refresh();
  };

  const handleCreateManual = () => {
    if (realVersionCount >= 3) {
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

  const handleUploadPdf = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (realVersionCount >= 3) {
      setMessage("简历库已满");
      setUploadInputKey((current) => current + 1);
      return;
    }

    setUploading(true);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.set("file", file);

      const response = await fetchWithSupabaseAuth("/api/resumes/upload-pdf", {
        method: "POST",
        body: formData,
      });
      const data = await readApiJson<{
        extractedText?: string;
        detectedTitle?: string;
        fileName?: string;
        sourceRecordId?: string;
        pdfStoragePath?: string;
        totalPages?: number;
        error?: string;
      }>(response);

      if (!response.ok || !data.extractedText) {
        throw new Error(data.error || "PDF 识别失败，请稍后重试。");
      }

      const canUseSupabasePdf =
        Boolean(data.sourceRecordId) && isSupabaseEnabledInBrowser();
      const { sourceResume, resumeVersion } = createImportedResumeAsset({
        title: uploadTitle.trim() || data.detectedTitle || "PDF 简历",
        content: data.extractedText,
        sourceType: "pdf",
        fileName: data.fileName || file.name,
        sourceRecordId: data.sourceRecordId,
        pdfStoragePath: data.pdfStoragePath,
        pdfPageCount: data.totalPages,
        extractionStatus: "success",
      });

      if (!canUseSupabasePdf) {
        await saveLocalResumePdf(sourceResume.id, file);
        sourceResume.fileUrl = createLocalPdfFileUrl(sourceResume.id);
      }

      upsertSourceResume(sourceResume);
      saveResumeVersions([resumeVersion]);
      setUploadTitle("");
      setUploadInputKey((current) => current + 1);
      setMessage("已从 PDF 提取文本并保存到简历库");
      refresh();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "PDF 识别失败，请稍后重试。",
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <JobLoopShell active="/resumes">
      <div className="grid min-h-[720px] gap-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <PageHeader
            eyebrow="Resume library"
            title="简历库"
            subtitle="支持粘贴文本或上传文本型 PDF。系统会把识别出的正文沉淀为简历卡片，后续岗位分析直接读取这里的文字内容。"
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
              {showManualForm ? "收起文本录入" : "粘贴文本"}
            </button>
            <ActionLink href="/resumes/generate" tone="primary">
              查看 AI 生成页
            </ActionLink>
          </div>
        </div>

        {demoMode ? (
          <div className="rounded-lg border border-cyan-200/35 bg-cyan-300/10 p-4 text-sm text-cyan-50">
            当前展示的是预设示例内容，方便你先体验页面结构。只要你粘贴或上传真实简历，这里就会切换成你的数据。
          </div>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
          <div className="rounded-lg border border-white/18 bg-white/10 p-5 backdrop-blur-2xl">
            <p className="text-xs font-semibold uppercase tracking-normal text-cyan-100/70">
              PDF import
            </p>
            <h2 className="mt-1 text-xl font-semibold text-white">
              上传文本型 PDF
            </h2>
            <p className="mt-2 text-sm leading-6 text-white/60">
              当前版本会提取 PDF 自带的文字层，生成可编辑的简历卡片，并保留
              “查看 PDF” 入口。扫描件与 OCR 暂不在本轮范围内。
            </p>
            <div className="mt-4 grid gap-4">
              <input
                className="h-10 rounded-md border border-white/18 bg-black/16 px-3 text-sm text-white outline-none focus:border-cyan-200/70"
                onChange={(event) => setUploadTitle(event.target.value)}
                placeholder="可选：自定义卡片名，例如 AI 产品经理原始简历"
                value={uploadTitle}
              />
              <input
                accept="application/pdf"
                className="block w-full text-sm text-white/72 file:mr-4 file:rounded-md file:border-0 file:bg-cyan-300/18 file:px-4 file:py-2 file:font-semibold file:text-cyan-50"
                disabled={uploading}
                key={uploadInputKey}
                onChange={(event) => void handleUploadPdf(event)}
                type="file"
              />
              <p className="text-sm text-white/54">
                当前已保存 {realVersionCount}/3 个真实基础简历版本
              </p>
            </div>
          </div>

          <div className="rounded-lg border border-white/18 bg-white/10 p-5 backdrop-blur-2xl">
            <p className="text-xs font-semibold uppercase tracking-normal text-cyan-100/70">
              Paste text
            </p>
            <h2 className="mt-1 text-xl font-semibold text-white">
              粘贴文本或整理后的简历
            </h2>
            <p className="mt-2 text-sm leading-6 text-white/60">
              如果你已经有文本版简历，直接粘贴保存即可。后续岗位分析会优先读取这里的正文，而不是重新解析文件。
            </p>
            <div className="mt-4">
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
                {showManualForm ? "收起表单" : "粘贴并创建卡片"}
              </button>
            </div>
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
                当前已保存 {realVersionCount}/3 个真实基础简历
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
            actionLabel="查看 AI 生成页"
            description="先粘贴一份原始简历，或直接上传文本型 PDF，让 JobLoop 生成可编辑的简历卡片。"
            title="还没有可用于分析的基础简历"
          />
        ) : (
          <div className="grid gap-4 lg:grid-cols-3">
            {versions.map((version) => (
              <ResumeVersionCard
                key={version.id}
                onDelete={handleDelete}
                onSave={handleSave}
                readOnly={demoMode}
                sourceResume={state?.sourceResumes.find(
                  (item) => item.id === version.sourceResumeId,
                )}
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
