"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  getSupabaseBrowserEnv,
  hasSupabaseBrowserEnv,
} from "./supabase-config";

let browserClient: SupabaseClient | null = null;

function getBrowserClient() {
  if (!hasSupabaseBrowserEnv()) {
    return null;
  }

  if (!browserClient) {
    const { url, publishableKey } = getSupabaseBrowserEnv();
    if (!url || !publishableKey) {
      return null;
    }

    browserClient = createClient(url, publishableKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
      },
    });
  }

  return browserClient;
}

export function isSupabaseEnabledInBrowser() {
  return hasSupabaseBrowserEnv();
}

export async function ensureSupabaseAnonymousSession() {
  const client = getBrowserClient();
  if (!client) {
    return null;
  }

  const {
    data: { session },
  } = await client.auth.getSession();

  if (session?.access_token) {
    return session;
  }

  try {
    const { data, error } = await client.auth.signInAnonymously();
    if (error) {
      throw error;
    }

    return data.session;
  } catch (error) {
    console.error("Failed to sign in anonymously with Supabase", error);
    return null;
  }
}

export async function getSupabaseAccessToken() {
  const session = await ensureSupabaseAnonymousSession();
  return session?.access_token ?? null;
}

export async function fetchWithSupabaseAuth(
  input: RequestInfo | URL,
  init: RequestInit = {},
) {
  const token = await getSupabaseAccessToken();
  const headers = new Headers(init.headers);

  if (token) {
    headers.set("x-jobloop-supabase-token", token);
  }

  return fetch(input, {
    ...init,
    headers,
  });
}
