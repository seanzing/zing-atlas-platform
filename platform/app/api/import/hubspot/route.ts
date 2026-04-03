import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { ORG_ID } from "@/lib/constants";
import { requireAuth } from "@/lib/api-auth";

const HUBSPOT_API = "https://api.hubapi.com";
const ACTIVE_STRIPE_STATUSES = ["Active", "Trialing", "Past Due", "Unpaid"];
const CANCELLED_WEBSITE_STATUSES = [
  "Cancelled- Pre",
  "Cancelled- Post",
  "Cancelled- AR",
];

const DEAL_PROPERTIES = [
  "dealname",
  "website_status",
  "stripe_status",
  "assigned_designer",
  "am_assigned_designer",
  "onboarding_specialist",
  "pipeline",
  "dealstage",
  "amount",
  "product_type",
  "duda_site_code",
  "published_url",
  "account_status",
].join(",");

const CONTACT_PROPERTIES = [
  "firstname",
  "lastname",
  "email",
  "phone",
  "company",
  "hs_lead_status",
  "address",
  "city",
  "state",
  "zip",
];

interface HubSpotDeal {
  id: string;
  properties: Record<string, string | null>;
  associations?: {
    contacts?: { results: { id: string; type: string }[] };
  };
}

interface HubSpotContact {
  id: string;
  properties: Record<string, string | null>;
}

interface ImportSummary {
  dryRun: boolean;
  dealsFound: number;
  dealsImported: number;
  contactsCreated: number;
  contactsUpdated: number;
  dealsCreated: number;
  skipped: number;
  errors: string[];
  aborted?: boolean;
  reason?: string;
}

function getApiKey(): string {
  const key = process.env.HUBSPOT_API_KEY;
  if (!key) throw new Error("HUBSPOT_API_KEY not set");
  return key;
}

async function hubspotFetch(url: string, options?: RequestInit): Promise<Response> {
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      "Content-Type": "application/json",
      ...(options?.headers || {}),
    },
  });

  if (res.status === 429) {
    logger.warn("HubSpot rate limit hit, waiting 10s and retrying");
    await new Promise((r) => setTimeout(r, 10000));
    return fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${getApiKey()}`,
        "Content-Type": "application/json",
        ...(options?.headers || {}),
      },
    });
  }

  return res;
}

async function fetchAllDeals(): Promise<HubSpotDeal[]> {
  const deals: HubSpotDeal[] = [];
  let after: string | undefined;

  do {
    const params = new URLSearchParams({
      limit: "100",
      properties: DEAL_PROPERTIES,
      associations: "contacts",
    });
    if (after) params.set("after", after);

    const url = `${HUBSPOT_API}/crm/v3/objects/deals?${params}`;
    logger.info({ after, dealsSoFar: deals.length }, "Fetching deals page");

    const res = await hubspotFetch(url);
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`HubSpot deals API error ${res.status}: ${body}`);
    }

    const data = await res.json();
    deals.push(...(data.results || []));
    after = data.paging?.next?.after;

    // Rate limit: 200ms between requests
    await new Promise((r) => setTimeout(r, 200));
  } while (after);

  logger.info({ totalDeals: deals.length }, "All deals fetched from HubSpot");
  return deals;
}

function filterActiveDeals(deals: HubSpotDeal[]): HubSpotDeal[] {
  return deals.filter((d) => {
    const stripe = d.properties.stripe_status;
    const website = d.properties.website_status;
    if (!stripe || !ACTIVE_STRIPE_STATUSES.includes(stripe)) return false;
    if (!website || CANCELLED_WEBSITE_STATUSES.includes(website)) return false;
    return true;
  });
}

async function batchFetchContacts(contactIds: string[]): Promise<Map<string, HubSpotContact>> {
  const contactMap = new Map<string, HubSpotContact>();
  const unique = Array.from(new Set(contactIds));

  for (let i = 0; i < unique.length; i += 50) {
    const batch = unique.slice(i, i + 50);
    const url = `${HUBSPOT_API}/crm/v3/objects/contacts/batch/read`;

    const res = await hubspotFetch(url, {
      method: "POST",
      body: JSON.stringify({
        inputs: batch.map((id) => ({ id })),
        properties: CONTACT_PROPERTIES,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      logger.error({ status: res.status, body }, "Batch contact fetch failed");
      continue;
    }

    const data = await res.json();
    for (const c of data.results || []) {
      contactMap.set(c.id, c);
    }

    // Rate limit
    await new Promise((r) => setTimeout(r, 200));
  }

  logger.info({ contactsFetched: contactMap.size }, "Contacts fetched from HubSpot");
  return contactMap;
}

function detectPlan(amount: number | null): string {
  if (!amount || amount < 100) return "DISCOVER";
  if (amount <= 200) return "BOOST";
  return "DOMINATE";
}

function deriveContactStatus(stripeStatus: string): string {
  // Could differentiate in the future, but all imported statuses are active customers
  if (stripeStatus === "Active" || stripeStatus === "Trialing") return "Live Customer";
  if (stripeStatus === "Past Due" || stripeStatus === "Unpaid") return "Live Customer";
  return "Live Customer";
}

export async function POST(req: NextRequest) {
  const dryRun = req.nextUrl.searchParams.get("dryRun") === "true";
  const log = logger.child({ handler: "import-hubspot", dryRun });

  const summary: ImportSummary = {
    dryRun,
    dealsFound: 0,
    dealsImported: 0,
    contactsCreated: 0,
    contactsUpdated: 0,
    dealsCreated: 0,
    skipped: 0,
    errors: [],
  };

  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    // Step 1 — Fetch and filter deals
    log.info("Starting HubSpot import");
    const allDeals = await fetchAllDeals();
    const activeDeals = filterActiveDeals(allDeals);
    summary.dealsFound = activeDeals.length;
    log.info({ total: allDeals.length, active: activeDeals.length }, "Deals filtered");

    // Step 2 — Collect and batch-fetch associated contacts
    const contactIds: string[] = [];
    for (const deal of activeDeals) {
      const assoc = deal.associations?.contacts?.results;
      if (assoc) {
        for (const a of assoc) contactIds.push(a.id);
      }
    }
    const contactMap = await batchFetchContacts(contactIds);

    // Step 3 — Map and upsert
    for (const deal of activeDeals) {
      const assoc = deal.associations?.contacts?.results;
      if (!assoc || assoc.length === 0) {
        summary.skipped++;
        log.warn({ dealId: deal.id }, "Deal has no associated contacts, skipping");
        continue;
      }

      const contactHsId = assoc[0].id;
      const hsContact = contactMap.get(contactHsId);
      if (!hsContact) {
        summary.skipped++;
        log.warn({ dealId: deal.id, contactHsId }, "Contact not found in batch, skipping");
        continue;
      }

      const email = hsContact.properties.email;
      if (!email) {
        summary.errors.push(`Deal ${deal.id}: contact ${contactHsId} has no email`);
        summary.skipped++;
        continue;
      }

      // Abort if error rate > 10%
      if (summary.errors.length > 0 && summary.dealsImported > 0) {
        const errorRate = summary.errors.length / (summary.dealsImported + summary.skipped + summary.errors.length);
        if (errorRate >= 0.1) {
          log.error({ errorRate, errors: summary.errors.length }, "Error rate exceeded 10%, aborting");
          return NextResponse.json({ ...summary, aborted: true, reason: "Too many errors" }, { status: 200 });
        }
      }

      const firstName = hsContact.properties.firstname || "";
      const lastName = hsContact.properties.lastname || "";
      const name = `${firstName} ${lastName}`.trim() || email;
      const company = hsContact.properties.company || deal.properties.dealname || "";
      const amount = deal.properties.amount ? parseFloat(deal.properties.amount) : null;
      const plan = detectPlan(amount);
      const stripeStatus = deal.properties.stripe_status || "Active";

      if (dryRun) {
        // Check if contact exists
        const existing = await prisma.contact.findFirst({
          where: { email, organizationId: ORG_ID, deletedAt: null },
        });
        if (existing) {
          summary.contactsUpdated++;
          // Check if won deal exists
          const existingDeal = await prisma.deal.findFirst({
            where: { contactId: existing.id, stage: "won", deletedAt: null },
          });
          if (!existingDeal) summary.dealsCreated++;
          else summary.skipped++;
        } else {
          summary.contactsCreated++;
          summary.dealsCreated++;
        }
        summary.dealsImported++;
        continue;
      }

      // Actual upsert
      try {
        // Upsert contact on email
        let contact = await prisma.contact.findFirst({
          where: { email, organizationId: ORG_ID, deletedAt: null },
        });

        if (contact) {
          await prisma.contact.update({
            where: { id: contact.id },
            data: {
              name,
              phone: hsContact.properties.phone || contact.phone,
              company: company || contact.company,
              status: deriveContactStatus(stripeStatus),
              leadSource: "HubSpot Import",
            },
          });
          summary.contactsUpdated++;
        } else {
          contact = await prisma.contact.create({
            data: {
              organizationId: ORG_ID,
              name,
              email,
              phone: hsContact.properties.phone || null,
              company,
              status: deriveContactStatus(stripeStatus),
              leadSource: "HubSpot Import",
            },
          });
          summary.contactsCreated++;
        }

        // Create deal only if no existing won deal for this contact
        const existingDeal = await prisma.deal.findFirst({
          where: { contactId: contact.id, stage: "won", deletedAt: null },
        });

        if (!existingDeal) {
          const title = `${company || name} - ${plan}`;
          await prisma.deal.create({
            data: {
              organizationId: ORG_ID,
              title,
              contactId: contact.id,
              contactName: name,
              stage: "won",
              value: amount,
              assignedDesigner: deal.properties.assigned_designer || null,
              wonDate: new Date(),
              dealType: "new",
            },
          });
          summary.dealsCreated++;
        } else {
          summary.skipped++;
        }

        summary.dealsImported++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        summary.errors.push(`Deal ${deal.id} / ${email}: ${msg}`);
        log.error({ dealId: deal.id, email, error: msg }, "Failed to import deal+contact");
      }
    }

    log.info(summary, "HubSpot import complete");
    return NextResponse.json(summary);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log.error({ error: msg }, "HubSpot import failed");
    return NextResponse.json({ ...summary, errors: [...summary.errors, msg] }, { status: 500 });
  }
}

// GET — preview endpoint: returns estimated counts without writing
export async function GET() {
  const log = logger.child({ handler: "import-hubspot-preview" });

  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const allDeals = await fetchAllDeals();
    const activeDeals = filterActiveDeals(allDeals);

    // Count unique contact associations
    const contactIdSet = new Set<string>();
    for (const deal of activeDeals) {
      const assoc = deal.associations?.contacts?.results;
      if (assoc) {
        for (const a of assoc) contactIdSet.add(a.id);
      }
    }

    log.info({ deals: activeDeals.length, contacts: contactIdSet.size }, "Preview complete");

    return NextResponse.json({
      estimatedDeals: activeDeals.length,
      estimatedContacts: contactIdSet.size,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log.error({ error: msg }, "Preview failed");
    return NextResponse.json({ estimatedDeals: 0, estimatedContacts: 0, error: msg }, { status: 500 });
  }
}
