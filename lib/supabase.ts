import { createClient } from "@supabase/supabase-js";

const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!envUrl || !anonKey) {
  throw new Error(
    "缺少 NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY，请检查 .env.local",
  );
}

export const SUPABASE_PROXY_PATH = "/sb";

function resolveBaseUrl(fallback: string): string {
  if (typeof window !== "undefined") {
    return `${window.location.origin}${SUPABASE_PROXY_PATH}`;
  }
  return fallback;
}

export const SUPABASE_URL = resolveBaseUrl(envUrl);
export const SUPABASE_ANON_KEY = anonKey;

const projectRef = new URL(envUrl).hostname.split(".")[0];

export const supabase = createClient(SUPABASE_URL, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storageKey: `sb-${projectRef}-auth-token`,
  },
});

export function mediaUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const marker = "/storage/v1/";
  const index = url.indexOf(marker);
  if (index === -1) return url;
  return `${SUPABASE_PROXY_PATH}${url.slice(index)}`;
}
