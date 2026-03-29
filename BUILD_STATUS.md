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
- [ ] All API routes implemented
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

- Scaffolded Next.js 14 (App Router) project in platform/
- Installed all dependencies: @supabase/supabase-js, @supabase/ssr, prisma, @prisma/client, @prisma/adapter-pg, pino, @sentry/nextjs, opossum, bullmq
- Configured Tailwind with full ZING design system colors
- Wrote Prisma schema with all 13 tables matching SPEC.md: contacts, deals, launch_fee_payments, products, campaigns, team_members, designers, onboarding, onboarding_items, onboarding_web_owners, tickets, ar_accounts, ar_timeline
- All tables include organization_id (multi-tenancy ready), deleted_at (soft delete), created_at/updated_at (audit)
- Ran migration `init_schema` against Supabase — all tables live
- Created and ran seed script with full prototype data set
- Verified all data via count queries
- Set up Supabase client, Prisma client (with PrismaPg driver adapter for Prisma 7), and Pino structured logger
- Configured Sentry with modern Next.js instrumentation pattern
- Created health API endpoint

## What's Next

- Week 1 remaining: API routes for all entities (contacts, deals, products, campaigns, team, designers, onboarding, tickets, AR, dashboard, pipeline)
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
