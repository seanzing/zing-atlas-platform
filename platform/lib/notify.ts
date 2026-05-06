import { prisma } from "@/lib/prisma";
import { ORG_ID } from "@/lib/constants";

interface NotifyOptions {
  type: string;
  title: string;
  message?: string;
  link?: string;
}

/**
 * Send a notification to all team members with a given position.
 * Pass position prefixes like "publishing", "designer", "admin", or "all" for everyone.
 */
export async function notifyByPosition(position: string, opts: NotifyOptions) {
  const where =
    position === "all"
      ? { organizationId: ORG_ID, deletedAt: null, active: true }
      : { organizationId: ORG_ID, deletedAt: null, active: true, position: { startsWith: position } };

  const members = await prisma.teamMember.findMany({ where, select: { id: true } });
  if (members.length === 0) return;

  await prisma.notification.createMany({
    data: members.map((m) => ({
      organizationId: ORG_ID,
      teamMemberId: m.id,
      ...opts,
    })),
  });
}

/**
 * Send a notification to a specific team member by their supabase user ID.
 */
export async function notifyTeamMember(supabaseUserId: string, opts: NotifyOptions) {
  const member = await prisma.teamMember.findFirst({
    where: { supabaseUserId, organizationId: ORG_ID, deletedAt: null },
    select: { id: true },
  });
  if (!member) return;

  await prisma.notification.create({
    data: {
      organizationId: ORG_ID,
      teamMemberId: member.id,
      ...opts,
    },
  });
}
