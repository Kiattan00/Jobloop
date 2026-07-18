"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { JobLoopShell } from "@/components/jobloop/jobloop-shell";
import { readApiJson } from "@/lib/jobloop/api-client";
import {
  getLocalResumePdf,
  isLocalPdfFileUrl,
} from "@/lib/jobloop/pdf-local-storage";
import { getJobLoopState } from "@/lib/jobloop/storage";
import { fetchWithSupabaseAuth } from "@/lib/jobloop/supabase-browser";
import type { SourceResume } from "@/lib/jobloop/types";

export default function ResumePdfPreviewPage() {
  const params = useParams<{ sourceId: string }>();
  const [sourceResume, setSourceResume] = useState<SourceResume | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const state = getJobLoopState();
    const source = state.sourceResumes.find(
      (item) => item.id === params.sourceId,
    );

    if (!source) {
      setError("未找到对应的 PDF 来源记录。");
      return;
    }

    setSourceResume(source);

    let objectUrl: string | null = null;

    const loadPreview = async () => {
      try {
        if (isLocalPdfFileUrl(source.fileUrl)) {
          const pdfBlob = await getLocalResumePdf(source.id);

          if (!pdfBlob) {
            throw new Error("未找到本地 PDF 文件，请重新上传一次。");
          }

          objectUrl = URL.createObjectURL(pdfBlob);
          setPreviewUrl(objectUrl);
          return;
        }

        if (source.sourceRecordId) {
          const response = await fetchWithSupabaseAuth(
            "/api/resumes/view-pdf",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                sourceRecordId: source.sourceRecordId,
              }),
            },
          );
          const data = await readApiJson<{
            signedUrl?: string;
            error?: string;
          }>(response);

          if (!response.ok || !data.signedUrl) {
            throw new Error(data.error || "生成 Supabase PDF 地址失败。");
          }

          setPreviewUrl(data.signedUrl);
          return;
        }

        throw new Error("当前记录没有可预览的 PDF 文件。");
      } catch (previewError) {
        setError(
          previewError instanceof Error
            ? previewError.message
            : "PDF 预览失败，请稍后重试。",
        );
      }
    };

    void loadPreview();

    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [params.sourceId]);

  return (
    <JobLoopShell active="/resumes">
      <div className="grid min-h-[720px] gap-5">
        <Link
          className="text-sm font-semibold text-cyan-100/80 hover:text-cyan-50"
          href="/resumes"
        >
          返回简历库
        </Link>

        <div className="rounded-lg border border-white/18 bg-white/10 p-5 backdrop-blur-2xl">
          <h1 className="text-xl font-semibold text-white">
            {sourceResume?.fileName || sourceResume?.title || "PDF 预览"}
          </h1>
          {error ? (
            <p className="mt-4 rounded-md border border-rose-200/25 bg-rose-400/10 p-3 text-sm text-rose-100">
              {error}
            </p>
          ) : null}
          {!error && !previewUrl ? (
            <p className="mt-4 text-sm text-white/70">正在加载 PDF 预览...</p>
          ) : null}
          {previewUrl ? (
            <iframe
              className="mt-4 h-[78vh] w-full rounded-md border border-white/14 bg-white"
              src={previewUrl}
              title={sourceResume?.fileName || "PDF 预览"}
            />
          ) : null}
        </div>
      </div>
    </JobLoopShell>
  );
}
