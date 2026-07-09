import { NextResponse } from "next/server";
import { enrichJobWithAi } from "@/lib/jobloop/server-ai-jobs";
import { createServerTrace } from "@/lib/jobloop/server-trace";
import type { JobJd } from "@/lib/jobloop/types";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  const trace = createServerTrace("job-enrich-route");

  try {
    const { job }: { job: JobJd } = await request.json();
    const { job: enrichedJob, model } = await enrichJobWithAi(job, trace);

    trace.finish({
      jobId: job.id,
      model,
    });

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
