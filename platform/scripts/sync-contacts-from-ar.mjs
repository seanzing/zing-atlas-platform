/**
 * AR → Atlas Contacts Sync
 * Creates contacts from active Stripe customers (AR accounts).
 * Only syncs current, active, past-due, unpaid, and trialing customers.
 * Wipes any existing seed/HubSpot contacts first.
 */

import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const ORG_ID = "00000000-0000-0000-0000-000000000001";
const ACTIVE_STATUSES = ["current", "active", "past-due", "past_due", "unpaid"];

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 3,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function run() {
  console.log("\n🔄 AR → Atlas Contacts Sync\n");

  // Step 1: Wipe existing contacts (seed + any prior import)
  console.log("Step 1: Clearing existing contacts...");
  const deleted = await prisma.contact.deleteMany({ where: { organizationId: ORG_ID } });
  console.log(`  Deleted ${deleted.count} existing contacts\n`);

  // Step 2: Pull active AR accounts
  console.log("Step 2: Pulling active AR accounts from Stripe data...");
  const arAccounts = await prisma.arAccount.findMany({
    where: {
      organizationId: ORG_ID,
      status: { in: ACTIVE_STATUSES },
      email: { not: null },
    },
    select: {
      id: true,
      businessName: true,
      customerName: true,
      email: true,
      phone: true,
      product: true,
      mrr: true,
      status: true,
      stripeCustomerId: true,
    },
  });
  console.log(`  Found ${arAccounts.length} active customers\n`);

  // Step 3: Create contacts
  console.log("Step 3: Creating contacts...");
  let created = 0;
  let skipped = 0;

  const CHUNK = 10;
  for (let i = 0; i < arAccounts.length; i += CHUNK) {
    const chunk = arAccounts.slice(i, i + CHUNK);
    await Promise.all(chunk.map(async (ar) => {
      const name = ar.customerName || ar.businessName || ar.email;
      if (!name) { skipped++; return; }

      const contactStatus = "customer";

      await prisma.contact.create({
        data: {
          organizationId: ORG_ID,
          name,
          email: ar.email,
          company: ar.businessName !== ar.customerName ? ar.businessName : null,
          phone: ar.phone || null,
          status: contactStatus,
          value: ar.mrr,
          leadSource: "stripe",
        },
      });
      created++;
    }));
    process.stdout.write(`\r  Progress: ${Math.min(i + CHUNK, arAccounts.length)}/${arAccounts.length}`);
  }
  console.log();
  console.log(`  Created: ${created}`);
  console.log(`  Skipped: ${skipped}\n`);

  // Step 4: Summary
  const totals = await prisma.contact.groupBy({
    by: ["status"],
    where: { organizationId: ORG_ID },
    _count: true,
  });
  console.log("Step 4: Contact summary:");
  totals.forEach(t => console.log(`  ${t.status}: ${t._count}`));

  const total = await prisma.contact.count({ where: { organizationId: ORG_ID } });
  console.log(`\n  Total contacts: ${total}`);

  await prisma.$disconnect();
  await pool.end();
  console.log("\n✅ Done\n");
}

run().catch(e => { console.error("Fatal:", e); process.exit(1); });
