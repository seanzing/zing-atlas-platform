'use strict';

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');
const { seed } = require('./db/seed');

const PORT = process.env.PORT || 3010;
const DB_PATH = path.resolve(process.env.DB_PATH || './data/zing.db');

// ── DB init ─────────────────────────────────────────────────────────────
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

const db = new Database(DB_PATH);
db.exec(fs.readFileSync(path.join(__dirname, 'db', 'schema.sql'), 'utf8'));

const contactCount = db.prepare('SELECT COUNT(*) as c FROM contacts').get();
if (contactCount.c === 0) {
  console.log('🌱 Seeding database...');
  seed(db);
}

// ── Business logic helpers ───────────────────────────────────────────────
const ONBOARDING_ITEMS = [
  'Website Design', 'AI Chat', 'Landing Pages', 'Blogs', 'Online Bookings',
  'Memberships', 'Social Media', 'SMS Marketing', 'Email Marketing',
  'GBP Optimization', 'Google Business Reviews', 'Local Directories',
];
const TASK_DUE_DAYS = {
  'Website Design': 14, 'AI Chat': 21, 'Landing Pages': 21, 'Blogs': 30,
  'Online Bookings': 21, 'Memberships': 30, 'Social Media': 14,
  'SMS Marketing': 30, 'Email Marketing': 30, 'GBP Optimization': 14,
  'Google Business Reviews': 21, 'Local Directories': 30,
};
const WEB_STAGES = ['website-started', 'first-draft', 'website-sent', 'edits-mode', 'ready-qa', 'ready-publishing', 'complete'];

function calcDueDate(wonDate, item) {
  const d = new Date(wonDate + 'T00:00:00');
  d.setDate(d.getDate() + (TASK_DUE_DAYS[item] || 30));
  return d.toISOString().split('T')[0];
}

function getNextOBId() {
  const row = db.prepare(`SELECT id FROM onboarding ORDER BY CAST(SUBSTR(id,4) AS INTEGER) DESC LIMIT 1`).get();
  if (!row) return 'OB-1';
  const n = parseInt(row.id.replace('OB-', '')) + 1;
  return `OB-${n}`;
}

function createOnboardingForDeal(deal) {
  const wonDate = deal.won_date || new Date().toISOString().split('T')[0];
  const obId = getNextOBId();

  // Insert onboarding record
  db.prepare(`
    INSERT INTO onboarding (id, customer_name, business_name, rep, product_id, value, won_date, status, deal_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?)
  `).run(obId, deal.contact_name || deal.title, deal.contact_name || deal.title,
         deal.rep, deal.product_id, deal.value, wonDate, deal.id);

  // Insert 12 onboarding items
  const insertItem = db.prepare(`
    INSERT INTO onboarding_items (onboarding_id, item_name, stage, owner, due_date)
    VALUES (?, ?, 'outstanding', '', ?)
  `);
  for (const item of ONBOARDING_ITEMS) {
    insertItem.run(obId, item, calcDueDate(wonDate, item));
  }

  // Insert web owner stubs
  const insertWebOwner = db.prepare(`
    INSERT OR IGNORE INTO onboarding_web_owners (onboarding_id, stage_key, owner) VALUES (?, ?, '')
  `);
  for (const stageKey of WEB_STAGES) {
    insertWebOwner.run(obId, stageKey);
  }

  return obId;
}

// ── Helpers for serializing OB records ──────────────────────────────────
function serializeOB(ob) {
  if (!ob) return null;
  const items = db.prepare('SELECT * FROM onboarding_items WHERE onboarding_id=? ORDER BY id').all(ob.id);
  const webOwners = db.prepare('SELECT * FROM onboarding_web_owners WHERE onboarding_id=?').all(ob.id);

  const itemsObj = {};
  const ownersObj = {};
  const dueDatesObj = {};
  for (const item of items) {
    itemsObj[item.item_name] = item.stage;
    ownersObj[item.item_name] = item.owner || '';
    dueDatesObj[item.item_name] = item.due_date || '';
  }
  const webOwnersObj = {};
  for (const wo of webOwners) {
    webOwnersObj[wo.stage_key] = wo.owner || '';
  }

  return { ...ob, items: itemsObj, owners: ownersObj, dueDates: dueDatesObj, webOwners: webOwnersObj };
}

// ── Express app ─────────────────────────────────────────────────────────
const app = express();
app.use(cors());
app.use(express.json());

// ━━━ HEALTH ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
app.get('/api/health', (req, res) => {
  res.json({ ok: true, service: 'ZING Platform' });
});

// ━━━ DEBUG ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
app.get('/api/debug-dashboard', (req, res) => {
  const results = [];
  const from = req.query.from || '2025-01-01';
  const to = req.query.to || '2025-03-31';
  const tests = [
    { name: 'won_deals', sql: "SELECT COUNT(*) as c FROM deals WHERE stage='won' AND won_date >= ? AND won_date <= ?", params: [from, to] },
    { name: 'team', sql: 'SELECT COUNT(*) as c FROM team_members WHERE active=1', params: [] },
    { name: 'starting_mrr', sql: "SELECT COALESCE(SUM(value),0) as s FROM deals WHERE stage='won' AND won_date < ?", params: [from] },
    { name: 'ar_current', sql: "SELECT COUNT(*) as c FROM ar_accounts WHERE status='current'", params: [] },
    { name: 'ar_past_due', sql: "SELECT COUNT(*) as c FROM ar_accounts WHERE status='past-due'", params: [] },
    { name: 'onboarding', sql: "SELECT COUNT(*) as total FROM onboarding", params: [] },
    { name: 'daily_rev', sql: "SELECT won_date, SUM(value) as rev FROM deals WHERE stage='won' AND won_date >= ? AND won_date <= ? GROUP BY won_date", params: [from, to] },
  ];
  for (const t of tests) {
    try {
      const r = db.prepare(t.sql).all(...t.params);
      results.push({ name: t.name, ok: true, count: r.length });
    } catch(e) {
      results.push({ name: t.name, ok: false, err: e.message, sql: t.sql });
    }
  }
  res.json({ ok: true, results });
});

// ━━━ CONTACTS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
app.get('/api/contacts', (req, res) => {
  try {
    const { status, search } = req.query;
    let q = 'SELECT * FROM contacts WHERE 1=1';
    const params = [];
    if (status) { q += ' AND status=?'; params.push(status); }
    if (search) { q += ' AND (name LIKE ? OR company LIKE ? OR email LIKE ?)'; params.push(`%${search}%`, `%${search}%`, `%${search}%`); }
    q += ' ORDER BY created_at DESC';
    const data = db.prepare(q).all(...params);
    res.json({ ok: true, data });
  } catch (e) { res.status(500).json({ ok: false, err: e.message }); }
});

app.get('/api/contacts/:id', (req, res) => {
  try {
    const contact = db.prepare('SELECT * FROM contacts WHERE id=?').get(req.params.id);
    if (!contact) return res.status(404).json({ ok: false, err: 'Contact not found' });

    const deals = db.prepare('SELECT * FROM deals WHERE contact_name=? ORDER BY created_at DESC').all(contact.name);
    const tickets = db.prepare('SELECT * FROM tickets WHERE contact_name=? ORDER BY created_at DESC').all(contact.name);
    const onboarding = db.prepare('SELECT * FROM onboarding WHERE customer_name=? OR email=? ORDER BY created_at DESC').all(contact.name, contact.email);
    const ar = db.prepare('SELECT * FROM ar_accounts WHERE customer_name=? OR email=? ORDER BY created_at DESC').all(contact.name, contact.email);

    const obWithItems = onboarding.map(ob => serializeOB(ob));
    res.json({ ok: true, data: { ...contact, deals, tickets, onboarding: obWithItems, ar } });
  } catch (e) { res.status(500).json({ ok: false, err: e.message }); }
});

app.post('/api/contacts', (req, res) => {
  try {
    const { name, email, company, phone, status = 'Lead', notes, lead_source, campaign_id, value = 0 } = req.body;
    if (!name) return res.status(400).json({ ok: false, err: 'name is required' });
    const result = db.prepare(`
      INSERT INTO contacts (name, email, company, phone, status, notes, lead_source, campaign_id, value, last_contact)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, date('now'))
    `).run(name, email, company, phone, status, notes, lead_source, campaign_id, value);
    const contact = db.prepare('SELECT * FROM contacts WHERE id=?').get(result.lastInsertRowid);
    res.status(201).json({ ok: true, data: contact });
  } catch (e) { res.status(500).json({ ok: false, err: e.message }); }
});

app.put('/api/contacts/:id', (req, res) => {
  try {
    const fields = ['name','email','company','phone','status','notes','lead_source','campaign_id','value','last_contact'];
    const updates = [];
    const params = [];
    for (const f of fields) {
      if (req.body[f] !== undefined) { updates.push(`${f}=?`); params.push(req.body[f]); }
    }
    if (!updates.length) return res.status(400).json({ ok: false, err: 'No fields to update' });
    params.push(req.params.id);
    db.prepare(`UPDATE contacts SET ${updates.join(', ')} WHERE id=?`).run(...params);
    const contact = db.prepare('SELECT * FROM contacts WHERE id=?').get(req.params.id);
    if (!contact) return res.status(404).json({ ok: false, err: 'Contact not found' });
    res.json({ ok: true, data: contact });
  } catch (e) { res.status(500).json({ ok: false, err: e.message }); }
});

// ━━━ DEALS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
app.get('/api/deals', (req, res) => {
  try {
    const { stage, rep, from, to } = req.query;
    let q = 'SELECT * FROM deals WHERE 1=1';
    const params = [];
    if (stage) { q += ' AND stage=?'; params.push(stage); }
    if (rep) { q += ' AND rep=?'; params.push(rep); }
    if (from) { q += " AND (stage != 'won' OR won_date >= ?)"; params.push(from); }
    if (to) { q += " AND (stage != 'won' OR won_date <= ?)"; params.push(to); }
    q += ' ORDER BY created_at DESC';
    const data = db.prepare(q).all(...params);
    res.json({ ok: true, data });
  } catch (e) { res.status(500).json({ ok: false, err: e.message }); }
});

app.post('/api/deals', (req, res) => {
  try {
    const {
      title, contact_name, rep, stage = 'call-now', probability = 50, priority = 'medium',
      due_date, product_id, value = 0, won_date, delivery_date, assigned_designer,
      deal_type = 'new', launch_fee_amount = 0, launch_fee_payments
    } = req.body;
    if (!title) return res.status(400).json({ ok: false, err: 'title is required' });

    const result = db.prepare(`
      INSERT INTO deals (title, contact_name, rep, stage, probability, priority, due_date,
        product_id, value, won_date, delivery_date, assigned_designer, deal_type, launch_fee_amount)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(title, contact_name, rep, stage, probability, priority, due_date,
           product_id, value, won_date, delivery_date, assigned_designer, deal_type, launch_fee_amount);

    const dealId = result.lastInsertRowid;

    // Insert launch fee payments if provided
    if (launch_fee_payments && Array.isArray(launch_fee_payments)) {
      const insertPmt = db.prepare('INSERT INTO launch_fee_payments (deal_id, amount, due_date) VALUES (?, ?, ?)');
      for (const pmt of launch_fee_payments) {
        insertPmt.run(dealId, pmt.amount, pmt.due_date);
      }
    }

    // Auto-create onboarding if stage=won
    if (stage === 'won') {
      const deal = db.prepare('SELECT * FROM deals WHERE id=?').get(dealId);
      createOnboardingForDeal(deal);
    }

    const deal = db.prepare('SELECT * FROM deals WHERE id=?').get(dealId);
    res.status(201).json({ ok: true, data: deal });
  } catch (e) { res.status(500).json({ ok: false, err: e.message }); }
});

app.put('/api/deals/:id', (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM deals WHERE id=?').get(req.params.id);
    if (!existing) return res.status(404).json({ ok: false, err: 'Deal not found' });

    const fields = ['title','contact_name','rep','stage','probability','priority','due_date',
                    'product_id','value','won_date','delivery_date','assigned_designer','deal_type','launch_fee_amount'];
    const updates = [];
    const params = [];
    for (const f of fields) {
      if (req.body[f] !== undefined) { updates.push(`${f}=?`); params.push(req.body[f]); }
    }
    if (!updates.length) return res.status(400).json({ ok: false, err: 'No fields to update' });
    params.push(req.params.id);
    db.prepare(`UPDATE deals SET ${updates.join(', ')} WHERE id=?`).run(...params);

    const deal = db.prepare('SELECT * FROM deals WHERE id=?').get(req.params.id);

    // Auto-create onboarding when stage transitions to won
    if (req.body.stage === 'won' && existing.stage !== 'won') {
      // Set won_date if not provided
      if (!deal.won_date) {
        const today = new Date().toISOString().split('T')[0];
        db.prepare('UPDATE deals SET won_date=? WHERE id=?').run(today, req.params.id);
      }
      const updatedDeal = db.prepare('SELECT * FROM deals WHERE id=?').get(req.params.id);
      // Only create if no onboarding exists for this deal
      const existingOB = db.prepare('SELECT id FROM onboarding WHERE deal_id=?').get(req.params.id);
      if (!existingOB) {
        createOnboardingForDeal(updatedDeal);
      }
    }

    res.json({ ok: true, data: db.prepare('SELECT * FROM deals WHERE id=?').get(req.params.id) });
  } catch (e) { res.status(500).json({ ok: false, err: e.message }); }
});

app.delete('/api/deals/:id', (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM deals WHERE id=?').get(req.params.id);
    if (!existing) return res.status(404).json({ ok: false, err: 'Deal not found' });
    db.prepare('DELETE FROM deals WHERE id=?').run(req.params.id);
    res.json({ ok: true, data: { deleted: true, id: req.params.id } });
  } catch (e) { res.status(500).json({ ok: false, err: e.message }); }
});

// ━━━ ONBOARDING ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
app.get('/api/onboarding/:id', (req, res) => {
  try {
    const ob = db.prepare('SELECT * FROM onboarding WHERE id=?').get(req.params.id);
    if (!ob) return res.status(404).json({ ok: false, err: 'Onboarding not found' });
    res.json({ ok: true, data: serializeOB(ob) });
  } catch (e) { res.status(500).json({ ok: false, err: e.message }); }
});

app.get('/api/onboarding', (req, res) => {
  try {
    const { status, rep } = req.query;
    let q = 'SELECT * FROM onboarding WHERE 1=1';
    const params = [];
    if (status) { q += ' AND status=?'; params.push(status); }
    if (rep) { q += ' AND rep=?'; params.push(rep); }
    q += ' ORDER BY created_at DESC';
    const records = db.prepare(q).all(...params);
    res.json({ ok: true, data: records.map(ob => serializeOB(ob)) });
  } catch (e) { res.status(500).json({ ok: false, err: e.message }); }
});

app.post('/api/onboarding', (req, res) => {
  try {
    const {
      customer_name, business_name, phone, email, existing_url, new_url,
      offshore_designer, us_designer, rep, product_id, value = 0, won_date, deal_id
    } = req.body;
    if (!customer_name) return res.status(400).json({ ok: false, err: 'customer_name is required' });

    const obId = getNextOBId();
    const wDate = won_date || new Date().toISOString().split('T')[0];

    db.prepare(`
      INSERT INTO onboarding (id, customer_name, business_name, phone, email, existing_url, new_url,
        offshore_designer, us_designer, rep, product_id, value, won_date, status, deal_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)
    `).run(obId, customer_name, business_name, phone, email, existing_url, new_url,
           offshore_designer, us_designer, rep, product_id, value, wDate, deal_id || null);

    // Create default items
    const insertItem = db.prepare(`
      INSERT INTO onboarding_items (onboarding_id, item_name, stage, owner, due_date)
      VALUES (?, ?, 'outstanding', '', ?)
    `);
    for (const item of ONBOARDING_ITEMS) {
      insertItem.run(obId, item, calcDueDate(wDate, item));
    }
    for (const stageKey of WEB_STAGES) {
      db.prepare('INSERT OR IGNORE INTO onboarding_web_owners (onboarding_id, stage_key, owner) VALUES (?, ?, "")').run(obId, stageKey);
    }

    const ob = db.prepare('SELECT * FROM onboarding WHERE id=?').get(obId);
    res.status(201).json({ ok: true, data: serializeOB(ob) });
  } catch (e) { res.status(500).json({ ok: false, err: e.message }); }
});

app.put('/api/onboarding/:id', (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM onboarding WHERE id=?').get(req.params.id);
    if (!existing) return res.status(404).json({ ok: false, err: 'Onboarding not found' });

    const fields = ['customer_name','business_name','phone','email','existing_url','new_url',
                    'offshore_designer','us_designer','rep','product_id','value','won_date','status'];
    const updates = [];
    const params = [];
    for (const f of fields) {
      if (req.body[f] !== undefined) { updates.push(`${f}=?`); params.push(req.body[f]); }
    }
    if (updates.length) {
      params.push(req.params.id);
      db.prepare(`UPDATE onboarding SET ${updates.join(', ')} WHERE id=?`).run(...params);
    }

    const ob = db.prepare('SELECT * FROM onboarding WHERE id=?').get(req.params.id);
    res.json({ ok: true, data: serializeOB(ob) });
  } catch (e) { res.status(500).json({ ok: false, err: e.message }); }
});

// Update a single onboarding item
app.put('/api/onboarding/:id/items/:item', (req, res) => {
  try {
    const ob = db.prepare('SELECT * FROM onboarding WHERE id=?').get(req.params.id);
    if (!ob) return res.status(404).json({ ok: false, err: 'Onboarding not found' });

    const itemName = decodeURIComponent(req.params.item);
    const { stage, owner, due_date } = req.body;

    const item = db.prepare('SELECT * FROM onboarding_items WHERE onboarding_id=? AND item_name=?').get(req.params.id, itemName);
    if (!item) return res.status(404).json({ ok: false, err: 'Item not found' });

    const updates = [];
    const params = [];
    if (stage !== undefined) { updates.push('stage=?'); params.push(stage); }
    if (owner !== undefined) { updates.push('owner=?'); params.push(owner); }
    if (due_date !== undefined) { updates.push('due_date=?'); params.push(due_date); }
    if (updates.length) {
      params.push(req.params.id, itemName);
      db.prepare(`UPDATE onboarding_items SET ${updates.join(', ')} WHERE onboarding_id=? AND item_name=?`).run(...params);
    }

    res.json({ ok: true, data: serializeOB(db.prepare('SELECT * FROM onboarding WHERE id=?').get(req.params.id)) });
  } catch (e) { res.status(500).json({ ok: false, err: e.message }); }
});

// Update web owner for a stage
app.put('/api/onboarding/:id/web-owners/:stage', (req, res) => {
  try {
    const ob = db.prepare('SELECT * FROM onboarding WHERE id=?').get(req.params.id);
    if (!ob) return res.status(404).json({ ok: false, err: 'Onboarding not found' });

    const { owner } = req.body;
    db.prepare(`
      INSERT OR REPLACE INTO onboarding_web_owners (onboarding_id, stage_key, owner)
      VALUES (?, ?, ?)
    `).run(req.params.id, req.params.stage, owner || '');

    res.json({ ok: true, data: serializeOB(db.prepare('SELECT * FROM onboarding WHERE id=?').get(req.params.id)) });
  } catch (e) { res.status(500).json({ ok: false, err: e.message }); }
});

// ━━━ TICKETS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
app.get('/api/tickets', (req, res) => {
  try {
    const { status, priority, search } = req.query;
    let q = 'SELECT * FROM tickets WHERE 1=1';
    const params = [];
    if (status) { q += ' AND status=?'; params.push(status); }
    if (priority) { q += ' AND priority=?'; params.push(priority); }
    if (search) { q += ' AND (subject LIKE ? OR contact_name LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
    q += ' ORDER BY created_at DESC';
    res.json({ ok: true, data: db.prepare(q).all(...params) });
  } catch (e) { res.status(500).json({ ok: false, err: e.message }); }
});

app.post('/api/tickets', (req, res) => {
  try {
    const { subject, contact_name, priority = 'medium', category, description } = req.body;
    if (!subject) return res.status(400).json({ ok: false, err: 'subject is required' });
    const result = db.prepare(`
      INSERT INTO tickets (subject, contact_name, priority, status, category, description)
      VALUES (?, ?, ?, 'open', ?, ?)
    `).run(subject, contact_name, priority, category, description);
    const ticket = db.prepare('SELECT * FROM tickets WHERE id=?').get(result.lastInsertRowid);
    res.status(201).json({ ok: true, data: ticket });
  } catch (e) { res.status(500).json({ ok: false, err: e.message }); }
});

app.put('/api/tickets/:id', (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM tickets WHERE id=?').get(req.params.id);
    if (!existing) return res.status(404).json({ ok: false, err: 'Ticket not found' });

    const fields = ['subject','contact_name','priority','status','category','description'];
    const updates = [];
    const params = [];
    for (const f of fields) {
      if (req.body[f] !== undefined) { updates.push(`${f}=?`); params.push(req.body[f]); }
    }
    if (!updates.length) return res.status(400).json({ ok: false, err: 'No fields to update' });
    params.push(req.params.id);
    db.prepare(`UPDATE tickets SET ${updates.join(', ')} WHERE id=?`).run(...params);
    res.json({ ok: true, data: db.prepare('SELECT * FROM tickets WHERE id=?').get(req.params.id) });
  } catch (e) { res.status(500).json({ ok: false, err: e.message }); }
});

// ━━━ PRODUCTS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
app.get('/api/products', (req, res) => {
  try {
    res.json({ ok: true, data: db.prepare('SELECT * FROM products ORDER BY price ASC').all() });
  } catch (e) { res.status(500).json({ ok: false, err: e.message }); }
});

app.post('/api/products', (req, res) => {
  try {
    const { description, price, category = 'subscription-monthly', commission_type = 'mrr-multiplier', commission_value = 1 } = req.body;
    if (!description || price == null) return res.status(400).json({ ok: false, err: 'description and price are required' });

    // Auto-generate ID
    const lastId = db.prepare('SELECT id FROM products ORDER BY id DESC LIMIT 1').get();
    let nextNum = 1004;
    if (lastId) {
      const match = lastId.id.match(/PRD-(\d+)/);
      if (match) nextNum = parseInt(match[1]) + 1;
    }
    const newId = `PRD-${String(nextNum).padStart(4, '0')}`;

    db.prepare(`
      INSERT INTO products (id, description, price, category, commission_type, commission_value)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(newId, description, price, category, commission_type, commission_value);

    res.status(201).json({ ok: true, data: db.prepare('SELECT * FROM products WHERE id=?').get(newId) });
  } catch (e) { res.status(500).json({ ok: false, err: e.message }); }
});

app.put('/api/products/:id', (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM products WHERE id=?').get(req.params.id);
    if (!existing) return res.status(404).json({ ok: false, err: 'Product not found' });

    const fields = ['description','price','category','commission_type','commission_value'];
    const updates = [];
    const params = [];
    for (const f of fields) {
      if (req.body[f] !== undefined) { updates.push(`${f}=?`); params.push(req.body[f]); }
    }
    if (!updates.length) return res.status(400).json({ ok: false, err: 'No fields to update' });
    params.push(req.params.id);
    db.prepare(`UPDATE products SET ${updates.join(', ')} WHERE id=?`).run(...params);
    res.json({ ok: true, data: db.prepare('SELECT * FROM products WHERE id=?').get(req.params.id) });
  } catch (e) { res.status(500).json({ ok: false, err: e.message }); }
});

app.delete('/api/products/:id', (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM products WHERE id=?').get(req.params.id);
    if (!existing) return res.status(404).json({ ok: false, err: 'Product not found' });
    db.prepare('DELETE FROM products WHERE id=?').run(req.params.id);
    res.json({ ok: true, data: { deleted: true, id: req.params.id } });
  } catch (e) { res.status(500).json({ ok: false, err: e.message }); }
});

// ━━━ CAMPAIGNS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
app.get('/api/campaigns', (req, res) => {
  try {
    res.json({ ok: true, data: db.prepare('SELECT * FROM campaigns ORDER BY created_at DESC').all() });
  } catch (e) { res.status(500).json({ ok: false, err: e.message }); }
});

app.post('/api/campaigns', (req, res) => {
  try {
    const { name, type, status = 'active', contact_count = 0 } = req.body;
    if (!name || !type) return res.status(400).json({ ok: false, err: 'name and type are required' });

    const lastId = db.prepare('SELECT id FROM campaigns ORDER BY CAST(SUBSTR(id,5) AS INTEGER) DESC LIMIT 1').get();
    let nextNum = 6;
    if (lastId) {
      const match = lastId.id.match(/CMP-(\d+)/);
      if (match) nextNum = parseInt(match[1]) + 1;
    }
    const newId = `CMP-${nextNum}`;
    db.prepare('INSERT INTO campaigns (id, name, type, status, contact_count) VALUES (?, ?, ?, ?, ?)').run(newId, name, type, status, contact_count);
    res.status(201).json({ ok: true, data: db.prepare('SELECT * FROM campaigns WHERE id=?').get(newId) });
  } catch (e) { res.status(500).json({ ok: false, err: e.message }); }
});

// ━━━ AR ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function serializeAR(ar) {
  if (!ar) return null;
  const timeline = db.prepare('SELECT * FROM ar_timeline WHERE ar_id=? ORDER BY date ASC').all(ar.id);
  return { ...ar, timeline };
}

app.get('/api/ar', (req, res) => {
  try {
    const { status } = req.query;
    let q = 'SELECT * FROM ar_accounts WHERE 1=1';
    const params = [];
    if (status) { q += ' AND status=?'; params.push(status); }
    q += ' ORDER BY created_at DESC';
    const records = db.prepare(q).all(...params);
    res.json({ ok: true, data: records.map(ar => serializeAR(ar)) });
  } catch (e) { res.status(500).json({ ok: false, err: e.message }); }
});

app.post('/api/ar', (req, res) => {
  try {
    const {
      business_name, customer_name, email, phone, product, mrr = 0,
      status = 'current', stripe_status, subscription_created
    } = req.body;
    if (!business_name) return res.status(400).json({ ok: false, err: 'business_name is required' });

    const lastId = db.prepare('SELECT id FROM ar_accounts ORDER BY CAST(SUBSTR(id,4) AS INTEGER) DESC LIMIT 1').get();
    let nextNum = 21;
    if (lastId) {
      const match = lastId.id.match(/AR-(\d+)/);
      if (match) nextNum = parseInt(match[1]) + 1;
    }
    const newId = `AR-${nextNum}`;
    db.prepare(`
      INSERT INTO ar_accounts (id, business_name, customer_name, email, phone, product, mrr, status, stripe_status, subscription_created)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(newId, business_name, customer_name, email, phone, product, mrr, status, stripe_status, subscription_created);
    res.status(201).json({ ok: true, data: serializeAR(db.prepare('SELECT * FROM ar_accounts WHERE id=?').get(newId)) });
  } catch (e) { res.status(500).json({ ok: false, err: e.message }); }
});

app.put('/api/ar/:id', (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM ar_accounts WHERE id=?').get(req.params.id);
    if (!existing) return res.status(404).json({ ok: false, err: 'AR account not found' });

    const fields = ['business_name','customer_name','email','phone','product','mrr','status',
                    'stripe_status','days_past_due','amount_due','amount_paid','paid_date',
                    'last_payment_date','failed_date','subscription_created','reactivated'];
    const updates = [];
    const params = [];
    for (const f of fields) {
      if (req.body[f] !== undefined) { updates.push(`${f}=?`); params.push(req.body[f]); }
    }
    if (!updates.length) return res.status(400).json({ ok: false, err: 'No fields to update' });
    params.push(req.params.id);
    db.prepare(`UPDATE ar_accounts SET ${updates.join(', ')} WHERE id=?`).run(...params);
    res.json({ ok: true, data: serializeAR(db.prepare('SELECT * FROM ar_accounts WHERE id=?').get(req.params.id)) });
  } catch (e) { res.status(500).json({ ok: false, err: e.message }); }
});

app.post('/api/ar/:id/timeline', (req, res) => {
  try {
    const ar = db.prepare('SELECT * FROM ar_accounts WHERE id=?').get(req.params.id);
    if (!ar) return res.status(404).json({ ok: false, err: 'AR account not found' });

    const { date, type, note } = req.body;
    if (!type || !note) return res.status(400).json({ ok: false, err: 'type and note are required' });

    db.prepare('INSERT INTO ar_timeline (ar_id, date, type, note) VALUES (?, ?, ?, ?)').run(
      req.params.id, date || new Date().toISOString().split('T')[0], type, note
    );
    res.status(201).json({ ok: true, data: serializeAR(db.prepare('SELECT * FROM ar_accounts WHERE id=?').get(req.params.id)) });
  } catch (e) { res.status(500).json({ ok: false, err: e.message }); }
});

// ━━━ TEAM ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
app.get('/api/team', (req, res) => {
  try {
    res.json({ ok: true, data: db.prepare('SELECT * FROM team_members WHERE active=1 ORDER BY first_name').all() });
  } catch (e) { res.status(500).json({ ok: false, err: e.message }); }
});

// ━━━ DESIGNERS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
app.get('/api/designers', (req, res) => {
  try {
    const { type } = req.query;
    let q = 'SELECT * FROM designers WHERE 1=1';
    const params = [];
    if (type) { q += ' AND type=?'; params.push(type); }
    q += ' ORDER BY name ASC';
    res.json({ ok: true, data: db.prepare(q).all(...params) });
  } catch (e) { res.status(500).json({ ok: false, err: e.message }); }
});

// ━━━ DASHBOARD ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
app.get('/api/dashboard', (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const monthStart = today.slice(0, 7) + '-01';
    const from = req.query.from || monthStart;
    const to = req.query.to || today;

    // Won deals in range
    const wonDeals = db.prepare(
      "SELECT * FROM deals WHERE stage='won' AND won_date >= ? AND won_date <= ?"
    ).all(from, to);

    const totalRevenue = wonDeals.reduce((s, d) => s + (d.value || 0), 0);
    const dealCount = wonDeals.length;

    // Deal type breakdown
    const newDeals = wonDeals.filter(d => !d.deal_type || d.deal_type === 'new');
    const upgradeDeals = wonDeals.filter(d => d.deal_type === 'upgrade');
    const addonDeals = wonDeals.filter(d => d.deal_type === 'add-on');

    // Rep leaderboard
    const teamMembers = db.prepare('SELECT * FROM team_members WHERE active=1').all();
    const leaderboard = teamMembers.map(m => {
      const repName = m.first_name;
      const rd = wonDeals.filter(d => d.rep === repName);
      return {
        name: repName,
        full_name: `${m.first_name} ${m.last_name}`,
        total: rd.reduce((s, d) => s + (d.value || 0), 0),
        count: rd.length,
        appointments: db.prepare("SELECT COUNT(*) as c FROM deals WHERE rep=? AND stage IN ('appointment','marketing-appt')").get(repName).c,
      };
    }).sort((a, b) => b.total - a.total);

    // NRR calculation
    const startingMRR = db.prepare("SELECT COALESCE(SUM(value),0) as s FROM deals WHERE stage='won' AND won_date < ?").get(from).s;
    const expansionMRR = [...upgradeDeals, ...addonDeals].reduce((s, d) => s + (d.value || 0), 0);
    const nrr = startingMRR > 0 ? Math.round(((startingMRR + expansionMRR) / startingMRR) * 100) : 100;

    // MRR per biz day
    function countBizDays(f, t) {
      let count = 0;
      const cur = new Date(f + 'T00:00:00');
      const end = new Date(t + 'T00:00:00');
      while (cur <= end) {
        const dow = cur.getDay();
        if (dow !== 0 && dow !== 6) count++;
        cur.setDate(cur.getDate() + 1);
      }
      return count || 1;
    }
    const bizDays = countBizDays(from, to);
    const subMRR = wonDeals.filter(d => {
      const p = db.prepare('SELECT category FROM products WHERE id=?').get(d.product_id);
      return p && p.category === 'subscription-monthly';
    }).reduce((s, d) => s + (d.value || 0), 0);
    const mrrPerBizDay = subMRR / bizDays;

    // Daily revenue data
    const dailyRevenue = db.prepare(`
      SELECT won_date as date, SUM(value) as revenue, COUNT(*) as count
      FROM deals WHERE stage='won' AND won_date >= ? AND won_date <= ?
      GROUP BY won_date ORDER BY won_date ASC
    `).all(from, to);

    // Product breakdown
    const products = db.prepare('SELECT * FROM products').all();
    const productBreakdown = products.map(p => {
      const pd = wonDeals.filter(d => d.product_id === p.id);
      return {
        id: p.id,
        description: p.description,
        count: pd.length,
        revenue: pd.reduce((s, d) => s + (d.value || 0), 0),
      };
    });

    // AR summary
    const arSummary = {
      current: db.prepare("SELECT COUNT(*) as c, COALESCE(SUM(mrr),0) as mrr FROM ar_accounts WHERE status='current'").get(),
      pastDue: db.prepare("SELECT COUNT(*) as c, COALESCE(SUM(amount_due),0) as amount FROM ar_accounts WHERE status='past-due'").get(),
      unpaid: db.prepare("SELECT COUNT(*) as c, COALESCE(SUM(amount_due),0) as amount FROM ar_accounts WHERE status='unpaid'").get(),
    };

    // Onboarding summary
    const onboardingSummary = db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status='active' THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN status='complete' THEN 1 ELSE 0 END) as complete
      FROM onboarding
    `).get();

    res.json({
      ok: true,
      data: {
        period: { from, to },
        totalRevenue,
        dealCount,
        nrr,
        mrrPerBizDay: Math.round(mrrPerBizDay),
        bizDays,
        dealTypeBreakdown: {
          new: { count: newDeals.length, revenue: newDeals.reduce((s, d) => s + (d.value || 0), 0) },
          upgrade: { count: upgradeDeals.length, revenue: upgradeDeals.reduce((s, d) => s + (d.value || 0), 0) },
          addon: { count: addonDeals.length, revenue: addonDeals.reduce((s, d) => s + (d.value || 0), 0) },
          expansionMRR,
        },
        leaderboard,
        productBreakdown,
        dailyRevenue,
        arSummary,
        onboardingSummary,
      }
    });
  } catch (e) { res.status(500).json({ ok: false, err: e.message }); }
});

// ━━━ PIPELINE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
app.get('/api/pipeline', (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const monthStart = today.slice(0, 7) + '-01';
    const from = req.query.from || monthStart;
    const to = req.query.to || today;
    const rep = req.query.rep;

    let baseQ = 'SELECT * FROM deals WHERE 1=1';
    const params = [];
    if (rep) { baseQ += ' AND rep=?'; params.push(rep); }

    const allDeals = db.prepare(baseQ + ' ORDER BY created_at DESC').all(...params);
    const activePipeline = allDeals.filter(d => d.stage !== 'won');
    const wonInRange = allDeals.filter(d => d.stage === 'won' && d.won_date >= from && d.won_date <= to);

    // Stage counts
    const stageCounts = {};
    for (const d of activePipeline) {
      stageCounts[d.stage] = (stageCounts[d.stage] || 0) + 1;
    }

    const wonMRR = wonInRange.reduce((s, d) => s + (d.value || 0), 0);
    const atv = wonInRange.length > 0 ? wonMRR / wonInRange.length : 0;

    res.json({
      ok: true,
      data: {
        period: { from, to },
        activePipeline,
        wonDeals: wonInRange,
        stageCounts,
        wonMRR,
        avgDealValue: Math.round(atv),
        wonCount: wonInRange.length,
        appointmentCount: activePipeline.filter(d => ['appointment','marketing-appt'].includes(d.stage)).length,
      }
    });
  } catch (e) { res.status(500).json({ ok: false, err: e.message }); }
});

// ━━━ Start ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
app.listen(PORT, () => {
  console.log(`🗺️  ZING Platform running on http://localhost:${PORT}`);
  console.log(`   Database: ${DB_PATH}`);
});
