/**
 * Stripe → Atlas AR Sync
 * Wipes seeded fake AR data and rebuilds from live Stripe subscriptions.
 * Usage: DATABASE_URL="..." STRIPE_SECRET_KEY="..." node scripts/sync-stripe-ar.mjs
 */

import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import Stripe from "stripe";

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const ORG_ID = "00000000-0000-0000-0000-000000000001";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

function getMRR(sub) {
  const item = sub.items?.data?.[0];
  if (!item) return 0;
  const amount = item.price?.unit_amount ?? 0;
  const interval = item.price?.recurring?.interval;
  if (interval === "year") return Math.round(amount / 12) / 100;
  return amount / 100;
}

function getProduct(sub) {
  const amount = (sub.items?.data?.[0]?.price?.unit_amount ?? 0) / 100;
  if (amount >= 200) return "DOMINATE";
  if (amount >= 100) return "BOOST";
  return "DISCOVER";
}

function getStatus(sub) {
  if (sub.status === "active") return "current";
  if (sub.status === "past_due") return "past-due";
  if (sub.status === "unpaid") return "unpaid";
  if (sub.status === "canceled") return "canceled";
  return sub.status;
}

async function fetchAllSubscriptions() {
  const subs = [];
  // Only fetch statuses relevant to AR — skip canceled (too many, not actionable)
  const statuses = ["active", "past_due", "unpaid", "trialing", "incomplete", "canceled"];

  for (const status of statuses) {
    let startingAfter = undefined;
    let page = 1;
    while (true) {
      const params = { limit: 100, status, expand: ["data.customer"] };
      if (startingAfter) params.starting_after = startingAfter;
      const batch = await stripe.subscriptions.list(params);
      subs.push(...batch.data);
      console.log(`  ${status} page ${page}: ${batch.data.length} subscriptions`);
      if (!batch.has_more) break;
      startingAfter = batch.data[batch.data.length - 1].id;
      page++;
    }
  }

  return subs;
}

async function run() {
  console.log("\n🔄 Stripe → Atlas AR Sync\n");

  // Step 1: Wipe fake seed data (children first)
  console.log("Step 1: Wiping seeded AR data...");
  const fakeAccounts = await prisma.arAccount.findMany({
    where: { organizationId: ORG_ID, stripeCustomerId: null },
    select: { id: true },
  });
  const fakeIds = fakeAccounts.map(a => a.id);
  console.log(`  Found ${fakeIds.length} fake accounts`);

  if (fakeIds.length > 0) {
    // Delete child timeline records first
    const deletedTimeline = await prisma.arTimeline.deleteMany({
      where: { arId: { in: fakeIds } },
    });
    console.log(`  Deleted ${deletedTimeline.count} timeline records`);

    const deleted = await prisma.arAccount.deleteMany({
      where: { id: { in: fakeIds } },
    });
    console.log(`  Deleted ${deleted.count} fake AR accounts`);
  }
  console.log();

  // Step 2: Fetch all Stripe subscriptions
  console.log("Step 2: Fetching Stripe subscriptions...");
  const subs = await fetchAllSubscriptions();
  console.log(`  Total: ${subs.length} subscriptions\n`);

  // Step 3: Upsert into ar_accounts
  console.log("Step 3: Syncing to Atlas AR...");
  let created = 0;
  let updated = 0;
  let skipped = 0;

  // Status priority — higher index = higher priority; keep best sub per customer
  const STATUS_PRIORITY = ["canceled", "incomplete", "trialing", "unpaid", "past-due", "past_due", "active", "current"];
  const priority = (s) => STATUS_PRIORITY.indexOf(s);

  // Build records, dedupe by stripeCustomerId (keep highest-priority status per customer)
  const recordMap = new Map();
  for (const sub of subs) {
    const customer = sub.customer;
    if (!customer || typeof customer === "string" || customer.deleted) { skipped++; continue; }

    const mrr = getMRR(sub);
    const product = getProduct(sub);
    const status = getStatus(sub);
    const email = customer.email ?? "";
    const businessName = customer.name ?? customer.email ?? "Unknown";

    // Only overwrite if this sub has higher priority status
    const existing = recordMap.get(customer.id);
    if (existing && priority(existing.status) >= priority(status)) continue;

    recordMap.set(customer.id, {
      organizationId: ORG_ID,
      businessName,
      customerName: businessName,
      email,
      phone: customer.phone ?? "",
      product,
      mrr,
      status,
      stripeStatus: sub.status,
      daysPastDue: 0,
      amountDue: status === "current" ? 0 : mrr,
      stripeCustomerId: customer.id,
      subscriptionCreated: new Date(sub.created * 1000),
    });
  }

  const records = Array.from(recordMap.values());
  console.log(`  Building ${records.length} unique customer records...`);

  // Batch upsert in chunks of 5 (session pooler max clients limit)
  const CHUNK = 5;
  for (let i = 0; i < records.length; i += CHUNK) {
    const chunk = records.slice(i, i + CHUNK);
    await Promise.all(chunk.map(async (data) => {
      const existing = await prisma.arAccount.findFirst({
        where: { organizationId: ORG_ID, stripeCustomerId: data.stripeCustomerId },
        select: { id: true },
      });
      if (existing) {
        await prisma.arAccount.update({ where: { id: existing.id }, data });
        updated++;
      } else {
        await prisma.arAccount.create({ data });
        created++;
      }
    }));
    process.stdout.write(`\r  Progress: ${Math.min(i + CHUNK, records.length)}/${records.length}`);
  }
  console.log();

  console.log(`  Created: ${created}`);
  console.log(`  Updated: ${updated}`);
  console.log(`  Skipped: ${skipped}\n`);

  // Step 4: Summary
  const totals = await prisma.arAccount.groupBy({
    by: ["status"],
    where: { organizationId: ORG_ID },
    _count: true,
  });

  console.log("Step 4: AR summary by status:");
  totals.forEach(t => console.log(`  ${t.status}: ${t._count}`));

  const mrrTotal = await prisma.arAccount.aggregate({
    where: { organizationId: ORG_ID, status: { in: ["current", "active", "past-due", "past_due", "unpaid", "trialing"] } },
    _sum: { mrr: true },
  });
  console.log(`\n  Total MRR (all paying/owed): $${Number(mrrTotal._sum.mrr ?? 0).toLocaleString()}/mo`);

  await prisma.$disconnect();
  await pool.end();
  console.log("\n✅ Sync complete\n");
}

run().catch(e => { console.error("Fatal:", e); process.exit(1); });
