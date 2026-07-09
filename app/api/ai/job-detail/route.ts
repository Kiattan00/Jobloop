import { NextResponse } from "next/server";
import { maybeLogAiRun } from "@/lib/jobloop/ai-run-log";
import { createJobDetailAiOutput } from "@/lib/jobloop/generators";
import { generateJobDetailWithAi } from "@/lib/jobloop/server-ai-jobs";
import type {
  JobAnalysisResult,
  JobJd,
  ResumeVersion,
} from "@/lib/jobloop/types";

export const maxDuration = 180;

export async function POST(request: Request) {
  try {
    const {
      job,
      result,
      resumeVersion,
    }: {
      job: JobJd;
      result: JobAnalysisResult;
      resumeVersion?: ResumeVersion;
    } = await request.json();

    const { detail, model } = await generateJobDetailWithAi(
      job,
      result,
      resumeVersion,
    );

    const aiOutput = createJobDetailAiOutput(detail, job, resumeVersion, model);

    await maybeLogAiRun(request, aiOutput);

    return NextResponse.json({
      detail,
      aiOutput,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate job detail",
      },
      { status: 500 },
    );
  }
}
