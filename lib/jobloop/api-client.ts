"use client";

export async function readApiJson<T>(response: Response): Promise<T> {
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return (await response.json()) as T;
  }

  const text = await response.text();
  const preview = text.replace(/\s+/g, " ").trim().slice(0, 160);

  throw new Error(
    `接口返回了非 JSON 响应（HTTP ${response.status}）。${preview ? `响应开头：${preview}` : "请查看部署日志。"}`,
  );
}
