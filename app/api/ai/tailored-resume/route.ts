import { NextResponse } from "next/server";
import { maybeLogAiRun } from "@/lib/jobloop/ai-run-log";
import { createTailoredResumeAiOutput } from "@/lib/jobloop/generators";
import { generateTailoredResumeWithAi } from "@/lib/jobloop/server-ai-jobs";
import type {
  JobDetailAnalysis,
  JobJd,
  ResumeVersion,
} from "@/lib/jobloop/types";

export async function POST(request: Request) {
  try {
    const {
      job,
      resumeVersion,
      detail,
    }: {
      job: JobJd;
      resumeVersion: ResumeVersion;
      detail?: JobDetailAnalysis;
    } = await request.json();

    const { tailoredResume, model } = await generateTailoredResumeWithAi(
      job,
      resumeVersion,
      detail,
    );

    const aiOutput = createTailoredResumeAiOutput(tailoredResume, model);

    await maybeLogAiRun(request, aiOutput);

    return NextResponse.json({
      tailoredResume,
      aiOutput,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate tailored resume",
      },
      { status: 500 },
    );
  }
}
