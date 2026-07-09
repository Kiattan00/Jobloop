"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { JobLoopShell } from "@/components/jobloop/jobloop-shell";
import { getJobLoopState } from "@/lib/jobloop/storage";
import { fetchWithSupabaseAuth } from "@/lib/jobloop/supabase-browser";
import type { SourceResume } from "@/lib/jobloop/types";

function dataUrlToBlob(dataUrl: string) {
  const [meta, payload] = dataUrl.split(",", 2);
  if (!meta || !payload) {
    throw new Error("Invalid data URL");
  }

  const mime = meta.match(/data:(.*?);base64/u)?.[1] || "application/pdf";
  const binary = atob(payload);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return new Blob([bytes], { type: mime });
}

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
        if (source.fileUrl?.startsWith("data:application/pdf")) {
          objectUrl = URL.createObjectURL(dataUrlToBlob(source.fileUrl));
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
          const data = (await response.json()) as {
            signedUrl?: string;
            error?: string;
          };

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
