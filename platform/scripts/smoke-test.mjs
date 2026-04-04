/**
 * Atlas Smoke Test — runs against live Supabase DB, no auth required
 * Usage: DATABASE_URL="..." node scripts/smoke-test.mjs
 */

import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const ORG_ID = "00000000-0000-0000-0000-000000000001";

const results = [];
const pass = (name, detail = "") => { results.push({ status: "PASS", name, detail }); };
const fail = (name, err) => { results.push({ status: "FAIL", name, detail: err?.message || err }); };

async function run() {
  console.log("\n🔍 Atlas Smoke Test\n");

  // 1. Deals
  try {
    const deals = await prisma.deal.findMany({ where: { organizationId: ORG_ID }, take: 5 });
    pass("deals.findMany", `${deals.length} returned (showing 5)`);
  } catch (e) { fail("deals.findMany", e); }

  // 2. Contacts
  try {
    const contacts = await prisma.contact.findMany({ where: { organizationId: ORG_ID }, take: 5 });
    pass("contacts.findMany", `${contacts.length} returned`);
  } catch (e) { fail("contacts.findMany", e); }

  // 3. Onboarding
  try {
    const obs = await prisma.onboarding.findMany({ where: { organizationId: ORG_ID }, take: 5, include: { items: true } });
    pass("onboarding.findMany", `${obs.length} records, items included`);
  } catch (e) { fail("onboarding.findMany", e); }

  // 4. Products
  try {
    const products = await prisma.product.findMany({ where: { organizationId: ORG_ID } });
    pass("products.findMany", `${products.length} products`);
  } catch (e) { fail("products.findMany", e); }

  // 5. Team members
  try {
    const team = await prisma.teamMember.findMany({ where: { organizationId: ORG_ID } });
    pass("teamMember.findMany", `${team.length} members`);
  } catch (e) { fail("teamMember.findMany", e); }

  // 6. AR accounts
  try {
    const ar = await prisma.arAccount.findMany({ where: { organizationId: ORG_ID }, take: 5 });
    pass("arAccount.findMany", `${ar.length} accounts`);
  } catch (e) { fail("arAccount.findMany", e); }

  // 7. Support tickets
  try {
    const tickets = await prisma.ticket.findMany({ where: { organizationId: ORG_ID }, take: 5 });
    pass("ticket.findMany", `${tickets.length} tickets`);
  } catch (e) { fail("ticket.findMany", e); }

  // 8. Campaigns
  try {
    const campaigns = await prisma.campaign.findMany({ where: { organizationId: ORG_ID } });
    pass("campaign.findMany", `${campaigns.length} campaigns`);
  } catch (e) { fail("campaign.findMany", e); }

  // 9. Dashboard aggregate — deals by status
  try {
    const grouped = await prisma.deal.groupBy({
      by: ["status"],
      where: { organizationId: ORG_ID },
      _count: true,
    });
    const summary = grouped.map(g => `${g.status}:${g._count}`).join(", ");
    pass("deals.groupBy(status)", summary);
  } catch (e) { fail("deals.groupBy(status)", e); }

  // 10. Onboarding items completion rate
  try {
    const total = await prisma.onboardingItem.count({ where: { onboarding: { organizationId: ORG_ID } } });
    const done = await prisma.onboardingItem.count({ where: { onboarding: { organizationId: ORG_ID }, completedAt: { not: null } } });
    pass("onboardingItem completion rate", `${done}/${total} complete`);
  } catch (e) { fail("onboardingItem completion rate", e); }

  await prisma.$disconnect();
  await pool.end();

  // Print results
  const passed = results.filter(r => r.status === "PASS").length;
  const failed = results.filter(r => r.status === "FAIL").length;

  results.forEach(r => {
    const icon = r.status === "PASS" ? "✅" : "❌";
    console.log(`${icon} ${r.name}: ${r.detail}`);
  });

  console.log(`\n${passed}/${results.length} passed${failed > 0 ? `, ${failed} FAILED` : " — all clear"}\n`);
  process.exit(failed > 0 ? 1 : 0);
}

run().catch(e => { console.error("Fatal:", e); process.exit(1); });
