import { createBrowserClient } from "@supabase/ssr";

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://huwbakhlbuvkbbkxoooi.supabase.co";

const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh1d2Jha2hsYnV2a2Jia3hvb29pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4MjA3OTIsImV4cCI6MjA5MDM5Njc5Mn0.0kvApovu2pplzE4feeZ6F0WvMOZSS97nSs4VsCBLY5M";

export function createSupabaseBrowser() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}
