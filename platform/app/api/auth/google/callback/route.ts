import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { prisma } from "@/lib/prisma";
import { exchangeGoogleCode } from "@/lib/gmail";
import { logger } from "@/lib/logger";
import { ORG_ID } from "@/lib/constants";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error || !code) {
    logger.warn({ error }, "Google OAuth callback error");
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/settings?googleError=access_denied`
    );
  }

  try {
    // Get session to find which team member is connecting
    const supabase = createSupabaseServer();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.user?.email) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/login`
      );
    }

    // Exchange code for tokens
    const { refreshToken, email: googleEmail } = await exchangeGoogleCode(code);

    // Store refresh token on the TeamMember record matched by their session email
    const updated = await prisma.teamMember.updateMany({
      where: {
        organizationId: ORG_ID,
        email: session.user.email,
        deletedAt: null,
      },
      data: { googleRefreshToken: refreshToken },
    });

    if (updated.count === 0) {
      logger.warn({ email: session.user.email }, "No TeamMember found to store Google token");
    } else {
      logger.info({ email: googleEmail }, "Google account connected for team member");
    }

    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/settings?googleConnected=true`
    );
  } catch (err) {
    logger.error({ err }, "Google OAuth callback failed");
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/settings?googleError=callback_failed`
    );
  }
}
