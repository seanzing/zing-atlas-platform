# Atlas Build Status

**Current Phase:** Phase 1, Week 2 — Frontend Views
**Last Updated:** 2026-03-29
**Updated By:** Atlas (Platform Engineer)

---

## Phase 1 Progress

### Setup
- [x] Agent identity files created (IDENTITY.md, SOUL.md, AGENTS.md)
- [x] Tech stack decided (Next.js + Supabase + NestJS + Railway)
- [x] SPEC.md updated to v2.0
- [x] Supabase project created
- [ ] Railway project created
- [x] GitHub repo created (zinglocal/zing-platform)
- [x] Next.js 14 project scaffolded (platform/)
- [x] Prisma schema written (all 13 tables)
- [x] First migration run against Supabase
- [x] Seed data loaded (16 contacts, 55 deals, 7 onboarding, 20 AR accounts, 7 tickets, 12 designers, 7 team members, 3 products, 5 campaigns)
- [x] Tailwind configured with ZING color palette
- [x] Supabase client utility (lib/supabase.ts)
- [x] Prisma client utility (lib/prisma.ts) with PrismaPg adapter
- [x] Pino logger configured (lib/logger.ts)
- [x] Sentry configured (instrumentation.ts, instrumentation-client.ts, global-error.tsx)
- [x] Health API route (/api/health)
- [x] Committed and pushed to origin main

### Backend
- [x] All API routes implemented (19 route files, all tested end-to-end)
- [x] Seed data loaded
- [ ] Stripe webhook handler (with idempotency)
- [ ] Circuit breakers on external calls
- [x] Sentry + Pino configured

### Frontend
- [x] App shell: Sidebar navigation with ZING Oxford Blue background
- [x] 8 nav items with SVG icons (Dashboard, Contacts, Pipeline, Onboarding, Tasks, Support, AR, Settings)
- [x] ZING logo/wordmark at top with gradient Z icon
- [x] Active state highlighting with ultramarine gradient
- [x] Main content area with correct background (#F5F7FA)
- [x] Shared UI components (Badge, Avatar, StatCard, SearchBar, Btn, Modal, FormField, Input, Select, FilterBtn)
- [x] SWR data fetching configured
- [x] Dashboard view — complete
- [x] Contacts view — complete (list + detail)
- [x] Pipeline view — complete (kanban + deal panel + won modal)
- [ ] Onboarding (by customer)
- [ ] Onboarding (by task)
- [ ] AR view
- [ ] Support tickets
- [ ] Settings

---

## Completed This Session (2026-03-29)

### Session 3: Week 2 Frontend — Dashboard, Contacts, Pipeline

Built complete frontend matching the prototype:

**App Shell:**
- Sidebar navigation (220px wide, Oxford Blue #050536 background)
- 8 nav items with SVG Heroicons: Dashboard, Contacts, Pipeline, Onboarding, Tasks, Support, AR, Settings
- ZING Local logo with gradient Z icon
- Active state: gradient background (ultramarine→violet), turquoise-light text
- User avatar (Amy Bourke / Admin) at bottom
- Next.js App Router route groups for platform layout

**Shared Components (components/ui/index.tsx):**
- Badge — pill-style colored label
- Avatar — gradient circle with initials
- StatCard — metric card with colored top stripe
- SearchBar — search input with magnifier icon
- Btn — gradient primary, secondary, danger variants
- Modal — backdrop blur overlay dialog
- FormField / Input / Select — form components
- FilterBtn — pill toggle buttons

**Dashboard (/dashboard):**
- Date range picker with 5 presets (This Month, Last Month, Last 7 Days, Last 30 Days, Year to Date) + custom dates
- 3 StatCards: Period Revenue, Today's Revenue, NRR
- Revenue by Deal Type (New/Upgrade/Add-on) with progress bars and stacked bar
- Calendar with month navigation, dot indicators on days with deals, range highlight
- Daily revenue bar chart (click bar to select day)
- Daily Breakdown panel (selected day deals)
- Period Breakdown panel (total, daily average, best day)
- Rep Leaderboard with color-coded cards, progress bars
- All data fetched from /api/dashboard and /api/deals via SWR

**Contacts (/contacts):**
- 4 StatCards counting by status (Live Customers, Active Leads, Cancelled, DNC)
- SearchBar with 5 filter buttons
- Contact table: 7-column grid with Avatar, Name, Email, Company, Campaign Badge, Lead Source Badge, Status Badge, Value
- Click row → Contact Detail page
- Add Contact modal with form fields, POST to API
- Campaign data fetched from /api/campaigns

**Contact Detail (/contacts/[id]):**
- Back navigation link
- Contact header card with large Avatar, name, company/email/phone, status badge
- 4 pill-style tabs: Customer Info, Pre Sale Comms, Post Sale Comms, Cancelled
- Customer Info: 3-column read mode, 2-column edit mode with Save/Cancel
- Secondary email toggle for active communications
- Related Deals card and Support Tickets card
- Timeline tabs with vertical colored timeline, dot indicators, channel badges

**Pipeline (/pipeline):**
- Rep tabs (All + each rep) with avatar, name, deal count
- Date range picker for won deals filtering
- 4 StatCards: Avg MRR/Deal, MRR/Biz Day, Won in Period, Appointments
- Team Leaderboard (All tab only) — clickable rep cards
- Product Breakdown bars (DISCOVER/BOOST/DOMINATE)
- Kanban board: 10 columns (call-now → won), horizontally scrollable
- Deal cards with product color stripe, contact, rep, priority badge, value
- Quick action hover buttons (Call, Text, Email, Appt)
- Drag-and-drop between stages
- Deal slide-out panel: stage mover, quick actions, SMS/Email/Calendar tabs, 5-section notes
- Won Deal modal: deal type selector, product/amount/delivery/designer, launch fee with split payments
- Add Won Deal button + modal

**Technical:**
- SWR for all data fetching with cache mutation on writes
- All data from real Supabase database (16 contacts, 55 deals, 7 team members)
- Next.js App Router with route groups for platform layout
- Inter font via next/font/google
- Inline styles matching prototype exactly (colors, radii, spacing, weights)

## What's Next

- Week 3: Onboarding views (by customer + by task), AR module, Support tickets
- Week 4: Settings module, remaining filters/search, performance review

---

## Blockers

None currently.

---

## Decisions Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-03-29 | Next.js 14 + Supabase stack | Speed to launch, Amy managing, no human dev |
| 2026-03-29 | Railway for hosting | CLI-driven, not vendor-locked |
| 2026-03-29 | Sentry + Pino from day one | Investor council correctly flagged observability gap |
| 2026-03-29 | Idempotency keys on all webhooks | Hard to retrofit, must be day-one |
| 2026-03-29 | Circuit breakers via opossum | Graceful degradation on Stripe/Twilio failures |
| 2026-03-29 | Prisma 7 with PrismaPg adapter | Prisma 7 requires driver adapters for direct DB connections; using @prisma/adapter-pg |
| 2026-03-29 | Default org_id for Phase 1 | Single-tenant Phase 1 uses static UUID; schema supports multi-tenancy |
| 2026-03-29 | SWR for frontend data fetching | Lightweight, built-in caching, revalidation. No Redux needed for Phase 1 |
| 2026-03-29 | Inline styles matching prototype | Prototype uses inline styles; matching exactly before converting to Tailwind later |
| 2026-03-29 | Port 3001 for dev (3000 occupied) | Another service uses port 3000 on this machine; dev server runs on 3001 |
