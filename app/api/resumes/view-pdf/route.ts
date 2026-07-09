import { NextResponse } from "next/server";
import {
  createSignedResumePdfUrl,
  getSupabaseAccessTokenFromRequest,
  isSupabaseServerEnabled,
} from "@/lib/jobloop/supabase-server";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(request: Request) {
  if (!isSupabaseServerEnabled()) {
    return NextResponse.json(
      { error: "Supabase PDF viewing is not enabled." },
      { status: 400 },
    );
  }

  const accessToken = getSupabaseAccessTokenFromRequest(request);
  if (!accessToken) {
    return NextResponse.json(
      { error: "Missing Supabase access token." },
      { status: 401 },
    );
  }

  try {
    const { sourceRecordId }: { sourceRecordId?: string } =
      await request.json();

    if (!sourceRecordId) {
      return NextResponse.json(
        { error: "Missing sourceRecordId." },
        { status: 400 },
      );
    }

    const { signedUrl } = await createSignedResumePdfUrl({
      accessToken,
      sourceRecordId,
    });

    return NextResponse.json({ signedUrl });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to create PDF signed URL.",
      },
      { status: 500 },
    );
  }
}
