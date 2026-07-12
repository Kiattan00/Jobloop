import { NextResponse } from "next/server";
import { extractJdFromUrlWithAi } from "@/lib/jobloop/server-ai-jobs";

export const runtime = "nodejs";
export const maxDuration = 120;

function parseHttpUrl(value: string) {
  try {
    const url = new URL(value.trim());
    if (!["http:", "https:"].includes(url.protocol)) {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  try {
    const { url }: { url?: string } = await request.json();
    const normalizedUrl = parseHttpUrl(url || "");

    if (!normalizedUrl) {
      return NextResponse.json(
        { error: "请输入有效的 http 或 https 岗位链接。" },
        { status: 400 },
      );
    }

    const result = await extractJdFromUrlWithAi(normalizedUrl);

    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "岗位链接识别失败，请稍后重试。";
    const isNetworkError =
      message.includes("fetch failed") ||
      message.includes("ECONNRESET") ||
      message.includes("socket") ||
      message.includes("timed out");

    return NextResponse.json(
      {
        error: isNetworkError
          ? "岗位链接识别暂时无法联网读取。可以稍后重试，或直接上传岗位截图/粘贴 JD 正文。"
          : message,
      },
      { status: 500 },
    );
  }
}
