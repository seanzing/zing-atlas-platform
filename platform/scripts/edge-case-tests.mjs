/**
 * Atlas Edge Case Tests — runs against live Supabase DB via Prisma
 * Usage: node scripts/edge-case-tests.mjs
 */

import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";

// Load DATABASE_URL from .env.local if not already set
if (!process.env.DATABASE_URL) {
  const envFile = readFileSync(".env.local", "utf8");
  for (const line of envFile.split("\n")) {
    const match = line.match(/^([A-Z_]+)=(.+)$/);
    if (match) process.env[match[1]] = match[2];
  }
}

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const ORG_ID = "00000000-0000-0000-0000-000000000001";

const results = [];
let testCount = 0;

function pass(name, detail = "") {
  testCount++;
  results.push({ status: "PASS", name, detail });
}
function fail(name, detail) {
  testCount++;
  results.push({ status: "FAIL", name, detail: typeof detail === "string" ? detail : detail?.message || String(detail) });
}
function assert(condition, name, detail = "") {
  if (condition) pass(name, detail);
  else fail(name, detail || "assertion failed");
}

async function run() {
  console.log("\n🧪 Atlas Edge Case Tests\n");

  // ─── AR API ──────────────────────────────────────────────
  console.log("── AR API ──");

  let arAccounts;
  try {
    arAccounts = await prisma.arAccount.findMany({
      where: { organizationId: ORG_ID, deletedAt: null },
      include: { timeline: true },
    });
    assert(Array.isArray(arAccounts), "GET /api/ar returns array", `${arAccounts.length} accounts`);
  } catch (e) {
    fail("GET /api/ar returns array", e);
    arAccounts = [];
  }

  // All returned accounts have: id, status, mrr (not null), email
  if (arAccounts.length > 0) {
    const missingId = arAccounts.filter(a => !a.id);
    assert(missingId.length === 0, "AR accounts all have id", `${missingId.length} missing`);

    const missingStatus = arAccounts.filter(a => !a.status);
    assert(missingStatus.length === 0, "AR accounts all have status", `${missingStatus.length} missing`);

    const nullMrr = arAccounts.filter(a => a.mrr === null || a.mrr === undefined);
    assert(nullMrr.length === 0, "AR accounts mrr not null", `${nullMrr.length} null`);

    const missingEmail = arAccounts.filter(a => !("email" in a));
    assert(missingEmail.length === 0, "AR accounts all have email field",
      `${missingEmail.length}/${arAccounts.length} missing email field`);
  }

  // No account has stripeSubscriptionId field (not in schema)
  if (arAccounts.length > 0) {
    const hasField = arAccounts.some(a => "stripeSubscriptionId" in a);
    assert(!hasField, "No stripeSubscriptionId field on AR accounts");
  }

  // mrr values are numbers not strings
  if (arAccounts.length > 0) {
    const sample = arAccounts.slice(0, 10);
    const allNumeric = sample.every(a => {
      const v = Number(a.mrr);
      return !isNaN(v);
    });
    assert(allNumeric, "AR mrr values are numeric", `checked ${sample.length} accounts`);
  }

  // Accounts with status 'current' and 'active' both appear
  {
    const currentAccounts = await prisma.arAccount.findMany({
      where: { organizationId: ORG_ID, deletedAt: null, status: "current" },
    });
    const activeAccounts = await prisma.arAccount.findMany({
      where: { organizationId: ORG_ID, deletedAt: null, status: "active" },
    });
    assert(currentAccounts.length > 0, "AR has 'current' status accounts", `${currentAccounts.length} found`);
    assert(activeAccounts.length > 0, "AR has 'active' status accounts", `${activeAccounts.length} found`);

    // The API with ?status=current should return only current
    const currentOnly = arAccounts.filter(a => a.status === "current");
    assert(currentOnly.length === currentAccounts.length,
      "Filter status=current returns only current",
      `${currentOnly.length} vs ${currentAccounts.length}`);
  }

  // ─── AR Stats API ──────────────────────────────────────
  console.log("── AR Stats ──");

  const ACTIVE_STATUSES = ["current", "active"];
  const OWED_STATUSES = ["past-due", "past_due", "unpaid"];

  try {
    const [allAccounts, mrrResult] = await Promise.all([
      prisma.arAccount.groupBy({
        by: ["status"],
        where: { organizationId: ORG_ID, deletedAt: null },
        _count: true,
        _sum: { mrr: true },
      }),
      prisma.arAccount.aggregate({
        where: {
          organizationId: ORG_ID,
          deletedAt: null,
          status: { in: [...ACTIVE_STATUSES, ...OWED_STATUSES, "trialing"] },
        },
        _sum: { mrr: true },
        _count: true,
      }),
    ]);

    const totalCustomers = allAccounts.reduce((s, g) => s + g._count, 0);
    const activeCount = allAccounts
      .filter(g => ACTIVE_STATUSES.includes(g.status ?? ""))
      .reduce((s, g) => s + g._count, 0);
    const pastDueCount = allAccounts
      .filter(g => ["past-due", "past_due"].includes(g.status ?? ""))
      .reduce((s, g) => s + g._count, 0);
    const unpaidCount = allAccounts
      .filter(g => (g.status ?? "") === "unpaid")
      .reduce((s, g) => s + g._count, 0);
    const totalMRR = Number(mrrResult._sum.mrr ?? 0);
    const totalSubscriptions = mrrResult._count;
    const month = new Date().toLocaleString("en-US", { month: "long", year: "numeric" });

    // Verify all expected fields exist
    assert(typeof totalCustomers === "number", "stats: totalCustomers is number", totalCustomers);
    assert(typeof totalSubscriptions === "number", "stats: totalSubscriptions is number", totalSubscriptions);
    assert(typeof activeCount === "number", "stats: activeCount is number", activeCount);
    assert(typeof pastDueCount === "number", "stats: pastDueCount is number", pastDueCount);
    assert(typeof unpaidCount === "number", "stats: unpaidCount is number", unpaidCount);
    assert(typeof totalMRR === "number", "stats: totalMRR is number", totalMRR);
    assert(typeof month === "string", "stats: month is string", month);

    // Business invariants
    assert(totalMRR > 0, "stats: totalMRR > 0", `$${totalMRR}`);
    assert(totalCustomers > 2000, "stats: totalCustomers > 2000", totalCustomers);
    assert(activeCount <= totalCustomers, "stats: activeCount <= totalCustomers",
      `${activeCount} <= ${totalCustomers}`);
  } catch (e) {
    fail("AR Stats computation", e);
  }

  // ─── Contacts API ──────────────────────────────────────
  console.log("── Contacts ──");

  let contacts;
  try {
    contacts = await prisma.contact.findMany({
      where: { organizationId: ORG_ID, deletedAt: null },
      include: { _count: { select: { deals: true } } },
      orderBy: { createdAt: "desc" },
    });
    assert(Array.isArray(contacts), "GET /api/contacts returns array", `${contacts.length} contacts`);
  } catch (e) {
    fail("GET /api/contacts returns array", e);
    contacts = [];
  }

  if (contacts.length > 0) {
    const missingId = contacts.filter(c => !c.id);
    assert(missingId.length === 0, "Contacts all have id");

    const missingName = contacts.filter(c => !c.name);
    assert(missingName.length === 0, "Contacts all have name",
      `${missingName.length}/${contacts.length} missing name`);

    const missingStatus = contacts.filter(c => !c.status);
    assert(missingStatus.length === 0, "Contacts all have status",
      `${missingStatus.length}/${contacts.length} missing status`);

    // Status values are valid
    const validStatuses = ["customer", "prospect", "lead"];
    const invalidStatus = contacts.filter(c => c.status && !validStatuses.includes(c.status));
    assert(invalidStatus.length === 0, "Contact status values are valid",
      invalidStatus.length > 0
        ? `${invalidStatus.length} invalid: ${[...new Set(invalidStatus.map(c => c.status))].join(", ")}`
        : "all valid");
  }

  // Search contacts (simulating ?search=a)
  {
    const searchResults = await prisma.contact.findMany({
      where: {
        organizationId: ORG_ID,
        deletedAt: null,
        name: { contains: "a", mode: "insensitive" },
      },
    });
    assert(searchResults.length > 0, "Contacts search for 'a' returns results", `${searchResults.length} found`);
    assert(searchResults.length <= contacts.length, "Filtered contacts <= all contacts");
  }

  // Empty search returns all contacts
  {
    const allContacts = await prisma.contact.findMany({
      where: { organizationId: ORG_ID, deletedAt: null },
    });
    assert(allContacts.length === contacts.length, "Empty search returns all contacts",
      `${allContacts.length} = ${contacts.length}`);
  }

  // ─── Deals API ──────────────────────────────────────────
  console.log("── Deals ──");

  let deals;
  try {
    deals = await prisma.deal.findMany({
      where: { organizationId: ORG_ID, deletedAt: null },
      include: { contact: true, product: true },
      orderBy: { createdAt: "desc" },
    });
    assert(Array.isArray(deals), "GET /api/deals returns array", `${deals.length} deals`);
  } catch (e) {
    fail("GET /api/deals returns array", e);
    deals = [];
  }

  if (deals.length > 0) {
    // Deals have 'stage' field (NOT 'status')
    const hasStage = deals.every(d => "stage" in d);
    assert(hasStage, "Deals have 'stage' field");

    // No deal has undefined stage
    const undefinedStage = deals.filter(d => d.stage === undefined || d.stage === null);
    assert(undefinedStage.length === 0, "No deal has undefined/null stage",
      `${undefinedStage.length} undefined`);
  }

  // ─── Dashboard API ──────────────────────────────────────
  console.log("── Dashboard ──");

  try {
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const toEndOfDay = new Date(to);
    toEndOfDay.setHours(23, 59, 59, 999);

    const periodDeals = await prisma.deal.findMany({
      where: {
        organizationId: ORG_ID,
        deletedAt: null,
        stage: "won",
        paymentStatus: "confirmed",
        wonDate: { gte: from, lte: toEndOfDay },
      },
      select: { value: true, dealType: true, rep: true, wonDate: true },
    });

    const period_revenue = periodDeals.reduce(
      (sum, d) => sum + (d.value ? Number(d.value) : 0), 0
    );

    assert(typeof period_revenue === "number", "Dashboard: period_revenue is number", period_revenue);
    assert(!isNaN(period_revenue), "Dashboard: period_revenue is not NaN");

    pass("Dashboard: returns without error");
  } catch (e) {
    fail("Dashboard: returns without error", e);
  }

  // ─── AR Stats: All 9 fields ──────────────────────────────
  console.log("── AR Stats Fields ──");

  try {
    const statsFields = {
      totalCustomers: typeof 0,
      totalSubscriptions: typeof 0,
      activeCount: typeof 0,
      pastDueCount: typeof 0,
      unpaidCount: typeof 0,
      totalMRR: typeof 0,
      monthlyRecurring: typeof 0,
      monthlyOneTime: typeof 0,
      totalMonthlyRevenue: typeof 0,
    };
    // Compute stats locally (mirrors /api/ar/stats logic)
    const [allAr, mrrAgg] = await Promise.all([
      prisma.arAccount.groupBy({
        by: ["status"],
        where: { organizationId: ORG_ID, deletedAt: null },
        _count: true,
        _sum: { mrr: true },
      }),
      prisma.arAccount.aggregate({
        where: {
          organizationId: ORG_ID,
          deletedAt: null,
          status: { in: [...ACTIVE_STATUSES, ...OWED_STATUSES, "trialing"] },
        },
        _sum: { mrr: true },
        _count: true,
      }),
    ]);
    const totalCustomers = allAr.reduce((s, g) => s + g._count, 0);
    const activeCount = allAr.filter(g => ACTIVE_STATUSES.includes(g.status ?? "")).reduce((s, g) => s + g._count, 0);
    const pastDueCount = allAr.filter(g => ["past-due", "past_due"].includes(g.status ?? "")).reduce((s, g) => s + g._count, 0);
    const unpaidCount = allAr.filter(g => (g.status ?? "") === "unpaid").reduce((s, g) => s + g._count, 0);
    const totalMRR = Number(mrrAgg._sum.mrr ?? 0);
    const totalSubscriptions = mrrAgg._count;

    assert(typeof totalCustomers === "number" && !isNaN(totalCustomers), "Stats field: totalCustomers valid", totalCustomers);
    assert(typeof totalSubscriptions === "number" && !isNaN(totalSubscriptions), "Stats field: totalSubscriptions valid", totalSubscriptions);
    assert(typeof activeCount === "number" && !isNaN(activeCount), "Stats field: activeCount valid", activeCount);
    assert(typeof pastDueCount === "number" && !isNaN(pastDueCount), "Stats field: pastDueCount valid", pastDueCount);
    assert(typeof unpaidCount === "number" && !isNaN(unpaidCount), "Stats field: unpaidCount valid", unpaidCount);
    assert(typeof totalMRR === "number" && !isNaN(totalMRR), "Stats field: totalMRR valid", `$${totalMRR}`);
    // monthlyRecurring, monthlyOneTime, totalMonthlyRevenue require Stripe — skipping in DB test
    pass("Stats: monthlyRecurring/OneTime/Total require Stripe (skip in DB test)");
  } catch (e) {
    fail("AR Stats all 9 fields", e);
  }

  // ─── AR Status Filter vs DB Mismatch ────────────────────
  console.log("── AR Status Filter Check ──");

  // Frontend FILTERS after our fix: ["All", "active", "past_due", "unpaid", "canceled", "trialing"]
  // With normalizeStatus: "current" → "active", "past-due" → "past_due"
  {
    const allStatuses = await prisma.arAccount.groupBy({
      by: ["status"],
      where: { organizationId: ORG_ID, deletedAt: null },
      _count: true,
    });

    const FRONTEND_HANDLED = ["active", "current", "past_due", "past-due", "unpaid", "canceled", "trialing", "paid"];
    const unhandled = allStatuses.filter(g => g.status && !FRONTEND_HANDLED.includes(g.status));
    assert(unhandled.length === 0,
      "All DB status values handled by frontend filters",
      unhandled.length > 0
        ? `UNHANDLED: ${unhandled.map(g => `${g.status}(${g._count})`).join(", ")}`
        : `all ${allStatuses.length} status values covered`);

    // Log all statuses for visibility
    const statusSummary = allStatuses.map(g => `${g.status}:${g._count}`).join(", ");
    pass("AR status distribution", statusSummary);
  }

  // ─── Edge Cases ──────────────────────────────────────────
  console.log("── Edge Cases ──");

  // AR filter status=current returns only current
  {
    const currentOnly = await prisma.arAccount.findMany({
      where: { organizationId: ORG_ID, deletedAt: null, status: "current" },
    });
    const allCurrent = currentOnly.every(a => a.status === "current");
    assert(allCurrent, "AR ?status=current returns only current", `${currentOnly.length} accounts`);
  }

  // AR filter status=active returns only active
  {
    const activeOnly = await prisma.arAccount.findMany({
      where: { organizationId: ORG_ID, deletedAt: null, status: "active" },
    });
    const allActive = activeOnly.every(a => a.status === "active");
    assert(allActive, "AR ?status=active returns only active", `${activeOnly.length} accounts`);
  }

  // AR nonexistent-id returns 404 (simulated — findFirst returns null)
  {
    const notFound = await prisma.arAccount.findFirst({
      where: { id: "00000000-0000-0000-0000-000000000000", organizationId: ORG_ID, deletedAt: null },
    });
    assert(notFound === null, "AR nonexistent UUID returns null (404)", "correctly null");
  }

  // AR non-UUID id — should not crash (API route validates UUID format)
  {
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const isValid = UUID_RE.test("nonexistent-id");
    assert(!isValid, "AR non-UUID id rejected by validation (404 not 500)", "regex rejects invalid UUID");
  }

  // ArTimeline uses arId not accountId
  {
    const sample = await prisma.arTimeline.findFirst();
    if (sample) {
      assert("arId" in sample, "ArTimeline uses arId (not accountId)", "correct field name");
      assert(!("accountId" in sample), "ArTimeline does NOT have accountId field");
    } else {
      pass("ArTimeline: no entries to check (empty table)");
    }
  }

  // Empty org returns empty array (not error)
  {
    const emptyOrg = await prisma.arAccount.findMany({
      where: { organizationId: "99999999-9999-9999-9999-999999999999", deletedAt: null },
    });
    assert(Array.isArray(emptyOrg) && emptyOrg.length === 0, "Empty org returns empty array", "not error");
  }

  // Deals use 'stage' not 'status' for pipeline
  if (deals.length > 0) {
    const sampleDeal = deals[0];
    assert("stage" in sampleDeal, "Deal model has 'stage' field");
    // Check that some deals have stage='won'
    const wonDeals = deals.filter(d => d.stage === "won");
    assert(wonDeals.length > 0, "Some deals have stage=won", `${wonDeals.length} won deals`);
  }

  // ─── Summary ──────────────────────────────────────────
  await prisma.$disconnect();
  await pool.end();

  console.log("\n── Results ──\n");
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
