import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export function createSupabaseServer() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "https://huwbakhlbuvkbbkxoooi.supabase.co",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh1d2Jha2hsYnV2a2Jia3hvb29pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4MjA3OTIsImV4cCI6MjA5MDM5Njc5Mn0.0kvApovu2pplzE4feeZ6F0WvMOZSS97nSs4VsCBLY5M",
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // setAll can fail in Server Components (read-only cookies).
            // This is expected — the middleware will refresh the session.
          }
        },
      },
    }
  );
}
