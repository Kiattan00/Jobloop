import { NextResponse } from "next/server";
import { createBatchAnalysisAiOutput } from "@/lib/jobloop/generators";
import { generateBatchAnalysisWithAi } from "@/lib/jobloop/server-ai-jobs";
import { createServerTrace } from "@/lib/jobloop/server-trace";
import type { JobJd, ResumeVersion } from "@/lib/jobloop/types";

export async function POST(request: Request) {
  const trace = createServerTrace("batch-analysis-route");

  try {
    const {
      batchId,
      jobs,
      resumeVersions,
    }: {
      batchId: string;
      jobs: JobJd[];
      resumeVersions: ResumeVersion[];
    } = await request.json();
    trace.log("request:parsed", {
      batchId,
      jobCount: jobs.length,
      resumeVersionCount: resumeVersions.length,
    });

    const {
      analyses,
      jobs: enrichedJobs,
      model,
    } = await generateBatchAnalysisWithAi(jobs, resumeVersions, trace);

    trace.finish({
      analysisCount: analyses.length,
      enrichedJobCount: enrichedJobs.length,
      model,
    });

    const response = NextResponse.json({
      results: analyses,
      jobs: enrichedJobs,
      aiOutput: createBatchAnalysisAiOutput(
        batchId,
        enrichedJobs,
        analyses,
        model,
      ),
      traceId: trace.id,
    });
    response.headers.set("x-jobloop-trace-id", trace.id);

    return response;
  } catch (error) {
    trace.fail("request:failed", error);

    const response = NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate batch analysis",
        traceId: trace.id,
      },
      { status: 500 },
    );
    response.headers.set("x-jobloop-trace-id", trace.id);

    return response;
  }
}
