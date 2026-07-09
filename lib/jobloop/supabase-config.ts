export const SUPABASE_URL_ENV = "NEXT_PUBLIC_SUPABASE_URL";
export const SUPABASE_PUBLISHABLE_KEY_ENV =
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY";
export const SUPABASE_RESUME_BUCKET = "resume-pdfs";

export function getSupabaseBrowserEnv() {
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    publishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  };
}

export function hasSupabaseBrowserEnv() {
  const { url, publishableKey } = getSupabaseBrowserEnv();
  return Boolean(url && publishableKey);
}

export function getSupabaseServerEnv() {
  return getSupabaseBrowserEnv();
}

export function hasSupabaseServerEnv() {
  const { url, publishableKey } = getSupabaseServerEnv();
  return Boolean(url && publishableKey);
}
