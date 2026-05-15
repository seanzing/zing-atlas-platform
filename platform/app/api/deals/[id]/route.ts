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
      "assignedDesigner", "designerEmail", "launchFeeAmount", "deliveryDate",
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
    if (updateData.deliveryDate) {
      updateData.deliveryDate = new Date(updateData.deliveryDate as string);
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
          const customerName = contact.company || contact.name || 'there';
          const bookingStep = designer?.bookingLink
            ? `
            <tr>
              <td style="padding: 0 0 16px 0;">
                <table cellpadding="0" cellspacing="0" border="0" width="100%" style="border-left: 4px solid #050536; background-color: #F5F7FA; border-radius: 0 6px 6px 0;">
                  <tr><td style="padding: 20px 24px;">
                    <p style="margin: 0 0 4px 0; font-size: 13px; color: #050536; font-weight: 700; font-family: Arial, sans-serif; text-transform: uppercase; letter-spacing: 0.5px;">Step 3</p>
                    <p style="margin: 0 0 8px 0; font-size: 16px; font-weight: 700; color: #1a1a2e; font-family: Arial, sans-serif;">Book Your Onboarding Call</p>
                    <p style="margin: 0 0 16px 0; font-size: 14px; color: #5a5f7a; font-family: Arial, sans-serif; line-height: 1.5;">Schedule a call with your designer to go over your project.</p>
                    <table cellpadding="0" cellspacing="0" border="0">
                      <tr><td style="background-color: #050536; border-radius: 4px;">
                        <a href="${designer.bookingLink}" style="display: inline-block; padding: 10px 24px; font-size: 14px; font-weight: 700; color: #ffffff; text-decoration: none; font-family: Arial, sans-serif;">Book Your Call</a>
                      </td></tr>
                    </table>
                  </td></tr>
                </table>
              </td>
            </tr>`
            : '';
          const emailHtml = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Welcome to ZING</title></head>
<body style="margin: 0; padding: 0; background-color: #F5F7FA; font-family: Arial, sans-serif;">
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #F5F7FA;">
    <tr><td align="center" style="padding: 40px 20px;">
      <table cellpadding="0" cellspacing="0" border="0" width="600" style="max-width: 600px; width: 100%;">

        <!-- Header -->
        <tr>
          <td style="background-color: #F5F7FA; padding: 28px 40px; text-align: center; border-radius: 8px 8px 0 0; border-bottom: 3px solid #050536;">
            <img src="https://lirp.cdn-website.com/e97cdfbe/dms3rep/multi/opt/Main+logo%403x-1920w.png" alt="ZING Website Design" width="160" style="max-width: 160px; width: 100%; height: auto; display: block; margin: 0 auto;" />
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="background-color: #ffffff; padding: 40px 40px 32px 40px;">
            <p style="margin: 0 0 8px 0; font-size: 18px; font-weight: 700; color: #1a1a2e; font-family: Arial, sans-serif;">Hi ${customerName},</p>
            <p style="margin: 0 0 28px 0; font-size: 15px; color: #5a5f7a; font-family: Arial, sans-serif; line-height: 1.6;">Welcome to ZING! We are excited to get started on your project. Here are your next steps to kick things off:</p>

            <table cellpadding="0" cellspacing="0" border="0" width="100%">

              <!-- Step 1 -->
              <tr>
                <td style="padding: 0 0 16px 0;">
                  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="border-left: 4px solid #050536; background-color: #F5F7FA; border-radius: 0 6px 6px 0;">
                    <tr><td style="padding: 20px 24px;">
                      <p style="margin: 0 0 4px 0; font-size: 13px; color: #050536; font-weight: 700; font-family: Arial, sans-serif; text-transform: uppercase; letter-spacing: 0.5px;">Step 1</p>
                      <p style="margin: 0 0 8px 0; font-size: 16px; font-weight: 700; color: #1a1a2e; font-family: Arial, sans-serif;">Complete Your Google Business Profile Info</p>
                      <p style="margin: 0 0 16px 0; font-size: 14px; color: #5a5f7a; font-family: Arial, sans-serif; line-height: 1.5;">Our team needs a few details to optimize your Google Business Profile.</p>
                      <table cellpadding="0" cellspacing="0" border="0">
                        <tr><td style="background-color: #050536; border-radius: 4px;">
                          <a href="${gbpFormUrl}" style="display: inline-block; padding: 10px 24px; font-size: 14px; font-weight: 700; color: #ffffff; text-decoration: none; font-family: Arial, sans-serif;">Complete GBP Form</a>
                        </td></tr>
                      </table>
                    </td></tr>
                  </table>
                </td>
              </tr>

              <!-- Step 2 -->
              <tr>
                <td style="padding: 0 0 16px 0;">
                  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="border-left: 4px solid #050536; background-color: #F5F7FA; border-radius: 0 6px 6px 0;">
                    <tr><td style="padding: 20px 24px;">
                      <p style="margin: 0 0 4px 0; font-size: 13px; color: #050536; font-weight: 700; font-family: Arial, sans-serif; text-transform: uppercase; letter-spacing: 0.5px;">Step 2</p>
                      <p style="margin: 0 0 8px 0; font-size: 16px; font-weight: 700; color: #1a1a2e; font-family: Arial, sans-serif;">Complete Your Website Design Brief</p>
                      <p style="margin: 0 0 16px 0; font-size: 14px; color: #5a5f7a; font-family: Arial, sans-serif; line-height: 1.5;">Tell us about your business, style preferences, and what you need from your website.</p>
                      <table cellpadding="0" cellspacing="0" border="0">
                        <tr><td style="background-color: #050536; border-radius: 4px;">
                          <a href="${designBriefUrl}" style="display: inline-block; padding: 10px 24px; font-size: 14px; font-weight: 700; color: #ffffff; text-decoration: none; font-family: Arial, sans-serif;">Complete Design Brief</a>
                        </td></tr>
                      </table>
                    </td></tr>
                  </table>
                </td>
              </tr>

              <!-- Step 3 (conditional) -->
              ${bookingStep}

            </table>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background-color: #F5F7FA; padding: 24px 40px; text-align: center; border-radius: 0 0 8px 8px; border-top: 1px solid #e8eaed;">
            <p style="margin: 0 0 6px 0; font-size: 13px; color: #5a5f7a; font-family: Arial, sans-serif;">Questions? Reply to this email or contact your rep, ${deal.rep || 'your ZING rep'}.</p>
            <p style="margin: 0 0 6px 0; font-size: 13px; color: #5a5f7a; font-family: Arial, sans-serif;"><strong style="color: #1a1a2e;">ZING Website Design</strong> | zingwebsitedesign.com</p>
            <p style="margin: 0; font-size: 11px; color: #9ca3af; font-family: Arial, sans-serif;">You received this email because you recently signed up with ZING.</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
          const smtp2goRes = await fetch('https://api.smtp2go.com/v3/email/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              api_key: process.env.SMTP2GO_API_KEY,
              to: [contact.email],
              sender: 'ZING <noreply@zing-work.com>',
              subject: 'Welcome to ZING -- Your Next Steps',
              html_body: emailHtml,
              track_opens: true,
              track_clicks: true,
            }),
          });

          let smtp2goMessageId: string | null = null;
          if (!smtp2goRes.ok) {
            const errBody = await smtp2goRes.text();
            logger.error({ status: smtp2goRes.status, body: errBody }, 'SMTP2GO send failed');
          } else {
            const smtp2goData = await smtp2goRes.json().catch(() => null);
            smtp2goMessageId = smtp2goData?.data?.email_id ?? smtp2goData?.request_id ?? null;
          }

          await prisma.activityLog.create({
            data: {
              organizationId: ORG_ID,
              contactId: deal.contactId,
              type: 'email_sent',
              subject: 'Welcome to ZING — Your Next Steps',
              toEmail: contact.email,
              fromEmail: 'noreply@zing-work.com',
              metadata: {
                source: 'closed_won_automation',
                dealId: deal.id,
                smtp2goMessageId,
                deliveryStatus: smtp2goMessageId ? 'sent' : 'failed',
              },
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
