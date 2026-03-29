# Atlas Platform — Build Spec v2.0

**Agent:** Atlas (Platform Engineer)  
**Reports to:** Max (Chief of Staff)  
**Goal:** Replace HubSpot and unify all ZING operations into a single AI-native platform  
**Scale target:** 5,000 customers now → 100,000 customers (24 months)  
**Users:** 30 employees (growing to 200+)  
**Spec version:** 2.0 — March 2026 (updated from SQLite/Express prototype spec)

---

## Source Documents

- **UI/UX Prototype:** `/Users/zingadmin/.openclaw/media/inbound/1545ff5a-3223-4852-8345-2ab77347b07d.txt` (6,600+ line React SPA — gospel for UI)
- **Platform Spec:** `/Users/zingadmin/.openclaw/media/inbound/4752cf44-754f-47dd-b9ac-2ecd21e21310.docx` (full product spec)

Read both before building any module.

---

## Tech Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Frontend | Next.js 14 (App Router) + React | Prototype is React; Next.js adds routing, SSR, API routes in one codebase |
| Backend | NestJS | Enterprise structure, DI, module system — needed at 200+ employees |
| Database | Supabase (PostgreSQL, managed) | Managed Postgres, built-in auth, real-time, RLS for multi-tenancy, CLI-driven |
| ORM | Prisma | Type-safe queries, migration management |
| Auth | Supabase Auth | Built into Supabase, handles RBAC |
| Real-time | Supabase Realtime | Replaces Socket.io, built in |
| Queue/Cache | Upstash Redis + BullMQ | Serverless Redis, background jobs (email, SMS, AI analysis) |
| Search | Supabase FTS (Phase 1-2) → Meilisearch (Phase 3+) | No added complexity until needed |
| App Hosting | Railway | CLI-driven deploys, not cloud-vendor locked |
| Error Tracking | Sentry | Structured error tracking from day one — not console.log |
| Logging | Pino | Structured JSON logging |
| SMS | Twilio | Already in ZING stack |
| Email | Resend | Better DX than SendGrid |
| Payments | Stripe | Already in use |
| AI | Anthropic Claude API | MAX AI engine |

---

## Architecture Decisions (Non-Negotiable)

### Idempotency Keys
ALL webhook handlers (Stripe, Twilio, any inbound) MUST implement idempotency keys from day one.
Hard to retrofit. Build it in.

### Circuit Breakers
ALL external API calls (Stripe, Twilio, Claude, Resend) MUST use circuit breaker pattern (use `opossum` library).
Graceful degradation when services are down. No cascade failures.

### CCPA Erasure
Every module that stores PII must support `DELETE /api/contacts/:id` cascading through all related records.
Design the schema with this in mind from the start.

### Observability
- Sentry for error tracking (install in Week 1, not Week 9)
- Pino for structured logging (not console.log)
- Performance metrics tracked: p95/p99 API latency, DB query time, cache hit rates

### Multi-tenancy
All tables include `organization_id`. Row-level security via Supabase RLS from day one.
Even though Phase 1 is single-tenant, the schema must support multi-tenancy.

### Connection Pooling
Supabase handles connection pooling (PgBouncer built in). Use Supabase connection string, not direct Postgres.

---

## Data Model

### Core Entities

```sql
-- Multi-tenancy (all tables include this)
organization_id UUID NOT NULL

-- Soft delete (all tables)
deleted_at TIMESTAMP DEFAULT NULL

-- Audit (all tables)
created_at TIMESTAMP DEFAULT NOW()
updated_at TIMESTAMP DEFAULT NOW()
```

### contacts
```sql
id UUID PRIMARY KEY
organization_id UUID NOT NULL
name VARCHAR NOT NULL
email VARCHAR
secondary_email VARCHAR
company VARCHAR
phone VARCHAR
status VARCHAR -- 'Live Customer' | 'Active Lead' | 'Cancelled' | 'DNC'
last_contact DATE
value DECIMAL
notes TEXT
lead_source VARCHAR -- 'Email' | 'SMS' | 'Paid'
campaign_id UUID REFERENCES campaigns(id)
avatar VARCHAR -- initials
-- audit fields
```

### deals
```sql
id UUID PRIMARY KEY
organization_id UUID NOT NULL
title VARCHAR NOT NULL
contact_id UUID REFERENCES contacts(id)
contact_name VARCHAR -- denormalized for performance
rep VARCHAR
stage VARCHAR -- 'call-now' | 'call-no-answer' | 'hot-72' | 'active' | 'appointment' | 'appt-no-show' | 'marketing-appt' | 'promo-hot' | 'promo-cold' | 'won'
probability INTEGER
priority VARCHAR -- 'high' | 'medium' | 'low'
due_date DATE
product_id UUID REFERENCES products(id)
value DECIMAL
won_date DATE
delivery_date DATE
assigned_designer VARCHAR
deal_type VARCHAR -- 'new' | 'upgrade' | 'add-on'
launch_fee_amount DECIMAL
all_notes JSONB -- {reps: [], designer: [], publishing: [], accounts: [], support: []}
sms_trail JSONB
email_trail JSONB
calendar_history JSONB
-- audit fields
```

### launch_fee_payments
```sql
id UUID PRIMARY KEY
deal_id UUID REFERENCES deals(id)
amount DECIMAL
due_date DATE
```

### products
```sql
id UUID PRIMARY KEY
organization_id UUID NOT NULL
description VARCHAR NOT NULL
price DECIMAL NOT NULL
category VARCHAR -- 'subscription-monthly' | 'subscription-annual' | 'one-time'
commission_type VARCHAR -- 'mrr-multiplier' | 'percent-one-time' | 'percent-annual'
commission_value DECIMAL
-- audit fields
```

### campaigns
```sql
id UUID PRIMARY KEY (format: CMP-N)
organization_id UUID NOT NULL
name VARCHAR NOT NULL
type VARCHAR -- 'sms-blast' | 'email' | 'paid-ads' | 'purchased-list' | 'referral' | 'organic' | 'direct-mail'
status VARCHAR -- 'active' | 'completed' | 'paused'
contact_count INTEGER
-- audit fields
```

### team_members
```sql
id UUID PRIMARY KEY
organization_id UUID NOT NULL
first_name VARCHAR
last_name VARCHAR
phone VARCHAR
email VARCHAR
monthly_target DECIMAL
role VARCHAR
active BOOLEAN DEFAULT true
-- audit fields
```

### designers
```sql
id UUID PRIMARY KEY
organization_id UUID NOT NULL
name VARCHAR
email VARCHAR
team VARCHAR -- 'offshore' | 'us' | 'publishing'
active BOOLEAN DEFAULT true
```

### onboarding
```sql
id UUID PRIMARY KEY
organization_id UUID NOT NULL
deal_id UUID REFERENCES deals(id)
customer_name VARCHAR
business_name VARCHAR
phone VARCHAR
email VARCHAR
existing_url VARCHAR
new_url VARCHAR
offshore_designer VARCHAR
us_designer VARCHAR
rep VARCHAR
product_id UUID REFERENCES products(id)
value DECIMAL
won_date DATE
status VARCHAR -- 'active' | 'complete' | 'cancelled'
-- audit fields
```

### onboarding_items
```sql
id UUID PRIMARY KEY
onboarding_id UUID REFERENCES onboarding(id)
item_name VARCHAR -- 'Website Design' | 'AI Chat' | etc.
stage VARCHAR
owner VARCHAR
due_date DATE
```
12 items per onboarding. Website Design uses 8-stage workflow; others use 4-stage.

### onboarding_web_owners
```sql
id UUID PRIMARY KEY
onboarding_id UUID REFERENCES onboarding(id)
stage_key VARCHAR
owner VARCHAR
```

### tickets
```sql
id UUID PRIMARY KEY
organization_id UUID NOT NULL
subject VARCHAR
contact_id UUID REFERENCES contacts(id)
contact_name VARCHAR
priority VARCHAR -- 'high' | 'medium' | 'low'
status VARCHAR -- 'open' | 'in-progress' | 'resolved'
category VARCHAR -- 'Bug' | 'Question' | 'Feature Request' | 'Billing'
description TEXT
-- audit fields
```

### ar_accounts
```sql
id UUID PRIMARY KEY
organization_id UUID NOT NULL
business_name VARCHAR
customer_name VARCHAR
email VARCHAR
phone VARCHAR
product VARCHAR
mrr DECIMAL
status VARCHAR -- 'current' | 'past-due' | 'unpaid' | 'paid'
stripe_status VARCHAR
days_past_due INTEGER
amount_due DECIMAL
amount_paid DECIMAL
paid_date DATE
last_payment_date DATE
failed_date DATE
subscription_created DATE
reactivated BOOLEAN DEFAULT false
-- audit fields
```

### ar_timeline
```sql
id UUID PRIMARY KEY
ar_id UUID REFERENCES ar_accounts(id)
date DATE
type VARCHAR -- 'text' | 'email' | 'call' | 'stripe-retry' | 'escalated' | 'payment-received'
note TEXT
```

---

## Seed Data

On first run, seed the following:

**Designers (offshore):** Raj Patel, Priya Sharma, Arjun Singh, Meera Nair, Vikram Das  
**Designers (US):** Alex Morgan, Jordan Lee, Sam Rivera, Casey Taylor, Riley Chen  
**Publishers:** Nina Walsh, Derek Huang  

**Team Members:** Eric Stark, Elliot Farmer, Elizabeth Adams, Caden Wrightmen, Jon Alcon, Jake Friss, Zach Meade  
Monthly targets: Eric/Elliot $3,000, Elizabeth/Caden $2,500, Jon/Jake/Zach $2,000

**Products:**
- PRD-1001: DISCOVER - Website + Marketing, $59/mo, 1× MRR commission
- PRD-1002: BOOST - Website + Marketing Package, $149/mo, 1× MRR commission
- PRD-1003: DOMINATE - Website + Marketing Package, $249/mo, 2× MRR commission

Import the full dataset from the prototype file for contacts, deals, onboarding, AR, and tickets. The prototype has ~16 contacts, ~50 deals, 7 onboarding records, 20 AR accounts, 7 tickets.

---

## Business Logic

### Pipeline → Onboarding (Auto-create on Won)
When deal stage → 'won':
1. Create onboarding record
2. Create 12 onboarding_items with due dates:
   - Website Design: won_date + 14 days
   - AI Chat: +21 days
   - Landing Pages: +21 days
   - Blogs: +30 days
   - Online Bookings: +21 days
   - Memberships: +30 days
   - Social Media: +14 days
   - SMS Marketing: +30 days
   - Email Marketing: +30 days
   - GBP Optimization: +14 days
   - Google Business Reviews: +21 days
   - Local Directories: +30 days

### Commission Calculation
- MRR Multiplier: `commission = deal.value × product.commission_value`
- % One-Time: `commission = product.price × (commission_value / 100)`
- % Annual: `commission = (product.price × 12) × (commission_value / 100)`

### NRR
`NRR = (starting_mrr + expansion_mrr) / starting_mrr × 100`
- Starting MRR = sum of won deals with won_date < range start
- Expansion MRR = sum of upgrade + add-on deals in range

### MRR/Biz Day
`mrr_per_biz_day = subscription_mrr_in_period / business_days_in_period`
Business days = Mon-Fri only.

---

## API Structure

### Next.js API Routes (Phase 1)
```
GET    /api/health
GET    /api/contacts
POST   /api/contacts
PUT    /api/contacts/:id
DELETE /api/contacts/:id    ← CCPA erasure, cascades
GET    /api/contacts/:id    ← includes deals, tickets, AR, onboarding
GET    /api/deals
POST   /api/deals
PUT    /api/deals/:id
DELETE /api/deals/:id
GET    /api/onboarding
POST   /api/onboarding
PUT    /api/onboarding/:id
PUT    /api/onboarding/:id/items/:item
GET    /api/tickets
POST   /api/tickets
PUT    /api/tickets/:id
GET    /api/products
POST   /api/products
PUT    /api/products/:id
DELETE /api/products/:id
GET    /api/campaigns
POST   /api/campaigns
GET    /api/ar
PUT    /api/ar/:id
POST   /api/ar/:id/timeline
GET    /api/team
GET    /api/designers
GET    /api/dashboard?from=&to=
GET    /api/pipeline?from=&to=&rep=
POST   /api/webhooks/stripe    ← idempotency key required
```

---

## Frontend Structure

Eight sidebar views (match prototype exactly):
1. **Dashboard** — revenue metrics, daily bar chart, calendar date picker, rep leaderboard, NRR, deal type breakdown
2. **Contacts** — contact list with filters + contact detail (pre-sale/post-sale/cancellation tabs)
3. **Pipeline** — kanban by stage, rep tabs, leaderboard, product breakdown, won deal modal, deal slide-out panel
4. **Onboarding** — by customer view (expandable cards, 12-item tracker, website sub-pipeline)
5. **Tasks** — by task view (all customers grouped per onboarding item)
6. **Support** — ticket list + detail pane
7. **AR** — accounts receivable with timeline
8. **Settings** — products, campaigns, team members, designers

### Design System (exact from prototype)
```
turquoise:   #34E1D2
bluejeans:   #00AEFF
ultramarine: #3A5AFF
violet:      #9600FF
purple:      #6407FA
oxford:      #050536
bg:          #F5F7FA
card:        #FFFFFF
textPrimary: #1a1a2e
textSecondary: #5a5f7a
textMuted:   #8b90a8
border:      #E8EBF0
```

Font: Inter (Google Fonts)

---

## Phase Plan

### Phase 1 — Foundation (Weeks 1-4)
- Next.js 14 project scaffold
- Supabase project + schema + migrations (Prisma)
- All API routes implemented and tested
- Seed data loaded from prototype
- Dashboard, Pipeline, Contacts views complete
- Basic Sentry + Pino logging

### Phase 2 — Feature Complete (Weeks 5-8)
- Onboarding views (by customer + by task)
- AR module
- Support tickets
- Settings module
- Contact detail with communication timelines
- Won deal → onboarding auto-creation
- All filters, search, date ranges working

### Phase 3 — Integrations (Weeks 9-12)
- Stripe webhook → AR status updates (with idempotency)
- Circuit breakers on all external calls
- HubSpot data migration (one-time import)
- Performance review: p95/p99 latency, query benchmarks

### Phase 4 — Agent Handoff (Weeks 13-16)
- Scout re-pointed to Atlas API
- Catch re-pointed to Atlas API
- Press re-pointed to Atlas API
- Chase reads from Atlas AR instead of HubSpot
- UAT with Amy
- Go-live: HubSpot decommissioned

---

## Architecture Gates

### 500-Customer Checkpoint
Before proceeding past 500 customers, Atlas must produce:
- p95 API latency < 200ms
- p99 API latency < 500ms
- DB query time < 50ms for common queries
- Connection pool utilization < 70%
- Cache hit rate > 80% on repeated reads
- Zero known N+1 query issues

### 1,000-Customer Checkpoint
- Read replica configured in Supabase
- Table partitioning strategy defined for deals and contacts
- Load test completed at 10x current volume
- Cost per customer calculated and within spec ($0.74/customer Phase 1)

---

## Integration Points (Future — Phase 4)

| Agent | Current action | New action |
|-------|---------------|------------|
| Scout | Creates HubSpot contact on new sale | POST /api/contacts + POST /api/onboarding |
| Press | Updates HubSpot website_status | PUT /api/onboarding/:id/items/Website Design |
| Chase | Reads HubSpot website_status = unpaid | GET /api/ar?status=unpaid |
| Catch | Creates HubSpot contact on INTERESTED | POST /api/contacts |

Phase 1-3 runs alongside HubSpot. Phase 4 cuts over.

---

## Success Criteria

1. Amy can run a full day of operations from Atlas only
2. All investor-grade metrics on Dashboard (NRR, MRR growth, churn, expansion revenue, onboarding completion)
3. Pipeline, onboarding, and AR fully tracked with real data
4. Load time < 2 seconds for all views
5. Zero data in HubSpot that isn't also in Atlas (end of Phase 4)
6. All agents (Scout, Press, Chase, Catch) writing to Atlas instead of HubSpot
