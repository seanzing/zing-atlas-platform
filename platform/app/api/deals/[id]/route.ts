import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { ORG_ID, ONBOARDING_TASK_TEMPLATES, PRODUCT_TASK_MAP, addDays } from "@/lib/constants";
import { requireAuth } from "@/lib/api-auth";
import { serialize } from "@/lib/serialize";
import { computeHeatScore } from "@/lib/heat-score";


export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: RouteContext) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const { id } = await params;
    const deal = await prisma.deal.findFirst({
      where: { id, organizationId: ORG_ID, deletedAt: null },
      include: {
        contact: true,
        product: true,
        onboarding: {
          include: { items: true },
        },
        launchFeePayments: true,
      },
    });

    if (!deal) {
      return NextResponse.json({ error: "Deal not found" }, { status: 404 });
    }

    const stageRef = deal.stageEnteredAt ?? deal.createdAt;
    const timeInStageDays = Math.floor((Date.now() - new Date(stageRef).getTime()) / 86400000);
    const heatScore = computeHeatScore(
      { stage: deal.stage ?? '', probability: deal.probability, stageEnteredAt: deal.stageEnteredAt, createdAt: deal.createdAt },
      deal.contact ? { lastContact: deal.contact.lastContact } : null
    );

    logger.info({ dealId: deal.id }, "GET /api/deals/[id]");
    return NextResponse.json(serialize({ ...deal, timeInStageDays, heatScore }));
  } catch (error) {
    logger.error({ err: error }, "GET /api/deals/[id] failed");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: RouteContext) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const { id } = await params;
    const existing = await prisma.deal.findFirst({
      where: { id, organizationId: ORG_ID, deletedAt: null },
    });

    if (!existing) {
      return NextResponse.json({ error: "Deal not found" }, { status: 404 });
    }

    const body = await req.json();
    const stagingWon = body.stage === "won" && existing.stage !== "won";
    const stageChanged = body.stage !== undefined && body.stage !== existing.stage;

    // Whitelist allowed fields to prevent mass assignment
    const updateData: Record<string, unknown> = {};
    const whitelist = [
      "title", "stage", "value", "rep", "contactName", "company", "dealType",
      "productId", "contactId", "wonDate", "lostReason", "notes",
      "paymentStatus", "stripeSubscriptionId", "stripeCustomerId",
      "designer", "designerEmail", "launchFeeAmount",
    ];
    for (const key of whitelist) {
      if (key in body) updateData[key] = body[key];
    }
    // Validate numeric fields
    if (updateData.value !== undefined && updateData.value !== null) {
      const numVal = Number(updateData.value);
      if (isNaN(numVal) || numVal < 0) {
        return NextResponse.json({ error: "value must be a non-negative number" }, { status: 400 });
      }
      updateData.value = numVal;
    }

    if (updateData.launchFeeAmount !== undefined && updateData.launchFeeAmount !== null) {
      const numFee = Number(updateData.launchFeeAmount);
      if (isNaN(numFee) || numFee < 0) {
        return NextResponse.json({ error: "launchFeeAmount must be a non-negative number" }, { status: 400 });
      }
      updateData.launchFeeAmount = numFee;
    }

    if (stagingWon && !updateData.wonDate) {
      updateData.wonDate = new Date();
    } else if (updateData.wonDate) {
      updateData.wonDate = new Date(updateData.wonDate as string);
    }
    if (stageChanged) {
      updateData.stageEnteredAt = new Date();
    }

    const deal = await prisma.deal.update({
      where: { id },
      data: updateData as Parameters<typeof prisma.deal.update>[0]["data"],
    });

    if (stagingWon) {
      // Only create onboarding if none exists for this deal
      const existingOnboarding = await prisma.onboarding.findFirst({
        where: { dealId: deal.id, deletedAt: null },
      });

      if (!existingOnboarding) {
        const contact = deal.contactId
          ? await prisma.contact.findUnique({ where: { id: deal.contactId } })
          : null;

        const effectiveWonDate = (deal.wonDate as Date | null) ?? new Date();

        const onboarding = await prisma.onboarding.create({
          data: {
            organizationId: ORG_ID,
            dealId: deal.id,
            customerName: contact?.name ?? deal.contactName ?? null,
            businessName: contact?.company ?? null,
            phone: contact?.phone ?? null,
            email: contact?.email ?? null,
            rep: deal.rep ?? null,
            productId: deal.productId ?? null,
            value: deal.value ?? null,
            wonDate: effectiveWonDate,
            status: "active",
          },
        });

        // Try DB-based task templates first, fall back to constants
        const dbTemplates = deal.productId
          ? await prisma.productTaskTemplate.findMany({
              where: { productId: deal.productId, deletedAt: null },
              orderBy: { taskOrder: "asc" },
            })
          : [];

        if (dbTemplates.length > 0) {
          await prisma.onboardingItem.createMany({
            data: dbTemplates.map((t, idx) => ({
              onboardingId: onboarding.id,
              itemName: t.taskName,
              taskType: t.taskType,
              ownerRole: t.ownerRole,
              stage: "pending",
              currentStatus: Array.isArray(t.statusOptions) ? (t.statusOptions as Array<{value: string}>)[0]?.value ?? "not_started" : "not_started",
              statusOptions: t.statusOptions ?? [],
              isConditional: t.isConditional,
              isActive: idx === 0,
              owner: null,
              dueDate: addDays(effectiveWonDate, t.daysOffset),
            })),
          });
        } else {
          // Fallback: constants-based templates
          const product = deal.productId
            ? await prisma.product.findUnique({ where: { id: deal.productId } })
            : null;
          const productDesc = product?.description?.toUpperCase() ?? '';
          const productKey = Object.keys(PRODUCT_TASK_MAP).find(k => productDesc.includes(k)) ?? 'DISCOVER';
          const taskTypes = PRODUCT_TASK_MAP[productKey];

          await prisma.onboardingItem.createMany({
            data: taskTypes.map((taskType, idx) => {
              const template = ONBOARDING_TASK_TEMPLATES[taskType];
              return {
                onboardingId: onboarding.id,
                itemName: template.itemName,
                taskType: template.taskType,
                ownerRole: template.ownerRole,
                stage: "pending",
                currentStatus: template.statusOptions[0]?.value ?? "not_started",
                statusOptions: JSON.parse(JSON.stringify(template.statusOptions)),
                isConditional: template.isConditional,
                isActive: idx === 0,
                owner: null,
                dueDate: addDays(effectiveWonDate, template.daysOffset),
              };
            }),
          });
        }

        logger.info({ dealId: deal.id, onboardingId: onboarding.id }, "Deal moved to won — onboarding created");
      }

      // Closed Won Automation: send welcome email via Resend
      try {
        const contact = deal.contactId
          ? await prisma.contact.findUnique({ where: { id: deal.contactId } })
          : null;
        if (contact?.email) {
          const designer = deal.assignedDesigner
            ? await prisma.designer.findFirst({ where: { name: deal.assignedDesigner, organizationId: ORG_ID } })
            : null;

          const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://atlas.zingwebsitedesign.com';
          const gbpFormUrl = `${appUrl}/forms/gbp-info?contact=${deal.contactId ?? ''}`;
          const designBriefUrl = `${appUrl}/forms/design-brief?contact=${deal.contactId ?? ''}`;
          const emailHtml = `<p>Hi ${contact.company || contact.name},</p><p>Welcome to ZING! Here are your next steps:</p><ol><li><a href="${gbpFormUrl}">Complete your Google Business Profile info form</a></li><li><a href="${designBriefUrl}">Complete your website design brief</a></li>${designer?.bookingLink ? `<li><a href="${designer.bookingLink}">Book your onboarding call with your designer</a></li>` : ''}</ol><p>-- ${deal.rep}, ZING Team</p>`;
          const smtp2goRes = await fetch('https://api.smtp2go.com/v3/email/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              api_key: process.env.SMTP2GO_API_KEY,
              to: [contact.email],
              sender: 'ZING <noreply@zing-work.com>',
              subject: 'Welcome to ZING -- Your Next Steps',
              html_body: emailHtml,
            }),
          });
          if (!smtp2goRes.ok) {
            const errBody = await smtp2goRes.text();
            logger.error({ status: smtp2goRes.status, body: errBody }, 'SMTP2GO send failed');
          }

          await prisma.activityLog.create({
            data: {
              organizationId: ORG_ID,
              contactId: deal.contactId,
              type: 'note',
              subject: 'Deal marked Closed Won — contract send pending rep action',
              metadata: { source: 'closed_won_automation' },
            },
          });
        }
      } catch (err) {
        logger.error({ err }, 'Closed Won automation failed (non-fatal)');
      }
    }

    logger.info({ dealId: deal.id }, "PUT /api/deals/[id]");
    return NextResponse.json(serialize(deal));
  } catch (error) {
    logger.error({ err: error }, "PUT /api/deals/[id] failed");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const { id } = await params;
    const existing = await prisma.deal.findFirst({
      where: { id, organizationId: ORG_ID, deletedAt: null },
    });

    if (!existing) {
      return NextResponse.json({ error: "Deal not found" }, { status: 404 });
    }

    const now = new Date();

    // Soft-delete related onboarding records and their items
    const onboardings = await prisma.onboarding.findMany({
      where: { dealId: id, deletedAt: null },
      select: { id: true },
    });
    const onboardingIds = onboardings.map((o) => o.id);

    await prisma.$transaction([
      // Deactivate onboarding items (OnboardingItem has no deletedAt field)
      ...(onboardingIds.length
        ? [prisma.onboardingItem.updateMany({
            where: { onboardingId: { in: onboardingIds } },
            data: { dueDate: null, isActive: false },
          })]
        : []),
      // Soft-delete onboarding records
      ...(onboardingIds.length
        ? [prisma.onboarding.updateMany({
            where: { id: { in: onboardingIds } },
            data: { deletedAt: now },
          })]
        : []),
      // Soft-delete the deal
      prisma.deal.update({
        where: { id },
        data: { deletedAt: now },
      }),
    ]);

    logger.info({ dealId: id, onboardingIds }, "DELETE /api/deals/[id] — soft deleted with cascade");
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ err: error }, "DELETE /api/deals/[id] failed");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
