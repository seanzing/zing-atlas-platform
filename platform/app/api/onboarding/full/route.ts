import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { ORG_ID } from "@/lib/constants";
import { requireAuth } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const onboardings = await prisma.onboarding.findMany({
      where: {
        organizationId: ORG_ID,
        deletedAt: null,
      },
      include: {
        items: true,
        product: { select: { description: true } },
        deal: {
          select: {
            contactId: true,
            rep: true,
            value: true,
            launchFeeAmount: true,
            wonDate: true,
            domainType: true,
            domainName: true,
            paymentStatus: true,
            product: { select: { description: true } },
          }
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Batch-fetch designer notes for all deals in one query
    const dealIds = onboardings.map((ob) => ob.dealId).filter(Boolean) as string[];
    const allDesignerNotes = dealIds.length > 0
      ? await prisma.dealNote.findMany({
          where: { dealId: { in: dealIds }, department: "Designer" },
          orderBy: { createdAt: "asc" },
          select: { dealId: true, content: true, createdAt: true, id: true },
        })
      : [];

    // Group notes by dealId
    const notesByDeal: Record<string, { id: string; content: string; createdAt: Date }[]> = {};
    for (const note of allDesignerNotes) {
      if (!notesByDeal[note.dealId]) notesByDeal[note.dealId] = [];
      notesByDeal[note.dealId].push({ id: note.id, content: note.content, createdAt: note.createdAt });
    }

    const result = onboardings.map((ob) => {
      const websiteItem = ob.items.find((i) => i.taskType === "website");
      return {
        onboardingId: ob.id,
        customerName: ob.customerName,
        businessName: ob.businessName,
        email: ob.email,
        contactId: ob.deal?.contactId ?? null,
        websiteStatus: ob.websiteStatus ?? "not_started",
        offshoreDesigner: ob.offshoreDesigner ?? null,
        usDesigner: ob.usDesigner ?? null,
        designer: websiteItem?.owner ?? ob.offshoreDesigner ?? ob.usDesigner ?? null,
        product: ob.product?.description ?? ob.deal?.product?.description ?? null,
        wonDate: ob.wonDate ?? ob.deal?.wonDate ?? null,
        status: ob.status,
        rep: ob.rep ?? ob.deal?.rep ?? null,
        value: ob.value ? Number(ob.value) : (ob.deal?.value ? Number(ob.deal.value) : null),
        launchFeeAmount: ob.deal?.launchFeeAmount ? Number(ob.deal.launchFeeAmount) : null,
        domainType: ob.deal?.domainType ?? null,
        domainName: ob.newUrl ?? ob.deal?.domainName ?? null,
        designBrief: ob.designBrief ?? null,
        googleAccess: ob.googleAccess ?? null,
        launchFeeCollected: ob.launchFeeCollected ?? null,
        dealId: ob.dealId ?? null,
        designerNotes: ob.designerNotes ?? null,
        designerDealNotes: ob.dealId ? (notesByDeal[ob.dealId] ?? []) : [],
        items: ob.items.map((i) => ({
          id: i.id,
          taskType: i.taskType,
          itemName: i.itemName,
          currentStatus: i.currentStatus,
          statusOptions: i.statusOptions,
          owner: i.owner,
          ownerRole: i.ownerRole,
          dueDate: i.dueDate,
          completedAt: i.completedAt,
          stage: i.stage,
          isActive: i.isActive,
          isConditional: i.isConditional,
          notes: i.notes,
        })),
      };
    });

    logger.info({ count: result.length }, "GET /api/onboarding/full");
    return NextResponse.json(result);
  } catch (error) {
    logger.error({ err: error }, "GET /api/onboarding/full failed");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
