-- ZING Operating Platform Schema
-- All tables for the full platform

PRAGMA journal_mode=WAL;
PRAGMA foreign_keys=ON;

-- Designers (offshore + US + publishing)
CREATE TABLE IF NOT EXISTS designers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT,
  type TEXT NOT NULL DEFAULT 'us', -- offshore, us, publishing
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Sales team members
CREATE TABLE IF NOT EXISTS team_members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  role TEXT DEFAULT 'sales',
  active INTEGER NOT NULL DEFAULT 1
);

-- Campaigns / lead sources
CREATE TABLE IF NOT EXISTS campaigns (
  id TEXT PRIMARY KEY, -- e.g. CMP-1
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- sms-blast, email, paid-ads, purchased-list, referral, organic, direct-mail
  status TEXT NOT NULL DEFAULT 'active', -- active, completed, paused
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  contact_count INTEGER DEFAULT 0
);

-- Contacts
CREATE TABLE IF NOT EXISTS contacts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT,
  company TEXT,
  phone TEXT,
  status TEXT NOT NULL DEFAULT 'Lead', -- Active, Lead, Inactive
  last_contact TEXT,
  value REAL DEFAULT 0,
  notes TEXT,
  lead_source TEXT,
  campaign_id TEXT REFERENCES campaigns(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Products
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY, -- e.g. PRD-1001
  description TEXT NOT NULL,
  price REAL NOT NULL,
  category TEXT NOT NULL DEFAULT 'subscription-monthly',
  commission_type TEXT DEFAULT 'mrr-multiplier',
  commission_value REAL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Deals
CREATE TABLE IF NOT EXISTS deals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  contact_id INTEGER REFERENCES contacts(id),
  contact_name TEXT,
  rep TEXT,
  stage TEXT NOT NULL DEFAULT 'call-now',
  probability INTEGER DEFAULT 50,
  priority TEXT DEFAULT 'medium',
  due_date TEXT,
  product_id TEXT REFERENCES products(id),
  value REAL DEFAULT 0,
  won_date TEXT,
  delivery_date TEXT,
  assigned_designer TEXT,
  deal_type TEXT DEFAULT 'new', -- new, upgrade, add-on
  launch_fee_amount REAL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Launch fee payment schedule
CREATE TABLE IF NOT EXISTS launch_fee_payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  deal_id INTEGER NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  amount REAL NOT NULL,
  due_date TEXT
);

-- Onboarding records (one per won deal/customer)
CREATE TABLE IF NOT EXISTS onboarding (
  id TEXT PRIMARY KEY, -- e.g. OB-1
  customer_name TEXT NOT NULL,
  business_name TEXT,
  phone TEXT,
  email TEXT,
  existing_url TEXT,
  new_url TEXT,
  offshore_designer TEXT,
  us_designer TEXT,
  rep TEXT,
  product_id TEXT REFERENCES products(id),
  value REAL DEFAULT 0,
  won_date TEXT,
  status TEXT NOT NULL DEFAULT 'active', -- active, complete, cancelled
  deal_id INTEGER REFERENCES deals(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Onboarding items (12 per record)
CREATE TABLE IF NOT EXISTS onboarding_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  onboarding_id TEXT NOT NULL REFERENCES onboarding(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  stage TEXT NOT NULL DEFAULT 'outstanding',
  owner TEXT DEFAULT '',
  due_date TEXT
);

-- Website design sub-stage owner tracking
CREATE TABLE IF NOT EXISTS onboarding_web_owners (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  onboarding_id TEXT NOT NULL REFERENCES onboarding(id) ON DELETE CASCADE,
  stage_key TEXT NOT NULL,
  owner TEXT DEFAULT '',
  UNIQUE(onboarding_id, stage_key)
);

-- Support tickets
CREATE TABLE IF NOT EXISTS tickets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  subject TEXT NOT NULL,
  contact_id INTEGER REFERENCES contacts(id),
  contact_name TEXT,
  priority TEXT DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'open',
  category TEXT,
  description TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- AR accounts
CREATE TABLE IF NOT EXISTS ar_accounts (
  id TEXT PRIMARY KEY, -- e.g. AR-1
  business_name TEXT NOT NULL,
  customer_name TEXT,
  email TEXT,
  phone TEXT,
  product TEXT,
  mrr REAL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'current', -- current, past-due, unpaid, paid
  stripe_status TEXT,
  days_past_due INTEGER DEFAULT 0,
  amount_due REAL DEFAULT 0,
  amount_paid REAL DEFAULT 0,
  paid_date TEXT,
  last_payment_date TEXT,
  failed_date TEXT,
  subscription_created TEXT,
  reactivated INTEGER DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- AR timeline events
CREATE TABLE IF NOT EXISTS ar_timeline (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ar_id TEXT NOT NULL REFERENCES ar_accounts(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  type TEXT NOT NULL, -- text, email, call, stripe-retry, escalated, payment-received
  note TEXT
);
