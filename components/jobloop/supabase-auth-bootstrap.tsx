"use client";

import { useEffect } from "react";
import { ensureSupabaseAnonymousSession } from "@/lib/jobloop/supabase-browser";

export function SupabaseAuthBootstrap() {
  useEffect(() => {
    void ensureSupabaseAnonymousSession().catch((error) => {
      console.error("Failed to initialize Supabase anonymous session", error);
    });
  }, []);

  return null;
}
