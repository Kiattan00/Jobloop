import "server-only";

import {
  getSupabaseAccessTokenFromRequest,
  isSupabaseServerEnabled,
  logAiRunForUser,
} from "./supabase-server";
import type { AiOutput } from "./types";

export async function maybeLogAiRun(request: Request, aiOutput?: AiOutput) {
  if (!aiOutput || !isSupabaseServerEnabled()) {
    return;
  }

  const accessToken = getSupabaseAccessTokenFromRequest(request);
  if (!accessToken) {
    return;
  }

  try {
    await logAiRunForUser({
      accessToken,
      taskType: aiOutput.type,
      model: aiOutput.model,
      inputSummary: aiOutput.inputSummary,
      outputRefId: aiOutput.outputRefId,
    });
  } catch (error) {
    console.error("Failed to log ai_run_logs", error);
  }
}
