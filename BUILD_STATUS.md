# Atlas Build Status

**Current Phase:** Phase 1, Week 1 — Foundation
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
- [ ] Dashboard view
- [ ] Pipeline view
- [ ] Contacts view
- [ ] Onboarding (by customer)
- [ ] Onboarding (by task)
- [ ] AR view
- [ ] Support tickets
- [ ] Settings

---

## Completed This Session (2026-03-29)

### Session 1: Scaffold + Schema + Seed
- Scaffolded Next.js 14 (App Router) project in platform/
- Installed all dependencies: @supabase/supabase-js, @supabase/ssr, prisma, @prisma/client, @prisma/adapter-pg, pino, @sentry/nextjs, opossum, bullmq
- Configured Tailwind with full ZING design system colors
- Wrote Prisma schema with all 13 tables matching SPEC.md
- Ran migration `init_schema` against Supabase — all tables live
- Created and ran seed script with full prototype data set
- Set up Supabase client, Prisma client (with PrismaPg driver adapter for Prisma 7), and Pino structured logger
- Configured Sentry with modern Next.js instrumentation pattern
- Created health API endpoint

### Session 2: All API Routes
Built and tested all 19 API route files:

| Route | Methods | Notes |
|-------|---------|-------|
| /api/contacts | GET, POST | Filterable by status, includes deal count |
| /api/contacts/[id] | GET, PUT, DELETE | GET includes deals/tickets/onboarding; DELETE = CCPA cascade hard delete |
| /api/deals | GET, POST | Filterable by stage/rep/contactId; POST with stage=won auto-creates onboarding + 12 items |
| /api/deals/[id] | GET, PUT, DELETE | PUT to stage=won auto-creates onboarding; DELETE = soft delete |
| /api/onboarding | GET, POST | Includes items and webOwners; filterable by status |
| /api/onboarding/[id] | GET, PUT | Includes items/webOwners/deal/product |
| /api/onboarding/[id]/items/[item] | PUT | Update stage/owner/dueDate on individual item |
| /api/tickets | GET, POST | Filterable by status/priority |
| /api/tickets/[id] | GET, PUT | Includes contact |
| /api/products | GET, POST | |
| /api/products/[id] | GET, PUT, DELETE | Soft delete |
| /api/campaigns | GET, POST | Includes contact count |
| /api/ar | GET | Includes timeline; filterable by status |
| /api/ar/[id] | GET, PUT | Includes timeline |
| /api/ar/[id]/timeline | POST | Adds timeline entry |
| /api/team | GET | Active members only |
| /api/designers | GET | Active designers only |
| /api/dashboard | GET | period_revenue, today_revenue, nrr, deal_type_breakdown, daily_revenue_chart, rep_leaderboard |
| /api/pipeline | GET | Filterable by from/to/rep; includes contact + product |

Key business logic implemented:
- **CCPA cascade delete**: contacts/[id] DELETE hard-deletes contact + deals + onboarding + items + webOwners + tickets + AR accounts + AR timeline
- **Won deal auto-onboarding**: POST and PUT deals auto-creates onboarding record + 12 onboarding items with spec-defined due date offsets
- **Dashboard metrics**: NRR calculation, deal type breakdown, daily revenue chart, rep leaderboard
- **Org-scoped + soft-delete**: All queries filter by organization_id and exclude deleted_at IS NOT NULL

## What's Next

- Week 2: Dashboard, Pipeline, and Contacts frontend views

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
