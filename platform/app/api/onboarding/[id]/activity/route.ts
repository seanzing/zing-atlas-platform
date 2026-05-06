import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { ORG_ID } from "@/lib/constants";
import { requireAuth } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    const { id } = await params;

    const logs = await prisma.activityLog.findMany({
      where: { onboardingId: id, organizationId: ORG_ID },
      orderBy: { createdAt: "desc" },
    });

    // Fetch team member names for logs that have teamMemberId
    const teamMemberIds = Array.from(
      new Set(logs.filter((l) => l.teamMemberId).map((l) => l.teamMemberId!))
    );

    const teamMembers =
      teamMemberIds.length > 0
        ? await prisma.teamMember.findMany({
            where: { id: { in: teamMemberIds } },
            select: { id: true, firstName: true, lastName: true },
          })
        : [];

    const tmMap = new Map(teamMembers.map((tm) => [tm.id, tm]));

    const result = logs.map((log) => {
      const tm = log.teamMemberId ? tmMap.get(log.teamMemberId) : null;
      return {
        id: log.id,
        type: log.type,
        subject: log.subject,
        body: log.body,
        toEmail: log.toEmail,
        fromEmail: log.fromEmail,
        previewUrl: log.previewUrl,
        metadata: log.metadata,
        createdAt: log.createdAt,
        teamMember: tm
          ? { firstName: tm.firstName, lastName: tm.lastName }
          : null,
      };
    });

    logger.info({ onboardingId: id, count: result.length }, "GET activity log");
    return NextResponse.json(result);
  } catch (error) {
    logger.error({ err: error }, "GET /api/onboarding/[id]/activity failed");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
