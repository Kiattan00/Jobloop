import { NextResponse } from "next/server";
import { maybeLogAiRun } from "@/lib/jobloop/ai-run-log";
import { createTimestamp } from "@/lib/jobloop/generators";
import { enrichJobWithAi } from "@/lib/jobloop/server-ai-jobs";
import { createServerTrace } from "@/lib/jobloop/server-trace";
import type { AiOutput, JobJd } from "@/lib/jobloop/types";

export const runtime = "nodejs";
export const maxDuration = 180;

export async function POST(request: Request) {
  const trace = createServerTrace("job-enrich-route");

  try {
    const { job }: { job: JobJd } = await request.json();
    const model = process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini";

    trace.log("job-enrich:start", { jobId: job.id, jobTitle: job.jobTitle });

    const { job: enrichedJob } = await enrichJobWithAi(job, trace);

    trace.finish({ jobId: job.id, model });

    const aiOutput: AiOutput = {
      id: `ai-enrich-${job.id}`,
      type: "job_enrich",
      provider: "openrouter",
      model,
      resumeVersionIds: [],
      jobIds: [job.id],
      inputSummary: `补充 ${job.companyName} / ${job.jobTitle} 的结构化 JD 与公司信息`,
      outputRefId: job.id,
      createdAt: createTimestamp(),
    };

    await maybeLogAiRun(request, aiOutput);

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
