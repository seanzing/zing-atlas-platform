# Atlas — Known Issues & Decisions
**Last Updated:** 2026-05-18

This file tracks open issues, design decisions, and things to watch out for.
Any agent working on Atlas should read this before starting.

---

## Open Issues (Not Yet Fixed)

### HIGH — Commission attribution by first name only
**File:** `app/api/team/commissions/route.ts`
**Issue:** If two reps share the same first name (e.g. two "Alex"s), their commissions merge.
**Current state:** Now uses full name matching (fixed 2026-05-15) but the matching is still string-based.
**Proper fix:** Add `rep_id` FK to deals table, migrate existing data.
**Risk:** Low for now — small team.

### HIGH — `invoice.paid` deal matching
**File:** `app/api/webhooks/stripe/route.ts`
**Issue:** When a Stripe invoice is paid, the webhook needs to identify WHICH deal to mark won. Current logic matches by `stripeCustomerId` (primary) then email (fallback). May still match the wrong deal if a customer has multiple open deals.
**Status:** Works for single-deal customers (all current customers). Needs refinement for multi-product customers.
**Risk:** Low for now — no multi-deal customers yet.

### MEDIUM — No unique constraint on contact email
**Issue:** Two contacts can be created with the same email address.
**Proper fix:** DB migration: `ALTER TABLE contacts ADD CONSTRAINT contacts_email_org_unique UNIQUE (organization_id, email);`
**Risk:** Low for now — small team, no automated imports running.

### MEDIUM — Annual Stripe subscriptions show 12x MRR
**File:** `app/api/stripe/subscription/route.ts`
**Issue:** MRR calculation assumes monthly pricing. Annual plans show full year amount.
**Fix:** Divide by `interval_count` for annual plans.

### MEDIUM — No refund/dispute webhook handlers
**File:** `app/api/webhooks/stripe/route.ts`
**Issue:** `charge.refunded` and `charge.dispute.*` not handled.
**Impact:** Refunded payments won't decrease revenue or commissions.

### LOW — Race condition on AR account creation
**File:** `app/api/stripe/payment-link/route.ts`
**Issue:** TOCTOU between `findFirst` and `create` — concurrent requests could create duplicate AR accounts.
**Fix:** Wrap in `prisma.$transaction()` or add unique constraint.

### LOW — Stripe price IDs hardcoded
**File:** `lib/constants.ts`
**Issue:** Live Stripe price IDs committed to source.
**Fix:** Move to env vars.

---

## Design Decisions Made (Don't Revert Without Discussion)

### Won deals removed from pipeline kanban (2026-05-15)
Won deals no longer appear as a kanban column. They're accessed via:
- Contact card → Deals section
- Onboarding screen
- "✓ Mark as Won" button in deal detail panel
**Why:** Won deals are customers, not leads. They shouldn't sit in the sales board.

### Pixel site creation is manual (2026-05-15)
Auto-creating a Pixel site when a deal is won was disabled. Site creation happens from the onboarding screen ("Create in Pixel" button or "Link existing site").
**Why:** Wrong trigger point. The onboarding screen is where the publishing team works, not the pipeline.

### Rep stored as full name string (2026-05-15)
`deals.rep` stores "Elizabeth Adams" not an ID. All matching (pipeline filter, commissions, leaderboard) uses full name.
**Why:** Quick to implement, works for a small team. Proper fix is a `rep_id` FK.
**Side effect:** If a rep's name changes, old deals won't match.

### Migrations are manual, not automatic
The Railway Dockerfile does NOT run `prisma migrate deploy`. It only runs `prisma generate` (which regenerates the client from the schema) and `next build`.
**Why:** Safer for production — don't want automatic migrations running on every deploy.
**Required process:** Run SQL directly against Supabase before pushing schema changes.

---

## Things That Have Burned Us (Learn From These)

### TypeScript errors silently kill builds
If `tsc --noEmit` isn't run before pushing, Railway may build with errors from a previous commit's cache, or silently fail and serve the old build. Always run type check first.

### `company` field on Deal doesn't exist
The field whitelist historically included `"company"` but the Deal model has no such field. Prisma throws a 500 if it's in `dealData`. Only `contactName` is the correct field. Removed 2026-05-15.

### Supabase email rate limits
Supabase's built-in email (used for invites/password reset) has a rate limit of ~2-3/hour. Use SMTP2GO for production email. For team setup bypass, use `set-password.cjs`.

### Railway's internal port is `localhost:8080`
Any time you need the public URL of the app, use `process.env.NEXT_PUBLIC_APP_URL`. Never derive it from `request.url` — Railway proxies internally on port 8080, so `new URL(request.url).origin` = `http://localhost:8080`.

### Prisma schema ≠ DB until migration runs
You can push a commit with new fields in `schema.prisma` and the app will compile fine. But runtime Prisma calls will fail with column-not-found errors until the SQL migration is applied to the DB. The 404s on contact/onboarding pages on 2026-05-15 were caused by this.

---

## Decisions Pending (Need Amy Input)

- [ ] What happens to commissions on refunded payments?
- [ ] Should there be a unique email constraint on contacts?
- [ ] How should rep attribution work long-term? (first name string vs rep_id FK)
- [ ] Dummy/test data cleanup on onboarding screen — Amy requested, not yet done
- [ ] Elizabeth Adams has "5" next to her name in team/leaderboard — likely old test deals attributed to her. Need to identify and clean.
