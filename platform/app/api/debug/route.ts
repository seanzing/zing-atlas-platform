import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const checks: Record<string, unknown> = {};

  // Check 1: Supabase env vars available on server
  checks.supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.slice(0, 40) + "...";
  checks.supabaseKeyPrefix = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.slice(0, 20) + "...";
  checks.databaseUrl = process.env.DATABASE_URL ? "SET" : "MISSING";

  // Check 2: Auth session
  try {
    const supabase = createSupabaseServer();
    const { data: { user }, error } = await supabase.auth.getUser();
    checks.authUser = user?.email ?? null;
    checks.authError = error?.message ?? null;
  } catch (e) {
    checks.authException = String(e);
  }

  // Check 3: Database
  try {
    const count = await prisma.contact.count();
    checks.dbContactCount = count;
  } catch (e) {
    checks.dbError = String(e);
  }

  return NextResponse.json(checks);
}
