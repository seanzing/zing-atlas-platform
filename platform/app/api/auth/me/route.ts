import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { prisma } from "@/lib/prisma";
import { ORG_ID } from "@/lib/constants";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createSupabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const email = user.email;
    if (!email) {
      return NextResponse.json({ error: "No email on session" }, { status: 401 });
    }

    const teamMember = await prisma.teamMember.findFirst({
      where: {
        organizationId: ORG_ID,
        email,
        active: true,
        deletedAt: null,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        role: true,
        department: true,
        email: true,
      },
    });

    return NextResponse.json({
      email,
      teamMember: teamMember
        ? {
            id: teamMember.id,
            firstName: teamMember.firstName,
            lastName: teamMember.lastName,
            role: teamMember.role,
            department: teamMember.department,
          }
        : null,
      isAdmin: teamMember?.role === "Admin",
    });
  } catch (error) {
    logger.error({ err: error }, "GET /api/auth/me error");
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
