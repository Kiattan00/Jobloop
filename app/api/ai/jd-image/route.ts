import { NextResponse } from "next/server";
import { extractJdFromImageWithAi } from "@/lib/jobloop/server-ai-jobs";

export const runtime = "nodejs";
export const maxDuration = 120;

const MAX_FILES = 5;
const MAX_IMAGE_SIZE = 6 * 1024 * 1024;
const SUPPORTED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

function getImageDataUrl(file: File, buffer: Buffer) {
  return `data:${file.type};base64,${buffer.toString("base64")}`;
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const files = formData
      .getAll("files")
      .filter((item): item is File => item instanceof File)
      .slice(0, MAX_FILES);

    if (files.length === 0) {
      return NextResponse.json(
        { error: "请先选择岗位截图。" },
        { status: 400 },
      );
    }

    const items = [];

    for (const file of files) {
      if (!SUPPORTED_IMAGE_TYPES.has(file.type)) {
        throw new Error("仅支持 JPG、PNG 或 WebP 岗位截图。");
      }

      if (file.size > MAX_IMAGE_SIZE) {
        throw new Error("单张图片不能超过 6MB。");
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const extracted = await extractJdFromImageWithAi({
        fileName: file.name,
        imageDataUrl: getImageDataUrl(file, buffer),
      });

      items.push({
        fileName: file.name,
        ...extracted,
      });
    }

    return NextResponse.json({ items });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "岗位截图识别失败，请稍后重试。",
      },
      { status: 500 },
    );
  }
}
