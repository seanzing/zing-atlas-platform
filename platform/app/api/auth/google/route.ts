import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { getGoogleAuthUrl } from "@/lib/gmail";

export const dynamic = "force-dynamic";

// Redirect the logged-in team member to Google's OAuth consent screen
export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const url = getGoogleAuthUrl();
  return NextResponse.redirect(url);
}
