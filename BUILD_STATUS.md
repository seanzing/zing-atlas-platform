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

### Open Work
- [ ] SMTP2GO webhook needs to be configured in SMTP2GO dashboard (URL: https://zing-atlas-platform-production.up.railway.app/api/webhooks/smtp2go)
- [ ] Supabase custom SMTP should be wired to SMTP2GO to remove email rate limits
- [ ] Atlas agent needs to be wired to Amy's Discord channel for direct access
- [ ] Sage should be built to own Atlas/Pixel engineering going forward

---

## Previous Build History
See git log for full history. Major milestones:
- **2026-04-02:** Security audit passes 1-4 (auth, mass assignment, Stripe webhooks, commission bugs)
- **2026-05-11:** First real customer onboarded (DISCOVER deal)
- **2026-05-15:** Launch day — full feature sprint, seed data cleared, live with real customers
