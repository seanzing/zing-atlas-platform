/**
 * HubSpot → Atlas Contacts Sync
 * Pulls all HubSpot contacts and upserts into Atlas contacts table.
 * Usage: DATABASE_URL="..." HUBSPOT_ACCESS_TOKEN="..." node scripts/sync-hubspot-contacts.mjs
 */

import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const HUBSPOT_TOKEN = process.env.HUBSPOT_ACCESS_TOKEN;
const ORG_ID = "00000000-0000-0000-0000-000000000001";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 3,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function hubspotGet(path) {
  const res = await fetch(`https://api.hubapi.com${path}`, {
    headers: { Authorization: `Bearer ${HUBSPOT_TOKEN}` },
  });
  if (!res.ok) throw new Error(`HubSpot ${res.status}: ${await res.text()}`);
  return res.json();
}

function mapStatus(lifecyclestage, leadStatus) {
  if (leadStatus === "IN_PROGRESS") return "active";
  if (leadStatus === "OPEN") return "lead";
  if (leadStatus === "NEW") return "lead";
  if (leadStatus === "CONNECTED") return "prospect";
  if (leadStatus === "BAD_TIMING") return "prospect";
  if (leadStatus === "UNQUALIFIED") return "inactive";
  if (lifecyclestage === "customer") return "customer";
  if (lifecyclestage === "opportunity") return "prospect";
  if (lifecyclestage === "salesqualifiedlead") return "prospect";
  if (lifecyclestage === "marketingqualifiedlead") return "lead";
  if (lifecyclestage === "lead") return "lead";
  if (lifecyclestage === "subscriber") return "lead";
  return "lead";
}

function mapLeadSource(source) {
  if (!source) return null;
  const map = {
    ORGANIC_SEARCH: "organic",
    PAID_SEARCH: "paid-search",
    SOCIAL_MEDIA: "social",
    REFERRAL: "referral",
    EMAIL_MARKETING: "email",
    OFFLINE: "offline",
    DIRECT_TRAFFIC: "direct",
    OTHER_CAMPAIGNS: "campaign",
  };
  return map[source] ?? source.toLowerCase().replace(/_/g, "-");
}

async function fetchAllContacts() {
  const contacts = [];
  const props = "firstname,lastname,email,company,phone,hs_lead_status,lifecyclestage,hs_analytics_source,notes_last_updated,hs_content_membership_notes";
  let after = undefined;
  let page = 1;

  while (true) {
    const qs = `limit=100&properties=${props}${after ? `&after=${after}` : ""}`;
    const data = await hubspotGet(`/crm/v3/objects/contacts?${qs}`);
    contacts.push(...data.results);
    process.stdout.write(`\r  Page ${page}: ${contacts.length} contacts fetched`);

    if (!data.paging?.next?.after) break;
    after = data.paging.next.after;
    page++;
  }
  console.log();
  return contacts;
}

async function run() {
  console.log("\n🔄 HubSpot → Atlas Contacts Sync\n");

  // Step 1: Check existing
  const existing = await prisma.contact.count({ where: { organizationId: ORG_ID } });
  console.log(`Step 1: Existing Atlas contacts: ${existing}`);

  if (existing > 0) {
    // Check if they look like seed data (no email or generic names)
    const seeded = await prisma.contact.count({
      where: { organizationId: ORG_ID, email: null },
    });
    console.log(`  Contacts without email (likely seed data): ${seeded}`);
    if (seeded > 0) {
      // Delete seed contacts with no email
      const del = await prisma.contact.deleteMany({
        where: { organizationId: ORG_ID, email: null },
      });
      console.log(`  Deleted ${del.count} seed records with no email`);
    }
  }

  // Step 2: Fetch all HubSpot contacts
  console.log("\nStep 2: Fetching HubSpot contacts...");
  const hsContacts = await fetchAllContacts();
  console.log(`  Total: ${hsContacts.length} contacts\n`);

  // Step 3: Upsert into Atlas
  console.log("Step 3: Syncing to Atlas contacts...");
  let created = 0;
  let updated = 0;
  let skipped = 0;

  const CHUNK = 5;
  for (let i = 0; i < hsContacts.length; i += CHUNK) {
    const chunk = hsContacts.slice(i, i + CHUNK);
    await Promise.all(chunk.map(async (hsc) => {
      const p = hsc.properties;
      const firstName = p.firstname ?? "";
      const lastName = p.lastname ?? "";
      const name = [firstName, lastName].filter(Boolean).join(" ") || "Unknown";
      const email = p.email ?? null;
      const company = p.company ?? null;
      const phone = p.phone ?? null;
      const status = mapStatus(p.lifecyclestage, p.hs_lead_status);
      const leadSource = mapLeadSource(p.hs_analytics_source);

      if (!email && !name) { skipped++; return; }

      const data = {
        organizationId: ORG_ID,
        name,
        email,
        company,
        phone,
        status,
        leadSource,
      };

      // Upsert by email if present, else by name+org
      const existing = email
        ? await prisma.contact.findFirst({ where: { organizationId: ORG_ID, email }, select: { id: true } })
        : await prisma.contact.findFirst({ where: { organizationId: ORG_ID, name }, select: { id: true } });

      if (existing) {
        await prisma.contact.update({ where: { id: existing.id }, data });
        updated++;
      } else {
        await prisma.contact.create({ data });
        created++;
      }
    }));
    process.stdout.write(`\r  Progress: ${Math.min(i + CHUNK, hsContacts.length)}/${hsContacts.length}`);
  }
  console.log();

  console.log(`  Created: ${created}`);
  console.log(`  Updated: ${updated}`);
  console.log(`  Skipped: ${skipped}\n`);

  // Step 4: Summary
  const totals = await prisma.contact.groupBy({
    by: ["status"],
    where: { organizationId: ORG_ID },
    _count: true,
  });
  console.log("Step 4: Contact summary by status:");
  totals.forEach(t => console.log(`  ${t.status}: ${t._count}`));

  const total = await prisma.contact.count({ where: { organizationId: ORG_ID } });
  console.log(`\n  Total contacts in Atlas: ${total}`);

  await prisma.$disconnect();
  await pool.end();
  console.log("\n✅ Sync complete\n");
}

run().catch(e => { console.error("Fatal:", e); process.exit(1); });
