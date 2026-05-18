# Atlas Build Status
**Current Phase:** Live — Post-Launch Iteration
**Last Updated:** 2026-05-15
**Build:** ✅ Passing clean (0 TypeScript errors)
**Live URL:** https://zing-atlas-platform-production.up.railway.app

---

## 2026-05-15 — Launch Day Session (Sean + Max)

### Changes Shipped

#### Bug Fixes
- **Random alphanumeric site IDs** — Pixel site creation now generates 8-char IDs (e.g. `a3f9k2m1`) with conflict retry instead of requiring manual slug input
- **Auth callback localhost redirect** — `/auth/callback` was redirecting to `localhost:8080` (Railway internal port). Fixed to use `NEXT_PUBLIC_APP_URL`
- **Team invite: deleted users re-invite blocked** — Now deletes user from Supabase Auth on team member delete, freeing email for re-invite
- **Department not saving on invite** — `department` field now extracted and persisted from invite form
- **StandaloneEntry metadata type error** — Build was failing; added `metadata` to `StandaloneEntry` interface
- **SMTP2GO webhook 404** — TypeScript error in webhook handler was silently killing every build since it was added. Fixed type casting.
- **404s on contacts/onboarding pages** — Missing DB columns (`domain_type`, `domain_name` on `deals` table). Migration run manually against Supabase.
- **Add Lead 500 error** — `company` field in deal create whitelist doesn't exist on Deal model. Prisma throws. Removed `company`, `lostReason`, `notes`, `designerEmail` from whitelist.
- **Rep name inconsistency** — Pipeline tabs, leaderboard, filter, and dropdowns all now use full name ("Elizabeth Adams") consistently
- **Deploy Preview button missing from Pixel** — `handleDeploy` function existed but was never called. Button restored to toolbar.
- **Pixel preview blank on new sites** — Iframe was gated on `site.preview_url` being set; blob preview never showed. Fixed gate to `blobUrl || site.preview_url`.
- **pixelData const redeclaration** — Build failure in `create-pixel-site/route.ts`. Old `const pixelData` line left over from before retry loop. Removed.

#### Features Added
- **Domain preference on deals** — Dropdown on new deal: "existing domain" or "new domain" with conditional required field. Shows as colored pill on contact card.
- **Social media 3/6/12 month options** — Added to component library in Settings product board
- **Email delivery tracking** — Won deal email now tracked (sent/delivered/opened/clicked) via SMTP2GO webhooks. Status badge on Activity card.
- **Deal deletion** — 🗑 button on pipeline cards (hover to reveal). Soft-deletes with confirmation.
- **One-time fee product type** — Product builder adapts fields for one-time vs subscription. Commission calculated correctly.
- **Add Lead modal** — New pipeline button creates a deal at any stage without requiring product/value. Creates contact optionally. Rep picker and existing contact search included.
- **Rep assignment in deal panel** — Rep dropdown in the deal detail slide-out. Saves immediately.
- **Won deals removed from pipeline kanban** — Won deals exit the pipeline. "✓ Mark as Won" button added to deal panel.
- **Create Pixel site from onboarding** — Modal pre-fills from onboarding record (business name, email, phone, address). All editable. Auto-links via `atlasOnboardingId`.
- **Auto Pixel site creation on won deal — DISABLED** — Removed. Site creation is manual from onboarding screen.
- **Seed data wiped** — 56 seed deals + 18 seed contacts soft-deleted. 3 real deals + 2 real contacts preserved.

### Current Build
```
npm run build → ✅ PASSES (verified locally 2026-05-15)
npx tsc --noEmit → ✅ CLEAN
```

---

## 2026-05-17 — Contacts Cleanup + Rep Column (Amy)

### Changes
- Soft-deleted all test/junk contacts and their deals (Test contacts, "hi", "2522299887", duplicate Paul Martinez, Sean Meadows test data + onboarding record)
- Added **Rep** column to contacts list — pulls rep from the contact's most recent won deal; falls back to `assignedRep` on the contact if no won deal
- API updated: `GET /api/contacts` now includes `deals` (won only) in the Prisma query and maps `rep` onto each contact response

### Build
```
npm run build → ✅ PASSES
```

---

---

## 2026-05-17 — Weekend Sprint (Sage)

### Changes Shipped

#### Critical Architecture Change — Sale Flow
- **Onboarding trigger changed** — onboarding record is now ONLY created after Stripe payment confirmed (`invoice.paid` webhook). Deal stage `won` no longer triggers onboarding creation directly. This prevents phantom onboardings before payment.
- **"Raise a Sale" terminology** — all "Mark as Won" language replaced with "Raise a Sale" throughout the UI (button labels, modals, logs)
- **New pipeline stage: `link-sent`** — added between `active` and `won`. Send Link button moves deal to `link-sent`; payment confirmation moves it to `won`.
- **WonDealModal redesigned** — replaced single "Mark as Won" button with two primary actions: "Take Payment" (opens Stripe card entry inline) and "Send Link" (emails checkout URL to customer)

#### Design Brief
- Design brief fields added to WonDealModal (Raise a Sale flow): existing site Y/N, colour scheme, services, designer notes
- Design brief always visible and editable on customer contact profile — saves on blur
- Designer dropdown in modal pulls from `team_members WHERE department = 'Design'`

#### Onboarding — By View Table
- New "By View" tab: 24-column table with inline editing for all active onboarding records
- Fields: business, customer name, rep, status, designer, designer notes, website status, published date (editable date selector), trial start/end, next billing, days since started, and per-task status columns
- DB migration: new fields added via Supabase SQL migration
- Designer notes: shared source of truth via `deal_notes` table (department='Designer') — same data in By View and customer contact page

#### Team Section — Full Build
- "Team" added to sidebar nav (after Pipeline)
- `/team` page: month selector, summary stats, per-rep cards with avatar, target progress bar, revenue, commission, deals won, live customer count
- `/api/team/performance` endpoint: full-name matching, wonDate range filter, Stripe live customer count, commission via `calcDealCommission`
- Team member edit modal: pencil button on each card, PUT to `/api/team/[id]`, active toggle
- Department field added to Add Team Member modal and Edit modal
- `/team/[id]` rep detail page: date range selector, 4 summary cards (Total Revenue, Total Commission, Deals Sold, Launch Fees), deals table with commission breakdown
- `/api/team/[id]/deals` endpoint
- Commission full-name matching fixed (was first-name-only)

#### Dashboard — Full Rebuild
- Replaced onboarding-queue dashboard with SaaS command centre
- 5 KPI cards with colored gradient top-accent bars: MRR, ARR, ARPU, Active Customers, Churn Rate
- Period selector pills: This Month / Last Month / YTD / Custom
- CSS gradient bar chart for revenue history
- Rep leaderboard, tier breakdown (DISCOVER/BOOST/DOMINATE), operational health pills (Active Leads, In Onboarding, Open Tickets, AR at Risk)
- All 10 SaaS valuation metrics: Churn Rate, LTV, CAC, LTV:CAC, Expansion Revenue, etc.
- Fixed churn rate counting soft-deleted cancelled contacts

#### Navigation Restructure
- Products → standalone page (removed from Settings)
- Marketing → standalone page
- Team Members removed from Settings (now under Team nav section)

#### Contacts
- Rep column: pulls from any deal (not just won deal) — fixes pipeline leads showing no owner
- Deal Value column: pulls from won deal
- Active Leads filter: shows all contacts with any pipeline deal (not just `status="Active Lead"`)
- ContactLink component: clickable customer names throughout pipeline, team, onboarding, support

#### UX / Other
- Clickable customer names throughout (ContactLink component)
- Rep deal count badge on pipeline tabs: active pipeline only, not won deals
- Health: uses `RAILWAY_GIT_COMMIT_SHA` env var so deploy tracking works
- Stripe webhook: matches AR accounts by `stripeCustomerId` first, then email fallback

### Build
```
npm run build → ✅ PASSES
```

---

### Open Work
- [ ] SMTP2GO webhook needs to be configured in SMTP2GO dashboard (URL: https://zing-atlas-platform-production.up.railway.app/api/webhooks/smtp2go)
- [ ] Supabase custom SMTP should be wired to SMTP2GO to remove email rate limits
- [ ] Dummy/test data cleanup on onboarding screen (Amy requested)

---

## Previous Build History
See git log for full history. Major milestones:
- **2026-04-02:** Security audit passes 1-4 (auth, mass assignment, Stripe webhooks, commission bugs)
- **2026-05-11:** First real customer onboarded (DISCOVER deal)
- **2026-05-15:** Launch day — full feature sprint, seed data cleared, live with real customers
