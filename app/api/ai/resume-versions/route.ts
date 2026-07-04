import { NextResponse } from "next/server";
import { createResumeVersionsAiOutput } from "@/lib/jobloop/generators";
import { generateResumeVersionsWithAi } from "@/lib/jobloop/server-ai";
import { createServerTrace } from "@/lib/jobloop/server-trace";
import type { SourceResume } from "@/lib/jobloop/types";

export async function POST(request: Request) {
  const trace = createServerTrace("resume-versions-route");

  try {
    const { sourceResume }: { sourceResume: SourceResume } =
      await request.json();
    trace.log("request:parsed", {
      contentLength: sourceResume.content.length,
      hasTargetIntent: Boolean(sourceResume.targetIntent),
      targetIntentLength: sourceResume.targetIntent?.length ?? 0,
    });
    const { versions, model } = await generateResumeVersionsWithAi(
      sourceResume,
      trace,
    );

    trace.finish({
      model,
      versionCount: versions.length,
    });

    const response = NextResponse.json({
      versions,
      aiOutput: createResumeVersionsAiOutput(sourceResume, versions, model),
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
            : "Failed to generate resume versions",
        traceId: trace.id,
      },
      { status: 500 },
    );
    response.headers.set("x-jobloop-trace-id", trace.id);

    return response;
  }
}
