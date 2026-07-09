import { NextResponse } from "next/server";
import { maybeLogAiRun } from "@/lib/jobloop/ai-run-log";
import { createBatchAnalysisAiOutput } from "@/lib/jobloop/generators";
import { scoreJobWithAi } from "@/lib/jobloop/server-ai-jobs";
import { createServerTrace } from "@/lib/jobloop/server-trace";
import type { JobJd, ResumeVersion } from "@/lib/jobloop/types";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: Request) {
  const trace = createServerTrace("job-score-route");

  try {
    const {
      batchId,
      job,
      resumeVersions,
    }: {
      batchId: string;
      job: JobJd;
      resumeVersions: ResumeVersion[];
    } = await request.json();

    const { result, model } = await scoreJobWithAi(job, resumeVersions, trace);

    trace.finish({
      jobId: job.id,
      model,
    });

    const aiOutput = createBatchAnalysisAiOutput(
      batchId,
      [job],
      [result],
      model,
    );

    await maybeLogAiRun(request, aiOutput);

    return NextResponse.json({
      result,
      aiOutput,
      traceId: trace.id,
    });
  } catch (error) {
    trace.fail("request:failed", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "岗位评分失败，请稍后重试。",
        traceId: trace.id,
      },
      { status: 500 },
    );
  }
}
