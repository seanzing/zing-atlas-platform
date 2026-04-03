# Atlas Build Status

**Current Phase:** Phase 1, Week 6 — Security Hardening & Bug Fixes
**Last Updated:** 2026-04-02
**Updated By:** Atlas (Platform Engineer)

---

## Latest: Pass 4 — Deep Edge Case Audit (2026-04-02)

### Build Status
- `npm run build` — **PASSES CLEAN** (0 TypeScript errors, all routes compile)

### Pass 4 Bugs Found & Fixed (12 fixes)

#### CRITICAL — Revenue/Commission Logic

1. **Settings page commission defaults to 100% (frontend)** (`app/(platform)/settings/page.tsx`)
   - Was: `parseFloat(prodCommValue) || 1` — if user cleared the field or entered 0, commission defaulted to 100% (same bug as Pass 3 but on frontend)
   - Also: `parseFloat(prodLaunchRate) || 20` defaulted launch fee rate to 20%
   - Also: Edit product modal pre-filled with `?? 1` (100%) instead of `?? 0` for unset commission
   - Fixed: Changed all to `isNaN(parseFloat(x)) ? 0 : parseFloat(x)` and edit prefill defaults to 0

2. **commission.ts NaN propagation** (`lib/commission.ts`)
   - Was: `Number(deal.value || 0)` — if a Decimal field stored an invalid value, `Number()` returned `NaN` which propagated through all calculations, making commission reports show `NaN`
   - Fixed: Added `safeNum()` helper that returns 0 for NaN values

3. **Deal value/launchFeeAmount accepts negative numbers and strings** (`app/api/deals/route.ts`, `app/api/deals/[id]/route.ts`)
   - Was: No validation on `value` or `launchFeeAmount` — negative values corrupt revenue, strings cause NaN
   - Fixed: Added numeric validation rejecting NaN and negative values on both POST and PUT

4. **Product commission rate accepts invalid values** (`app/api/products/route.ts`, `app/api/products/[id]/route.ts`)
   - Was: `commissionValue`, `price`, `launchFeeCommissionRate` accepted negative numbers, NaN, strings
   - Fixed: Added validation — price/commissionValue must be non-negative, launchFeeCommissionRate must be 0-1

#### CRITICAL — Stripe/Payments

5. **AR retry updates status to "active" before catching payment failure** (`app/api/ar/[id]/retry/route.ts`)
   - Was: `stripe.invoices.pay()` followed by AR update, but both were in the same try block — if Stripe throws (expired card, insufficient funds), the error was caught but the AR status update had ALREADY run. Status shown as "active" even though payment failed.
   - Fixed: Wrapped `stripe.invoices.pay()` in its own try-catch. AR status only updated on confirmed success. Failed retries now log a timeline entry with the error.

6. **No webhook handler for subscription.deleted** (`app/api/webhooks/stripe/route.ts`)
   - Was: When a customer cancels their subscription in Stripe, no handler existed. MRR stayed at old value, deal remained "confirmed", AR status never changed.
   - Fixed: Added `customer.subscription.deleted` handler that: sets deal paymentStatus to "canceled", finds AR account via contact email, sets AR status to "canceled" with MRR=0, creates timeline entry.

#### HIGH — Data Integrity

7. **Contact CCPA delete crashes on deals with launch fee payments** (`app/api/contacts/[id]/route.ts`)
   - Was: Delete transaction removed deals but NOT `launch_fee_payments`. The `ON DELETE RESTRICT` FK constraint on `launch_fee_payments.deal_id` caused the entire transaction to fail, preventing contact deletion.
   - Fixed: Added `launchFeePayment.deleteMany()` for deal IDs before deal deletion in the cascade.

8. **Array[0] access without length check on onboarding templates** (`app/api/deals/route.ts:139`, `app/api/deals/[id]/route.ts:146`)
   - Was: `template.statusOptions[0].value` — crashes if `statusOptions` is empty array
   - Fixed: `template.statusOptions[0]?.value ?? "not_started"`

#### MEDIUM — Logic Errors

9. **HubSpot import error rate boundary off-by-one** (`app/api/import/hubspot/route.ts`)
   - Was: `errorRate > 0.1` — exactly 10% error rate does NOT abort (1 error in 10 deals)
   - Fixed: Changed to `errorRate >= 0.1`

10. **Notification query returns unbounded results** (`app/api/onboarding/notifications/route.ts`)
    - Was: `findMany()` with no `take` limit — could return thousands of records, causing memory issues
    - Fixed: Added `take: 200` limit

11. **getInitials crashes on empty/whitespace-only names** (`contacts/[id]/page.tsx`, `pipeline/page.tsx`)
    - Was: `name.split(" ").map(w => w[0])` — empty string produces `[""]`, `w[0]` is undefined
    - Fixed: Added `.filter(Boolean)` and `|| "?"` fallback

### Pass 4 — Items Needing Human Attention (Design Decisions)

These require Amy's input and were NOT auto-fixed:

1. **Commission attribution by firstName only** — Still uses `d.rep?.toLowerCase() === member.firstName?.toLowerCase()`. Two reps named "Alex" merge commissions. Needs: add `repId` FK field to deals table + migration.

2. **Invoice.paid moves ALL open deals to won** — If a contact has 3 open deals and pays 1 invoice, all 3 become "won". Needs business rule clarification.

3. **Stripe subscription MRR ignores billing interval** — Annual prices show 12x actual MRR. Needs: divide by `interval_count` for annual plans.

4. **No refund/dispute webhook handlers** — `charge.refunded` and `charge.dispute.*` events are not handled. Refunded payments won't decrease revenue. Needs: define what should happen (reverse commission? flag deal?).

5. **payment_intent.payment_failed not handled** — Only `invoice.payment_failed` is handled. One-time payment failures (non-subscription) are silent.

6. **HubSpot concurrent import not protected** — Two simultaneous imports can create duplicate contacts. Needs: import lock (Redis flag or DB advisory lock).

7. **AR account matched by customerName in CCPA delete** — If two contacts share the same name, the wrong AR accounts could be deleted. Needs: match by contact email or FK instead.

8. **No unique constraint on (organizationId, email) for contacts** — Duplicate contacts with same email can be created. Needs: DB migration to add unique constraint.

9. **Product soft-delete doesn't cascade to deals** — Deleted products leave orphaned deal references. Deals still display but commission calc returns 0 (safe but confusing).

10. **Team member deactivation doesn't cascade** — Deactivated reps still show as assigned on pipeline deals. Needs: UI filter or cascade.

11. **Stripe price IDs hardcoded** (`lib/constants.ts`) — Should be env vars.

12. **Race conditions** — AR account TOCTOU (payment-link), webhook idempotency (non-atomic), HubSpot duplicate contacts. All need atomic operations or locks.

13. **commissionRate in team API whitelist but missing from schema** — `team/route.ts` and `team/[id]/route.ts` accept `commissionRate` but TeamMember model has no such field. Silently dropped. Needs: either add field via migration or remove from whitelist.

### Files Modified in Pass 4
```
app/(platform)/settings/page.tsx                    — Fixed commission 100% default (3 locations)
app/(platform)/contacts/[id]/page.tsx               — Fixed getInitials empty string crash
app/(platform)/pipeline/page.tsx                    — Fixed getInitials empty string crash
app/api/ar/[id]/retry/route.ts                      — Fixed status update before error handling
app/api/contacts/[id]/route.ts                      — Added launch_fee_payments to CCPA cascade
app/api/deals/route.ts                              — Added value/launchFeeAmount validation + array[0] guard
app/api/deals/[id]/route.ts                         — Added value validation + array[0] guard
app/api/import/hubspot/route.ts                     — Fixed error rate boundary (> → >=)
app/api/onboarding/notifications/route.ts           — Added take:200 limit
app/api/products/route.ts                           — Added numeric validation on commission/price fields
app/api/products/[id]/route.ts                      — Added numeric validation on commission/price fields
app/api/webhooks/stripe/route.ts                    — Added subscription.deleted handler
lib/commission.ts                                   — Added NaN guard on all Number() conversions
```

---

## Pass 3 — Independent Bug Sweep (2026-04-02)

### Build Status
- `npm run build` — **PASSES CLEAN** (0 TypeScript errors, all 40 routes compile)

### Pass 3 Bugs Found & Fixed

#### CRITICAL — Security

1. **Deals POST — mass assignment vulnerability** (`app/api/deals/route.ts`)
   - Was: `...body` spread directly into Prisma `create` call — attacker could overwrite `organizationId`, `id`, `deletedAt`, `paymentStatus`, `stripeSubscriptionId`, etc.
   - Note: Pass 1 fixed PUT on 12 routes but **missed the POST handler on deals**
   - Fixed: Added explicit field whitelist matching the PUT handler pattern

2. **Webhook AR lookups missing organizationId** (`app/api/webhooks/stripe/route.ts`)
   - Was: `arAccount.findFirst()` in `invoice.paid` and `invoice.payment_failed` handlers queried by email only — no org filter. A Stripe event could match/update AR accounts from any organization.
   - Fixed: Added `organizationId: ORG_ID` to all 3 AR lookups (invoice.paid, payment_failed, idempotency check)

3. **Webhook deal updates missing organizationId** (`app/api/webhooks/stripe/route.ts`)
   - Was: `deal.updateMany()` calls in invoice.paid had no org filter — could update deals across orgs
   - Fixed: Added `organizationId: ORG_ID` to both `deal.updateMany()` calls

4. **Webhook contact lookup missing organizationId** (`app/api/webhooks/stripe/route.ts`)
   - Was: `contact.findFirst({ where: { email } })` had no org filter
   - Fixed: Added `organizationId: ORG_ID`

5. **Webhook processes without signature verification in production** (`app/api/webhooks/stripe/route.ts`)
   - Was: If `STRIPE_WEBHOOK_SECRET` env var was missing, webhooks were processed without any signature verification — in ALL environments including production
   - Fixed: Now rejects with 500 if `NODE_ENV === "production"` and secret is missing. Dev fallback preserved.

#### HIGH — Data Integrity

6. **Commission calculation defaults to 100%** (`lib/commission.ts`)
   - Was: `commissionValue || 1` — if commissionValue was `null` or `0`, defaulted to `1` (100% commission). A product with no commission rate configured would pay out 100% of deal value.
   - Fixed: Changed to `commissionValue ?? 0` — null defaults to 0% (no commission)

7. **Launch fee commission defaults to 20%** (`lib/commission.ts`)
   - Was: `launchFeeCommissionRate || 0.2` — if rate was `null` or `0`, defaulted to 20%
   - Fixed: Changed to `launchFeeCommissionRate ?? 0` — null defaults to 0%

#### MEDIUM — Authorization

8. **Onboarding notifications readable across orgs** (`app/api/onboarding/notifications/[id]/read/route.ts`)
   - Was: `prisma.onboardingNotification.update({ where: { id } })` — updated by ID only, no org verification. Any authenticated user could mark any notification as read in any org.
   - Fixed: Added `findFirst` check with `organizationId: ORG_ID` before update, returns 404 if not found

9. **Onboarding item status updatable across orgs** (`app/api/onboarding/items/[id]/status/route.ts`)
   - Was: `prisma.onboardingItem.findUnique({ where: { id } })` — no org verification. Users could modify items from other organizations.
   - Fixed: Added `item.onboarding?.organizationId !== ORG_ID` check, returns 404 if mismatch

### Pass 3 — Items Still Needing Human Attention

These were identified during the sweep but are design decisions or lower-priority items:

1. **Missing transactions on multi-table writes** — Deals POST/PUT create deal + onboarding + onboardingItems in sequence without `$transaction`. If item creation fails mid-way, data is left inconsistent. Same pattern in `stripe/subscription` (deal update + contact update + AR create). Recommend wrapping in `prisma.$transaction()` in a future pass.

2. **Stripe price IDs hardcoded in source code** (`lib/constants.ts:310-314`) — Live Stripe price IDs (`price_1Sham...`) are committed to source. Should be moved to environment variables for security and flexibility.

3. **Race condition: AR account duplicate creation** (`stripe/payment-link/route.ts:43-55`) — TOCTOU between `findFirst` and `create` — concurrent requests could create duplicate AR accounts for the same email.

4. **Race condition: webhook idempotency check** (`webhooks/stripe/route.ts:75-79`) — Non-atomic: two concurrent webhooks can both pass the `findFirst` check and process the same event.

5. **Date/time timezone assumptions** — Several routes use `new Date().toISOString().split("T")[0]` which converts to UTC before extracting date, but `new Date(dateString)` parses in local timezone — potential off-by-one-day errors for users in different timezones.

6. **HubSpot import hardcoded plan thresholds** (`import/hubspot/route.ts:181-183`) — `amount < 100` → DISCOVER, `<= 200` → BOOST, else DOMINATE. These price boundaries should be configurable.

### Files Modified in Pass 3
```
app/api/deals/route.ts                               — Added field whitelist to POST (mass assignment fix)
app/api/webhooks/stripe/route.ts                      — Added ORG_ID filters to 6 queries, production webhook secret enforcement
app/api/onboarding/notifications/[id]/read/route.ts   — Added org verification before update
app/api/onboarding/items/[id]/status/route.ts          — Added org verification on item lookup
lib/commission.ts                                      — Fixed dangerous default values (100% → 0%, 20% → 0%)
```

---

## Pass 2 — Auto-Fix Items (2026-04-02)

### Build Status
- `npm run build` — **PASSES CLEAN** (0 TypeScript errors, all 40 routes compile)

### Pass 2 Fixes Applied

#### CRITICAL — API Authentication
1. **Server-side session verification on all 35 API routes** (`lib/api-auth.ts` + all route files)
   - Was: Middleware only redirected browsers; REST clients bypassed auth entirely
   - Fixed: Created shared `requireAuth()` helper using `supabase.auth.getUser()` (server-validated JWT). Added to every handler in every API route (except `/api/health`, `/api/webhooks/stripe`, `/api/auth/me`)
   - Includes: `/api/import/hubspot` (Item 6) and `/api/ar/sync` (Item 7) which previously had zero authentication

2. **`middleware.ts` uses `getUser()` instead of `getSession()`** (Item 8)
   - Was: `supabase.auth.getSession()` — does not validate JWT with Supabase server, vulnerable to token replay
   - Fixed: `supabase.auth.getUser()` — validates JWT server-side on every request

#### HIGH — Session Security
3. **SWR cache cleared on sign-out** (`lib/auth-context.tsx`, Item 11)
   - Was: After sign-out, next user on same tab briefly saw previous user's cached data
   - Fixed: `cache.clear()` called before redirect to `/login`

#### MEDIUM — UX / Error Handling
4. **ErrorBoundary added to platform layout** (`components/ErrorBoundary.tsx`, `app/(platform)/layout.tsx`, Item 12)
   - Was: Any uncaught runtime error white-screened the entire app
   - Fixed: Class-based ErrorBoundary wraps page content with "Something went wrong" + "Try Again" button

5. **Loading spinners on all main pages** (Item 9)
   - Was: Pages rendered empty/zero-state while data loaded — no visual feedback
   - Fixed: Added `<PageLoader />` component (animated spinner) as early return while SWR data is `undefined`
   - Applied to: Dashboard, Contacts, Contacts Detail, Pipeline, AR, Onboarding, Settings, Support

6. **Try/catch + error toast on all frontend mutation handlers** (Item 10)
   - Was: Most mutation handlers had no try/catch and no user-visible error feedback
   - Fixed: Created shared `<Toast>` + `useToast()` hook. Wrapped all mutation handlers in try/catch with user-visible error messages
   - Applied to: Contacts (handleCreate), Contacts Detail (saveEdit), Pipeline (handleDrop, handleStageChange, submitWonDeal, submitAddWonDeal, handleSaveNotes), Support (handleCreate, handleStatusUpdate, handleAssign, handleAddNote), Settings (handleSaveProduct, handleSaveBuilder, handleSaveMember, handleDeactivateMember, handleSaveCampaign)
   - AR page already had error handling — only added PageLoader

### Items Still Needing Human Attention

These require business logic decisions and were intentionally NOT touched in Pass 2:

1. **`ORG_ID` is a hardcoded constant** — No per-user tenant resolution. Acceptable for single-tenant Phase 1, must be replaced before multi-tenant.

2. **`invoice.paid` webhook moves ALL open deals to "won"** (`webhooks/stripe/route.ts`) — Multiple open deals all marked won when any single invoice is paid. Needs business logic clarification.

3. **Commission attribution by first name only** (`team/commissions/route.ts`) — Two reps named "Alex" would have merged commission data. Needs full name or ID-based matching.

4. **Stripe subscription MRR calculation ignores billing interval** (`stripe/subscription/route.ts`) — Assumes monthly pricing. Annual prices would show 12x actual MRR.

5. **`OnboardingItem` has no `deletedAt` field** — Cannot properly soft-delete items. Consider adding a migration.

6. **`contacts/[id]` and `deals/[id]` use old Next.js 14 params type** — Will break when upgrading to Next.js 15. Other routes already use the Promise pattern.

### New Files Created in Pass 2
```
lib/api-auth.ts                — Shared requireAuth() helper for API route authentication
components/ErrorBoundary.tsx   — React ErrorBoundary with retry UI
components/PageLoader.tsx      — Animated loading spinner component
components/Toast.tsx            — Toast notification component + useToast hook
```

### Files Modified in Pass 2
```
middleware.ts                   — getSession() → getUser()
lib/auth-context.tsx            — SWR cache.clear() on sign-out
app/(platform)/layout.tsx       — ErrorBoundary wrapping page content

All 35 API route files           — Added requireAuth() to every handler
app/(platform)/dashboard/page.tsx — PageLoader
app/(platform)/contacts/page.tsx  — PageLoader + Toast + try/catch on handleCreate
app/(platform)/contacts/[id]/page.tsx — PageLoader + Toast + try/catch on saveEdit
app/(platform)/pipeline/page.tsx  — PageLoader + Toast + try/catch on 5 handlers
app/(platform)/ar/page.tsx        — PageLoader (already had error toast)
app/(platform)/onboarding/page.tsx — PageLoader
app/(platform)/settings/page.tsx  — PageLoader + Toast + try/catch on 5 handlers
app/(platform)/support/page.tsx   — PageLoader + Toast + try/catch on 4 handlers
```

---

## Pass 1: Security Audit & Bug Fix Pass (2026-04-02)

### Build Status
- `npm run build` — **PASSES CLEAN** (0 TypeScript errors, all 40 routes compile)

### Bugs Found & Fixed

#### CRITICAL — Security
1. **Stripe webhook signature not verified** (`app/api/webhooks/stripe/route.ts`)
   - Was: Only checked if `stripe-signature` header existed, never cryptographically verified
   - Fixed: Added `stripe.webhooks.constructEvent()` with `STRIPE_WEBHOOK_SECRET` (dev fallback with warning)

2. **Mass assignment on 12 API routes** (PUT/POST handlers)
   - Was: Raw request body spread directly into Prisma `create`/`update` calls — attacker could overwrite `organizationId`, `deletedAt`, `id`, etc.
   - Fixed: Added explicit field whitelists on all affected routes:
     - `ar/[id]`, `campaigns/route`, `campaigns/[id]`, `contacts/[id]`, `deals/[id]`, `onboarding/route`, `onboarding/[id]`, `products/route`, `products/[id]`, `team/route`, `team/[id]`, `tickets/route`, `tickets/[id]`

3. **Stripe client accepted empty API key** (`lib/stripe-client.ts`)
   - Was: `process.env.STRIPE_SECRET_KEY || ""` — silently initialized Stripe with empty key
   - Fixed: Now throws `Error("STRIPE_SECRET_KEY environment variable is not set")` at initialization

4. **Missing Stripe idempotency keys** (`stripe/payment-link`, `stripe/subscription`)
   - Was: No idempotency keys on `checkout.sessions.create`, `customers.create`, `subscriptions.create` — retries could create duplicates
   - Fixed: Added idempotency keys using `dealId + priceId` / `email + dealId` / `customerId + dealId + priceId`

#### HIGH — Data Integrity
5. **AR account deletion across orgs** (`contacts/[id]/route.ts` DELETE)
   - Was: `prisma.arAccount.deleteMany({ where: { customerName: contact.name } })` — deleted AR accounts from ALL orgs matching the name
   - Fixed: Added `organizationId: ORG_ID` to the where clause

6. **`auth/me` route missing try/catch** (`app/api/auth/me/route.ts`)
   - Was: Entire route handler had zero error handling — any Supabase or Prisma failure caused unhandled exception with potential stack trace leak
   - Fixed: Added try/catch, email null guard, and logger

7. **`session.url` null not handled** (`stripe/payment-link/route.ts`)
   - Was: `session.url` could be `null` in certain Stripe modes, returned as `{ success: true, checkoutUrl: null }` with HTTP 200
   - Fixed: Now returns 502 with error message if `session.url` is null

8. **`dashboard.nrr.toFixed()` crash** (`dashboard/page.tsx`)
   - Was: `dashboard.nrr.toFixed(1)` crashed with TypeError if API returned `null` for NRR
   - Fixed: `(dashboard.nrr ?? 0).toFixed(1)`

9. **Deal soft-delete only nulled `dueDate`** (`deals/[id]/route.ts` DELETE)
   - Was: `data: { dueDate: null }` — not a proper deactivation, items still appeared active
   - Fixed: `data: { dueDate: null, isActive: false }` — properly deactivates items

### Items Needing Human Attention

These were identified during the audit but require design decisions or are too risky to auto-fix:

1. **No API-level authentication** — Middleware redirects browsers to `/login` but REST clients bypass auth entirely. All 38 API routes are publicly accessible via direct HTTP. Need to add session verification inside each route handler or a shared middleware guard.

2. **`ORG_ID` is a hardcoded constant** — No per-user tenant resolution. Acceptable for single-tenant Phase 1, but must be replaced before multi-tenant support.

3. **`invoice.paid` webhook moves ALL open deals to "won"** (`webhooks/stripe/route.ts` lines 130-137) — If a contact has multiple open deals, all are marked won when any single invoice is paid. Needs business logic clarification.

4. **Commission attribution by first name only** (`team/commissions/route.ts`) — `deal.rep` matched against `member.firstName`. Two reps named "Alex" would have merged commission data. Needs full name or ID-based matching.

5. **Stripe subscription MRR calculation ignores billing interval** (`stripe/subscription/route.ts` line 77) — `price.unit_amount / 100` assumes monthly pricing. Annual prices would show 12x actual MRR.

6. **HubSpot import endpoint has no authentication** (`import/hubspot/route.ts`) — Unauthenticated POST triggers full HubSpot import with DB writes.

7. **`ar/sync` endpoint has no authentication** — Unauthenticated callers can trigger expensive Stripe sync operations.

8. **`middleware.ts` uses `getSession()` instead of `getUser()`** — Supabase security advisory: `getSession()` does not validate JWT with server, allowing token replay. Should use `getUser()` for server-side auth.

9. **Missing loading states on most frontend pages** — AR, Contacts, Dashboard, Onboarding, Pipeline, Settings, Support pages all render empty/zero-state while data loads, with no spinner or skeleton.

10. **Missing error handling on frontend fetch calls** — Most mutation handlers (`handleCreate`, `saveEdit`, `handleDrop`, etc.) have no try/catch and no user-visible error feedback.

11. **SWR cache not cleared on sign-out** (`auth-context.tsx`) — Next user logging in on same tab briefly sees previous user's cached data.

12. **No `ErrorBoundary` in platform layout** — Any uncaught runtime error in a page component white-screens the entire app.

13. **`OnboardingItem` has no `deletedAt` field** — Cannot properly soft-delete items; currently deactivated via `isActive: false` + `dueDate: null`. Consider adding a migration.

14. **`contacts/[id]` and `deals/[id]` use old Next.js 14 params type** — Will break when upgrading to Next.js 15 (`params` becomes a Promise). Other routes already use the Promise pattern.

---

## Phase 1 Progress

### Setup
- [x] Agent identity files created (IDENTITY.md, SOUL.md, AGENTS.md)
- [x] Tech stack decided (Next.js + Supabase + NestJS + Railway)
- [x] SPEC.md updated to v2.0
- [x] Supabase project created
- [x] Railway config created (railway.toml) — awaiting Amy's deploy
- [x] GitHub repo created (zinglocal/zing-platform)
- [x] Next.js 14 project scaffolded (platform/)
- [x] Prisma schema written (all 13 tables)
- [x] First migration run against Supabase
- [x] Seed data loaded
- [x] Tailwind configured with ZING color palette
- [x] Supabase client utility (lib/supabase.ts)
- [x] Prisma client utility (lib/prisma.ts) with PrismaPg adapter
- [x] Pino logger configured (lib/logger.ts)
- [x] Sentry configured
- [x] Health API route (/api/health)
- [x] .env.example created with all required env vars

### Week 1 — API Routes
- [x] 38 API routes implemented and passing build
- [x] All routes have try/catch error handling
- [x] All routes scoped to ORG_ID

### Week 2 — Frontend
- [x] Dashboard page with revenue charts
- [x] Contacts list + detail pages
- [x] Pipeline kanban board with drag-and-drop
- [x] Onboarding views (list, by-task, full, funnel)
- [x] AR accounts page with Stripe sync
- [x] Settings page with team/product/campaign management
- [x] Support ticketing page

### Week 3-5 — Features
- [x] Stripe integration (payment links, subscriptions, webhooks)
- [x] HubSpot import
- [x] Commission tracking
- [x] Onboarding task workflow with status updates and notifications

### Week 6 — Auth & Security
- [x] Supabase Auth with magic links
- [x] Middleware protecting all platform routes (getUser() server-validated)
- [x] AuthProvider context with role-based UI
- [x] Security audit — mass assignment fixes on 12 routes
- [x] Stripe webhook signature verification
- [x] Idempotency keys on Stripe operations
- [x] Server-side session verification on all 35 API routes
- [x] HubSpot import + AR sync endpoints authenticated
- [x] SWR cache cleared on sign-out
- [x] ErrorBoundary prevents white-screen crashes
- [x] Loading spinners on all 8 main pages
- [x] Error toast on all frontend mutation handlers
- [x] Build passes clean (0 errors)

---

## Files Modified in Security Audit
```
app/api/auth/me/route.ts           — Added try/catch + email null guard
app/api/webhooks/stripe/route.ts   — Added signature verification
app/api/contacts/[id]/route.ts     — Org-scoped AR delete + field whitelist on PUT
app/api/deals/[id]/route.ts        — Field whitelist on PUT + proper item deactivation
app/api/ar/[id]/route.ts           — Field whitelist on PUT
app/api/campaigns/route.ts         — Field whitelist on POST
app/api/campaigns/[id]/route.ts    — Field whitelist on PUT
app/api/onboarding/route.ts        — Field whitelist on POST
app/api/onboarding/[id]/route.ts   — Field whitelist on PUT
app/api/products/route.ts          — Field whitelist on POST
app/api/products/[id]/route.ts     — Field whitelist on PUT
app/api/team/route.ts              — Field whitelist on POST
app/api/team/[id]/route.ts         — Field whitelist on PUT
app/api/tickets/route.ts           — Field whitelist on POST
app/api/tickets/[id]/route.ts      — Field whitelist on PUT
app/api/stripe/payment-link/route.ts — Idempotency key + null URL guard
app/api/stripe/subscription/route.ts — Idempotency keys
lib/stripe-client.ts               — Fail-fast on missing key
app/(platform)/dashboard/page.tsx   — NRR null guard
```
