import { NextResponse } from "next/server";
import { extractPdfText } from "@/lib/jobloop/pdf-text";
import {
  getSupabaseAccessTokenFromRequest,
  isSupabaseServerEnabled,
  uploadResumePdfForUser,
} from "@/lib/jobloop/supabase-server";

export const runtime = "nodejs";
export const maxDuration = 60;

function stripPdfExtension(fileName: string) {
  return fileName.replace(/\.pdf$/iu, "").trim() || "PDF 简历";
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "请先选择 PDF 文件。" },
        { status: 400 },
      );
    }

    if (
      file.type !== "application/pdf" &&
      !file.name.toLowerCase().endsWith(".pdf")
    ) {
      return NextResponse.json(
        { error: "当前仅支持上传 PDF 文件。" },
        { status: 400 },
      );
    }

    const { text, title, totalPages } = await extractPdfText(
      await file.arrayBuffer(),
    );

    if (text.length < 20) {
      return NextResponse.json(
        {
          error:
            "未能从该 PDF 中提取到足够的文字内容。当前版本仅支持文本型 PDF。",
        },
        { status: 422 },
      );
    }

    let sourceRecordId: string | undefined;
    let pdfStoragePath: string | undefined;
    const accessToken = getSupabaseAccessTokenFromRequest(request);

    if (isSupabaseServerEnabled() && accessToken) {
      try {
        const uploaded = await uploadResumePdfForUser({
          accessToken,
          file,
          pageCount: totalPages,
          extractedText: text,
        });
        sourceRecordId = uploaded.sourceRecordId;
        pdfStoragePath = uploaded.pdfStoragePath;
      } catch (error) {
        console.error("Failed to persist PDF to Supabase", error);
      }
    }

    return NextResponse.json({
      extractedText: text,
      detectedTitle: title || stripPdfExtension(file.name),
      fileName: file.name,
      totalPages,
      sourceRecordId,
      pdfStoragePath,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "PDF 识别失败，请稍后重试。",
      },
      { status: 500 },
    );
  }
}
