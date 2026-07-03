import { NextResponse } from "next/server";
import { createBatchAnalysisAiOutput } from "@/lib/jobloop/generators";
import { generateBatchAnalysisWithAi } from "@/lib/jobloop/server-ai-jobs";
import type { JobJd, ResumeVersion } from "@/lib/jobloop/types";

export async function POST(request: Request) {
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

    const {
      analyses,
      jobs: enrichedJobs,
      model,
    } = await generateBatchAnalysisWithAi(jobs, resumeVersions);

    return NextResponse.json({
      results: analyses,
      jobs: enrichedJobs,
      aiOutput: createBatchAnalysisAiOutput(
        batchId,
        enrichedJobs,
        analyses,
        model,
      ),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate batch analysis",
      },
      { status: 500 },
    );
  }
}
