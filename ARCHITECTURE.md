# Atlas Architecture
**Last Updated:** 2026-05-15
**Written by:** Max (Chief of Staff) — capturing full session context for agent handoff

---

## What Atlas Is

Atlas is the ZING Operating Platform — a Next.js 14 web app that replaces HubSpot for ZING's internal operations. It handles sales pipeline, onboarding, billing, commissions, team management, and integrates with Pixel (the website builder) and Stripe.

**Live URL:** https://zing-atlas-platform-production.up.railway.app
**GitHub:** https://github.com/seanzing/zing-atlas-platform
**Deploys:** Railway — auto-deploys on push to `main`
**Local path:** `~/Projects/atlas/platform/` (Next.js app lives inside `platform/`)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript (strict) |
| Database | Supabase (PostgreSQL) |
| ORM | Prisma 7.6.0 |
| Auth | Supabase Auth (email/password + magic links) |
| Payments | Stripe |
| Email | SMTP2GO |
| Logging | Pino |
| Error tracking | Sentry |
| Hosting | Railway (Docker via Dockerfile) |
| CSS | Inline styles (no Tailwind) — uses Z constants from `lib/constants.ts` |

---

## Directory Structure

```
atlas/
├── platform/                    # The Next.js app
│   ├── app/
│   │   ├── (platform)/         # Authenticated app routes
│   │   │   ├── dashboard/      # Revenue/MRR dashboard
│   │   │   ├── pipeline/       # Sales pipeline (kanban)
│   │   │   ├── contacts/       # Contact CRM + detail pages
│   │   │   ├── onboarding/     # Customer onboarding workflow
│   │   │   ├── ar/             # Accounts Receivable
│   │   │   ├── settings/       # Team, products, campaigns
│   │   │   └── support/        # Support ticketing
│   │   ├── api/                # All API routes
│   │   │   ├── deals/          # Deal CRUD + won flow
│   │   │   ├── contacts/       # Contact CRUD + activity
│   │   │   ├── onboarding/     # Onboarding + items + pixel site creation
│   │   │   ├── team/           # Team members + invites + commissions
│   │   │   ├── products/       # Product board management
│   │   │   ├── pipeline/       # Pipeline stats endpoint
│   │   │   ├── ar/             # AR accounts + Stripe sync
│   │   │   ├── stripe/         # Payment links + subscriptions
│   │   │   ├── webhooks/       # Stripe + SMTP2GO + Pixel webhooks
│   │   │   └── auth/           # Auth helpers (me, google, reset)
│   │   ├── auth/               # Auth pages (callback, reset)
│   │   ├── login/              # Login page
│   │   ├── forms/              # Public forms (GBP, design brief)
│   │   └── payment-success/    # Stripe redirect landing
│   ├── components/             # Shared UI components
│   │   ├── ui.tsx              # Core UI kit (Btn, Modal, FormField, Input, Select, Badge)
│   │   ├── NewSaleModal.tsx    # Won deal creation modal
│   │   ├── Toast.tsx           # Toast notifications
│   │   ├── PageLoader.tsx      # Loading spinner
│   │   └── FloatingEmailCompose.tsx
│   ├── lib/
│   │   ├── constants.ts        # Z colors, STAGES, COMPONENT_LIBRARY, PRODUCT_BUNDLES
│   │   ├── prisma.ts           # Prisma client singleton
│   │   ├── api-auth.ts         # requireAuth() — used on every API route
│   │   ├── commission.ts       # calcDealCommission() — commission math
│   │   ├── serialize.ts        # Converts Decimal/Date for JSON
│   │   ├── heat-score.ts       # Deal heat score algorithm
│   │   └── supabase-browser.ts # Supabase browser client
│   └── prisma/
│       ├── schema.prisma       # Full DB schema
│       └── migrations/         # SQL migration files (applied manually to Supabase)
├── Dockerfile                  # Railway build — runs `npm run build` (includes prisma generate)
├── railway.toml                # Railway config (builder=dockerfile, port=3000)
├── atlas.sh                    # Spawns Atlas coding agent (Claude Code)
└── BUILD_STATUS.md             # Historical build notes
```

---

## Database (Supabase)

**Project:** nxmvslehqxvvcfunimvx.supabase.co
**Connection:** `DATABASE_URL` env var in Railway + local `.env`

### Key Tables

| Table | Purpose |
|-------|---------|
| `contacts` | CRM contacts (name, email, phone, company) |
| `deals` | Sales pipeline deals — links to contact + product |
| `onboarding` | Customer onboarding records (created when deal → won) |
| `onboarding_items` | Individual onboarding tasks per customer |
| `products` | ZING subscription products (DISCOVER/BOOST/DOMINATE) |
| `product_task_templates` | Task templates per product (drives onboarding_items) |
| `team_members` | Staff records (firstName, lastName, role, department) |
| `ar_accounts` | Accounts receivable — Stripe subscription tracking |
| `activity_log` | Email sent/received, notes, deal changes |
| `deal_notes` | Notes on deals (dept-specific) |
| `contact_notes` | Notes on contacts |
| `launch_fee_payments` | Launch fee installment tracking |
| `deployments` | (Not in Atlas — in Pixel's Supabase) |

### Important Schema Notes

- `deals.title` is `String` (required, NOT nullable) — Prisma enforces this
- `deals.rep` stores **full name** ("Elizabeth Adams") — must match TeamMember full name
- `deals.domain_type` and `deals.domain_name` — added 2026-05-15 via manual migration
- `onboarding_items.notes` stores JSON (e.g. `{ pixelSiteId: "abc123" }`)
- All tables have `deleted_at` for soft deletes (except `onboarding_items`)
- `organization_id` is hardcoded as `ORG_ID` constant — single-tenant for now

### Migrations

**Critical:** Railway does NOT run migrations automatically. Schema changes require:
1. Add field to `prisma/schema.prisma`
2. Create SQL file in `prisma/migrations/YYYYMMDDNNNNNN_name/migration.sql`
3. Run the SQL directly against Supabase:
   ```bash
   PGPASSWORD=<password> psql "postgresql://postgres@db.nxmvslehqxvvcfunimvx.supabase.co:5432/postgres" -c "ALTER TABLE ..."
   ```

The `prisma generate` step in the Dockerfile regenerates the client from the schema file — it does NOT run migrations.

---

## Authentication

- Supabase Auth (email/password)
- `requireAuth()` in `lib/api-auth.ts` — called at the top of every API route handler
- Middleware (`middleware.ts`) protects all `/(platform)/*` routes
- Public routes: `/login`, `/auth/*`, `/forms/*`, `/payment-success`, `/api/webhooks/*`, `/api/health`
- Team invite flow: Supabase `inviteUserByEmail()` → `/auth/callback` → `/auth/reset` (set password)
- **Key bug fixed 2026-05-15:** `/auth/callback` must use `NEXT_PUBLIC_APP_URL` not `request.url` — Railway's internal URL is `localhost:8080`

---

## Deal Flow (Critical — Read This)

### Won Deal Trigger
When `stage` is set to `"won"` on a deal (POST or PUT to `/api/deals`):
1. Creates an `onboarding` record
2. Creates `onboarding_items` from `product_task_templates` (or falls back to constants)
3. Sends the "Welcome to ZING — Your Next Steps" email via SMTP2GO
4. Logs an `activity_log` entry with `type: "email_sent"`
5. SMTP2GO tracking enabled (open + click)
6. Pixel site creation is **NOT** automatic — done manually from onboarding screen

### Deal Stages (Pipeline)
Defined in `lib/constants.ts` → `STAGES`:
`call-now`, `call-no-answer`, `hot-72`, `active`, `appointment`, `appt-no-show`, `marketing-appt`, `promo-hot`, `promo-cold`, `won`

**"won" does NOT appear in the pipeline kanban** (removed 2026-05-15). Won deals are accessed via contact cards and onboarding screen. Use the "✓ Mark as Won" button in the deal detail panel.

### Rep Assignment
- `deals.rep` stores full name (e.g. "Elizabeth Adams")
- Pipeline tabs filter by full name
- Leaderboard and commissions use full name matching
- Rep dropdown in deal panel: saves immediately on change

---

## Product Board

Defined in `lib/constants.ts`:
- `COMPONENT_LIBRARY` — all available service components with taskType, ownerRole, daysOffset, statusOptions
- `PRODUCT_BUNDLES` — DISCOVER / BOOST / DOMINATE component sets
- `COMPONENT_GROUPS` — visual grouping for the picker UI

Social media options (added 2026-05-15):
- `social_1` — 1 post/week · 2 weeks
- `social_2` — 2 posts/week · 2 weeks
- `social_1_3mo` — 1 post/week · 3 months
- `social_1_6mo` — 1 post/week · 6 months
- `social_1_12mo` — 1 post/week · 12 months

---

## API Patterns

### Every API Route Must:
1. Call `requireAuth()` and check `auth.error`
2. Scope all DB queries to `organizationId: ORG_ID`
3. Use a field whitelist (never spread `body` directly into Prisma)
4. Wrap in try/catch, log errors with `logger.error()`
5. Use `serialize()` on any Prisma result before returning JSON

### Deal Field Whitelist (POST + PUT)
Valid fields: `title`, `stage`, `value`, `rep`, `contactName`, `dealType`, `productId`, `contactId`, `assignedDesigner`, `launchFeeAmount`, `domainType`, `domainName`
Plus for PUT only: `wonDate`, `paymentStatus`, `stripeSubscriptionId`, `stripeCustomerId`, `deliveryDate`

**NOT valid on Deal model (do not add to whitelist):** `company`, `lostReason`, `notes`, `designer`, `designerEmail` — these caused 500 errors historically.

---

## Integrations

### SMTP2GO
- API key: `SMTP2GO_API_KEY` env var
- Sender: `ZING <noreply@zing-work.com>`
- Used for: Won deal "next steps" email
- Tracking: `track_opens: true`, `track_clicks: true`
- Webhook: POST to `/api/webhooks/smtp2go` — updates `activity_log.metadata.deliveryStatus`
- SMTP2GO dashboard webhook URL: `https://zing-atlas-platform-production.up.railway.app/api/webhooks/smtp2go`

### Stripe
- Webhook: `/api/webhooks/stripe` — handles invoice.paid, payment_failed, subscription.deleted
- Payment links: `/api/stripe/payment-link`
- Subscriptions: `/api/stripe/subscription`

### Pixel (Website Builder)
- Pixel API URL: `https://pixel.yourwebsiteexample.com/api/sites`
- Secret: `PIXEL_API_SECRET` env var
- Atlas creates Pixel sites from onboarding screen via `/api/onboarding/[id]/create-pixel-site`
- Pixel notifies Atlas when site goes live via `/api/webhooks/pixel`
- Link stored in `onboarding_items.notes` as `{ pixelSiteId: "abc123" }`

### Supabase (Auth Admin)
- `SUPABASE_SERVICE_ROLE_KEY` — used for admin operations (invite, delete user)
- Never expose this key client-side

---

## Environment Variables (Railway)

```
NEXT_PUBLIC_SUPABASE_URL=https://nxmvslehqxvvcfunimvx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
DATABASE_URL=postgresql://postgres:...@db.nxmvslehqxvvcfunimvx.supabase.co:5432/postgres
NEXT_PUBLIC_APP_URL=https://zing-atlas-platform-production.up.railway.app
SMTP2GO_API_KEY=...
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=...
PIXEL_API_SECRET=...
PIXEL_WEBHOOK_SECRET=...
ATLAS_WEBHOOK_URL=https://zing-atlas-platform-production.up.railway.app
ATLAS_WEBHOOK_SECRET=...
```

---

## Team Invite Flow

1. Admin sends invite from Settings → Users
2. POST `/api/team/invite` → `supabaseAdmin.auth.inviteUserByEmail()`
3. User gets email → clicks link → Supabase verifies → redirects to `/auth/callback?next=/auth/reset`
4. `/auth/callback` exchanges code for session, redirects to `/auth/reset`
5. User sets password → redirected to `/dashboard`

**If invite email rate-limited:** Use `set-password.cjs` script:
```bash
node ~/Projects/atlas/set-password.cjs "user@email.com" 'Password123!'
```
Always use single quotes around passwords (shells expand `!!`).

**Supabase config required:**
- Site URL: `https://zing-atlas-platform-production.up.railway.app`
- Redirect URLs: `https://zing-atlas-platform-production.up.railway.app/**`

---

## Commission Tracking

Function: `lib/commission.ts → calcDealCommission(deal, product)`

Types:
- `subscription`: `deal.value × product.commissionValue` (multiplier) + `deal.launchFeeAmount × product.launchFeeCommissionRate`
- `one-time`: `deal.value × product.launchFeeCommissionRate` (flat %)

Commission report: `/api/team/commissions` — queries won deals by date range, groups by `deal.rep` (full name), matches to team members.

---

## Deployment Process

1. Make changes to `~/Projects/atlas/platform/`
2. Run `cd ~/Projects/atlas/platform && npx tsc --noEmit` — must be clean
3. `git add -A && git commit -m "..." && git push origin main`
4. Railway auto-builds via Dockerfile
5. Build runs: `npm ci` → `npx prisma generate` → `next build`
6. If schema changed: run SQL migration manually against Supabase DB BEFORE pushing

**Railway is NOT authenticated via CLI** (token expired). Use GitHub push only.

---

## Known Footguns

1. **`tsc --noEmit` must pass before every push** — Railway build fails silently on TypeScript errors, and the old build stays live with no obvious error in the UI
2. **`request.url` in Railway = `localhost:8080`** — always use `NEXT_PUBLIC_APP_URL` for public URLs
3. **Migrations are manual** — Prisma schema ≠ DB schema until you run the SQL
4. **`deals.title` is required (not nullable)** — Prisma will throw 500 if omitted
5. **Prisma rejects unknown fields** — only whitelist fields that exist on the model
6. **SMTP2GO rate limits** on the free Supabase email — use `set-password.cjs` to bypass for team setup
