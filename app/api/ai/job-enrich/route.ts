import { NextResponse } from "next/server";
import { createTimestamp } from "@/lib/jobloop/generators";
import {
  enrichCompanyOnly,
  extractStructuredJdOnly,
} from "@/lib/jobloop/server-ai-jobs";
import { createServerTrace } from "@/lib/jobloop/server-trace";
import type { JobJd } from "@/lib/jobloop/types";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: Request) {
  const trace = createServerTrace("job-enrich-route");

  try {
    const { job }: { job: JobJd } = await request.json();
    const model = process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini";

    trace.log("job-enrich:start", { jobId: job.id, jobTitle: job.jobTitle });

    // Step 1: Extract structured JD (falls back to quick extraction on error)
    const structuredJd = await extractStructuredJdOnly(job);
    trace.log("job-enrich:structured-jd:done", { jobId: job.id });

    // Step 2: Enrich company info (falls back to default on error)
    const companyResearch = await enrichCompanyOnly(job);
    trace.log("job-enrich:company-research:done", { jobId: job.id });

    const enrichedJob: JobJd = {
      ...job,
      companyName: structuredJd.companyName?.trim() || job.companyName,
      jobTitle: structuredJd.jobTitle?.trim() || job.jobTitle,
      structuredJd,
      companyResearch,
      companyInfo: companyResearch.summary,
      processingStatus: "scoring",
      processingError: undefined,
      updatedAt: createTimestamp(),
    };

    trace.finish({ jobId: job.id, model });

    return NextResponse.json({
      job: enrichedJob,
      model,
      traceId: trace.id,
    });
  } catch (error) {
    trace.fail("request:failed", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "岗位信息补充失败，请稍后重试。",
        traceId: trace.id,
      },
      { status: 500 },
    );
  }
}
