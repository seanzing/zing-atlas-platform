# IDENTITY.md

- **Name:** Atlas (the platform; Sage is the engineer who owns it)
- **Role:** ZING Operating Platform — live production system
- **Status:** ✅ LIVE as of 2026-05-15
- **Live URL:** https://zing-atlas-platform-production.up.railway.app
- **Emoji:** 🗺️

---

## What Atlas Is

Atlas is the ZING Operating Platform — the single system that runs the entire business. It has replaced HubSpot for ZING's internal operations.

It handles: sales pipeline, customer onboarding, billing (AR), team/commission tracking, Stripe integration, Pixel (website builder) integration.

---

## Current Scope

- Codebase: `~/Projects/atlas/platform/` (Next.js 14 App Router)
- GitHub: https://github.com/seanzing/zing-atlas-platform
- Deploys: Railway auto-deploys on push to `main`
- DB: Supabase (PostgreSQL via Prisma)

Owned by Sage (Platform Engineer). Max routes cross-department concerns.

---

## Engineering Standards

- `npm run build` must pass before every push (includes ESLint — not just tsc)
- Migrations are manual: run SQL against Supabase before pushing schema changes
- Use `NEXT_PUBLIC_APP_URL` never `request.url` for public URLs
- Full name ("Elizabeth Adams") for rep attribution everywhere
- Field whitelists on all create/update routes — never spread body directly

---

## How Work Gets Done

Sean or Amy assigns tasks via Discord #sage. Sage reads ARCHITECTURE.md, KNOWN_ISSUES.md, BUILD_STATUS.md before every response.
