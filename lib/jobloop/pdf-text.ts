import "server-only";

import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import * as pdfjsWorker from "pdfjs-dist/legacy/build/pdf.worker.mjs";

type PdfJsWorkerGlobal = typeof globalThis & {
  pdfjsWorker?: typeof pdfjsWorker;
};

(globalThis as PdfJsWorkerGlobal).pdfjsWorker ??= pdfjsWorker;

type PdfTextItem = {
  str: string;
  transform: number[];
  width: number;
  height: number;
};

const Y_TOLERANCE = 1;
const PARAGRAPH_GAP_RATIO = 1.8;

const BULLET_PATTERN = /(?:^|\s)([•●◆◇▪▸►▹·])\s{1,4}/g;
const NUMBERED_PATTERN = /(?:^|\s)(\d{1,2}[.)])\s{1,3}/g;
const DASH_BULLET = /(?:^|\s)(-)\s{2,}/g;

function splitBulletLines(text: string) {
  if (!text) return text;

  let result = text;

  result = result.replace(BULLET_PATTERN, (match, bullet) => {
    return "\n" + bullet + " ";
  });

  result = result.replace(NUMBERED_PATTERN, (match, num) => {
    return "\n" + num + " ";
  });

  result = result.replace(DASH_BULLET, (match) => {
    return "\n" + match.trim() + " ";
  });

  return result
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n");
}

function buildLinesFromItems(items: PdfTextItem[]) {
  const byLine = new Map<number, { x: number; str: string }[]>();

  for (const item of items) {
    if (!item.str) continue;
    const y = item.transform[5];
    const x = item.transform[4];

    let key: number | null = null;
    for (const existing of byLine.keys()) {
      if (Math.abs(existing - y) <= Y_TOLERANCE) {
        key = existing;
        break;
      }
    }

    if (key === null) key = y;

    const line = byLine.get(key) ?? [];
    line.push({ x, str: item.str });
    if (!byLine.has(key)) byLine.set(key, line);
  }

  const sortedYs = [...byLine.keys()].sort((a, b) => b - a);
  const gapThreshold = computeParagraphGap(sortedYs);
  const lines: string[] = [];

  for (let i = 0; i < sortedYs.length; i += 1) {
    const y = sortedYs[i];
    const items = byLine.get(y) ?? [];
    const lineText = items
      .sort((a, b) => a.x - b.x)
      .map((item) => item.str)
      .join(" ")
      .trim();

    if (!lineText) continue;

    if (i > 0 && gapThreshold !== null) {
      const prevY = sortedYs[i - 1];
      if (prevY - y > gapThreshold) {
        lines.push("");
      }
    }

    lines.push(lineText);
  }

  return splitBulletLines(lines.join("\n"));
}

function computeParagraphGap(sortedYs: number[]) {
  if (sortedYs.length < 2) return null;
  const gaps = sortedYs
    .slice(1)
    .map((y, i) => sortedYs[i] - y)
    .filter((g) => g > 0)
    .sort((a, b) => a - b);

  if (gaps.length === 0) return null;

  const median = gaps[Math.floor(gaps.length / 2)];
  return Math.max(median * PARAGRAPH_GAP_RATIO, median + 4);
}

export async function extractPdfText(buffer: ArrayBuffer) {
  const task = getDocument({
    data: new Uint8Array(buffer),
    useWorkerFetch: false,
    isEvalSupported: false,
    disableFontFace: true,
  });

  const pdf = await task.promise;

  try {
    const pageTexts: string[] = [];

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const textContent = await page.getTextContent();
      const pageText = buildLinesFromItems(textContent.items as PdfTextItem[]);

      pageTexts.push(pageText);
      page.cleanup();
    }

    const metadata = await pdf.getMetadata().catch(() => null);
    const rawTitle =
      metadata &&
      "info" in metadata &&
      metadata.info &&
      typeof metadata.info === "object" &&
      "Title" in metadata.info &&
      typeof metadata.info.Title === "string"
        ? metadata.info.Title
        : "";

    return {
      text: pageTexts.join("\n\n").trim(),
      totalPages: pdf.numPages,
      title: rawTitle.trim(),
    };
  } finally {
    await pdf.destroy();
  }
}
