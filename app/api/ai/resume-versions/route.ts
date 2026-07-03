import { NextResponse } from "next/server";
import { createResumeVersionsAiOutput } from "@/lib/jobloop/generators";
import { generateResumeVersionsWithAi } from "@/lib/jobloop/server-ai";
import type { SourceResume } from "@/lib/jobloop/types";

export async function POST(request: Request) {
  try {
    const { sourceResume }: { sourceResume: SourceResume } =
      await request.json();
    const { versions, model } =
      await generateResumeVersionsWithAi(sourceResume);

    return NextResponse.json({
      versions,
      aiOutput: createResumeVersionsAiOutput(sourceResume, versions, model),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate resume versions",
      },
      { status: 500 },
    );
  }
}
