import "server-only";

import { createClient } from "@supabase/supabase-js";
import {
  hasSupabaseServerEnv,
  SUPABASE_RESUME_BUCKET,
} from "./supabase-config";
import type { AiOutput } from "./types";

function getRequiredEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !publishableKey) {
    throw new Error("Supabase server env is incomplete");
  }

  return { url, publishableKey };
}

function decodeJwtPayload(accessToken: string) {
  const segments = accessToken.split(".");
  if (segments.length < 2) {
    throw new Error("Invalid Supabase access token");
  }

  const payload = segments[1];
  if (!payload) {
    throw new Error("Invalid Supabase access token payload");
  }

  const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4;
  const padded =
    padding === 0
      ? normalized
      : normalized.padEnd(normalized.length + (4 - padding), "=");

  return JSON.parse(Buffer.from(padded, "base64").toString("utf8")) as {
    sub?: string;
  };
}

function createUserClient(accessToken: string) {
  const { url, publishableKey } = getRequiredEnv();
  return createClient(url, publishableKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });
}

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]+/g, "-");
}

export function isSupabaseServerEnabled() {
  return hasSupabaseServerEnv();
}

export function getSupabaseAccessTokenFromRequest(request: Request) {
  const token = request.headers.get("x-jobloop-supabase-token")?.trim();
  return token || null;
}

export function getSupabaseUserIdFromAccessToken(accessToken: string) {
  const payload = decodeJwtPayload(accessToken);
  if (!payload.sub) {
    throw new Error("Supabase access token is missing sub claim");
  }

  return payload.sub;
}

export async function uploadResumePdfForUser(params: {
  accessToken: string;
  file: File;
  pageCount: number;
  extractedText: string;
}) {
  const { accessToken, file, pageCount, extractedText } = params;
  const userId = getSupabaseUserIdFromAccessToken(accessToken);
  const serviceClient = createUserClient(accessToken);
  const storagePath = `${userId}/${Date.now()}-${sanitizeFileName(file.name)}`;

  const { error: uploadError } = await serviceClient.storage
    .from(SUPABASE_RESUME_BUCKET)
    .upload(storagePath, file, {
      contentType: file.type || "application/pdf",
      upsert: false,
    });

  if (uploadError) {
    throw uploadError;
  }

  const { data, error } = await serviceClient
    .from("resume_sources")
    .insert({
      user_id: userId,
      source_type: "pdf",
      original_text: extractedText,
      pdf_file_name: file.name,
      pdf_storage_path: storagePath,
      pdf_page_count: pageCount,
    })
    .select("id, pdf_storage_path")
    .single();

  if (error || !data) {
    throw error || new Error("Failed to insert resume_sources row");
  }

  return {
    sourceRecordId: data.id as string,
    pdfStoragePath: data.pdf_storage_path as string,
    userId,
  };
}

export async function createSignedResumePdfUrl(params: {
  accessToken: string;
  sourceRecordId: string;
  expiresIn?: number;
}) {
  const { accessToken, sourceRecordId, expiresIn = 60 * 10 } = params;
  const userId = getSupabaseUserIdFromAccessToken(accessToken);
  const serviceClient = createUserClient(accessToken);

  const { data: row, error: queryError } = await serviceClient
    .from("resume_sources")
    .select("pdf_storage_path")
    .eq("id", sourceRecordId)
    .eq("user_id", userId)
    .single();

  if (queryError || !row?.pdf_storage_path) {
    throw queryError || new Error("Resume source not found");
  }

  const { data, error } = await serviceClient.storage
    .from(SUPABASE_RESUME_BUCKET)
    .createSignedUrl(row.pdf_storage_path, expiresIn);

  if (error || !data?.signedUrl) {
    throw error || new Error("Failed to create signed URL");
  }

  return {
    signedUrl: data.signedUrl,
    userId,
  };
}

export async function logAiRunForUser(params: {
  accessToken: string;
  aiOutput: AiOutput;
}) {
  const { accessToken, aiOutput } = params;
  const userId = getSupabaseUserIdFromAccessToken(accessToken);
  const serviceClient = createUserClient(accessToken);
  const timestamp = new Date().toISOString();

  const { error } = await serviceClient.from("ai_run_logs").upsert(
    {
      user_id: userId,
      local_ai_output_id: aiOutput.id,
      task_type: aiOutput.type,
      provider: aiOutput.provider || null,
      model: aiOutput.model || null,
      source_resume_id: aiOutput.sourceResumeId || null,
      resume_version_ids: aiOutput.resumeVersionIds,
      job_ids: aiOutput.jobIds,
      input_summary: aiOutput.inputSummary,
      output_ref_id: aiOutput.outputRefId,
      updated_at: timestamp,
    },
    { onConflict: "user_id,local_ai_output_id" },
  );

  if (error) {
    throw error;
  }

  return { userId };
}
