'use strict';

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

function calcDueDate(wonDate, item) {
  const d = new Date(wonDate + 'T00:00:00');
  d.setDate(d.getDate() + (TASK_DUE_DAYS[item] || 30));
  return d.toISOString().split('T')[0];
}

function seed(db) {
  // ── Designers ──────────────────────────────────────────────────────────
  const designers = [
    // Offshore
    { name: 'Raj Patel',    email: 'raj@zing-offshore.com',    type: 'offshore' },
    { name: 'Priya Sharma', email: 'priya@zing-offshore.com',  type: 'offshore' },
    { name: 'Arjun Singh',  email: 'arjun@zing-offshore.com',  type: 'offshore' },
    { name: 'Meera Nair',   email: 'meera@zing-offshore.com',  type: 'offshore' },
    { name: 'Vikram Das',   email: 'vikram@zing-offshore.com', type: 'offshore' },
    // US
    { name: 'Alex Morgan',  email: 'alex@zinglocal.com',   type: 'us' },
    { name: 'Jordan Lee',   email: 'jordan@zinglocal.com',  type: 'us' },
    { name: 'Sam Rivera',   email: 'sam@zinglocal.com',     type: 'us' },
    { name: 'Casey Taylor', email: 'casey@zinglocal.com',   type: 'us' },
    { name: 'Riley Chen',   email: 'riley@zinglocal.com',   type: 'us' },
    // Publishing
    { name: 'Nina Walsh',   email: 'nina@zinglocal.com',    type: 'publishing' },
    { name: 'Derek Huang',  email: 'derek@zinglocal.com',   type: 'publishing' },
  ];
  const insertDesigner = db.prepare(
    'INSERT OR IGNORE INTO designers (name, email, type) VALUES (?, ?, ?)'
  );
  for (const d of designers) insertDesigner.run(d.name, d.email, d.type);

  // ── Team Members ───────────────────────────────────────────────────────
  const teamMembers = [
    { first_name: 'Eric',      last_name: 'Stark',     phone: '+1 415-555-0201', email: 'eric@zinglocal.com' },
    { first_name: 'Elliot',    last_name: 'Farmer',    phone: '+1 312-555-0202', email: 'elliot@zinglocal.com' },
    { first_name: 'Elizabeth', last_name: 'Adams',     phone: '+1 628-555-0203', email: 'elizabeth@zinglocal.com' },
    { first_name: 'Caden',     last_name: 'Wrightmen', phone: '+1 213-555-0204', email: 'caden@zinglocal.com' },
    { first_name: 'Jon',       last_name: 'Alcon',     phone: '+1 650-555-0205', email: 'jon@zinglocal.com' },
    { first_name: 'Jake',      last_name: 'Friss',     phone: '+1 718-555-0206', email: 'jake@zinglocal.com' },
    { first_name: 'Zach',      last_name: 'Meade',     phone: '+1 408-555-0207', email: 'zach@zinglocal.com' },
  ];
  const insertTeam = db.prepare(
    'INSERT OR IGNORE INTO team_members (first_name, last_name, phone, email) VALUES (?, ?, ?, ?)'
  );
  for (const m of teamMembers) insertTeam.run(m.first_name, m.last_name, m.phone, m.email);

  // ── Products ───────────────────────────────────────────────────────────
  const products = [
    { id: 'PRD-1001', description: 'DISCOVER - Website + Marketing', price: 59, category: 'subscription-monthly', commission_type: 'mrr-multiplier', commission_value: 1 },
    { id: 'PRD-1002', description: 'BOOST - Website + Marketing Package', price: 149, category: 'subscription-monthly', commission_type: 'mrr-multiplier', commission_value: 1 },
    { id: 'PRD-1003', description: 'DOMINATE - Website + Marketing Package', price: 249, category: 'subscription-monthly', commission_type: 'mrr-multiplier', commission_value: 2 },
  ];
  const insertProduct = db.prepare(
    'INSERT OR IGNORE INTO products (id, description, price, category, commission_type, commission_value, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
  );
  for (const p of products) insertProduct.run(p.id, p.description, p.price, p.category, p.commission_type, p.commission_value, '2025-01-10');

  // ── Campaigns ──────────────────────────────────────────────────────────
  const campaigns = [
    { id: 'CMP-1', name: 'Feb SMS Blast - Local Dentists', type: 'sms-blast', status: 'completed', created_at: '2025-02-01', contact_count: 4200 },
    { id: 'CMP-2', name: 'Q1 Email Nurture Series', type: 'email', status: 'active', created_at: '2025-01-15', contact_count: 8500 },
    { id: 'CMP-3', name: 'Google Ads - HVAC Owners', type: 'paid-ads', status: 'active', created_at: '2025-02-10', contact_count: 12300 },
    { id: 'CMP-4', name: 'InfoUSA - Chiropractors List', type: 'purchased-list', status: 'completed', created_at: '2025-01-20', contact_count: 25000 },
    { id: 'CMP-5', name: 'Partner Referral - Chamber of Commerce', type: 'referral', status: 'active', created_at: '2025-02-15', contact_count: 340 },
  ];
  const insertCampaign = db.prepare(
    'INSERT OR IGNORE INTO campaigns (id, name, type, status, created_at, contact_count) VALUES (?, ?, ?, ?, ?, ?)'
  );
  for (const c of campaigns) insertCampaign.run(c.id, c.name, c.type, c.status, c.created_at, c.contact_count);

  // ── Contacts ───────────────────────────────────────────────────────────
  const contacts = [
    { id: 1, name: 'Sarah Chen',       email: 'sarah@acmecorp.com',    company: 'Acme Corp',          phone: '+1 415-555-0142', status: 'Active', last_contact: '2025-02-28', value: 249, notes: 'Key decision maker for enterprise deal',      lead_source: 'Email', campaign_id: 'CMP-2' },
    { id: 2, name: 'Marcus Johnson',   email: 'marcus@globex.io',      company: 'Globex Industries',  phone: '+1 312-555-0198', status: 'Active', last_contact: '2025-02-25', value: 149, notes: 'Interested in premium tier',                   lead_source: 'Paid',  campaign_id: 'CMP-3' },
    { id: 3, name: 'Priya Patel',      email: 'priya@initech.com',     company: 'Initech Solutions',  phone: '+1 628-555-0173', status: 'Lead',   last_contact: '2025-02-20', value: 249, notes: 'Referred by Marcus Johnson',                   lead_source: 'Email', campaign_id: 'CMP-5' },
    { id: 4, name: 'David Kim',        email: 'david@wayneent.com',    company: 'Wayne Enterprises',  phone: '+1 213-555-0156', status: 'Active', last_contact: '2025-02-27', value: 249, notes: 'Renewal coming up in Q2',                      lead_source: 'SMS',   campaign_id: 'CMP-1' },
    { id: 5, name: 'Elena Rodriguez',  email: 'elena@stark.io',        company: 'Stark Industries',   phone: '+1 650-555-0134', status: 'Inactive', last_contact: '2025-01-15', value: 59, notes: 'Paused engagement - follow up in March',     lead_source: 'Paid',  campaign_id: 'CMP-3' },
    { id: 6, name: 'James Wright',     email: 'james@umbrella.co',     company: 'Umbrella Corp',      phone: '+1 718-555-0187', status: 'Lead',   last_contact: '2025-02-26', value: 149, notes: 'Demo scheduled for next week',                lead_source: 'SMS',   campaign_id: 'CMP-1' },
    { id: 7, name: 'Aisha Mohammed',   email: 'aisha@cyberdyne.ai',    company: 'Cyberdyne Systems',  phone: '+1 408-555-0121', status: 'Active', last_contact: '2025-02-24', value: 249, notes: 'Expanding to 3 more seats',                   lead_source: 'Email', campaign_id: 'CMP-2' },
    { id: 8, name: 'Tom Bailey',       email: 'tom@oscorp.net',        company: 'Oscorp',             phone: '+1 917-555-0145', status: 'Lead',   last_contact: '2025-02-22', value: 59,  notes: 'Small team, budget-conscious',               lead_source: 'Paid',  campaign_id: 'CMP-4' },
  ];
  const insertContact = db.prepare(
    'INSERT OR IGNORE INTO contacts (id, name, email, company, phone, status, last_contact, value, notes, lead_source, campaign_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  );
  for (const c of contacts) {
    insertContact.run(c.id, c.name, c.email, c.company, c.phone, c.status, c.last_contact, c.value, c.notes, c.lead_source, c.campaign_id);
  }

  // ── Deals (pipeline + won) ─────────────────────────────────────────────
  const deals = [
    // Active pipeline
    { id: 1,   title: 'Acme Corp Enterprise',       contact_name: 'Sarah Chen',     stage: 'appointment',   probability: 75,  due_date: '2025-03-15', priority: 'high',   rep: 'Eric' },
    { id: 9,   title: 'Summit Legal Group',          contact_name: 'Nina Torres',    stage: 'call-now',      probability: 30,  due_date: '2025-04-05', priority: 'medium', rep: 'Eric' },
    { id: 10,  title: 'Peak Fitness Studio',         contact_name: 'Ryan Cole',      stage: 'active',        probability: 60,  due_date: '2025-02-20', priority: 'low',    rep: 'Eric' },
    { id: 2,   title: 'Globex Premium Upgrade',      contact_name: 'Marcus Johnson', stage: 'hot-72',        probability: 60,  due_date: '2025-03-20', priority: 'medium', rep: 'Elliot' },
    { id: 11,  title: 'Riverside Dental',            contact_name: 'Amy Lin',        stage: 'appointment',   probability: 70,  due_date: '2025-03-18', priority: 'medium', rep: 'Elliot' },
    { id: 12,  title: 'Craft & Co Bakery',           contact_name: 'Sam Ellis',      stage: 'call-no-answer',probability: 20,  due_date: '2025-04-12', priority: 'low',    rep: 'Elliot' },
    { id: 3,   title: 'Initech Full Suite',          contact_name: 'Priya Patel',    stage: 'marketing-appt',probability: 40,  due_date: '2025-04-01', priority: 'high',   rep: 'Elizabeth' },
    { id: 13,  title: 'Bloom Skincare',              contact_name: 'Olivia Hart',    stage: 'hot-72',        probability: 55,  due_date: '2025-03-22', priority: 'medium', rep: 'Elizabeth' },
    { id: 14,  title: 'Metro Plumbing Co',           contact_name: 'Derek Nash',     stage: 'active',        probability: 65,  due_date: '2025-02-25', priority: 'medium', rep: 'Elizabeth' },
    { id: 4,   title: 'Wayne Ent. Renewal',          contact_name: 'David Kim',      stage: 'appointment',   probability: 85,  due_date: '2025-03-10', priority: 'high',   rep: 'Caden' },
    { id: 15,  title: 'Brightside Therapy',          contact_name: 'Laura Webb',     stage: 'promotional',   probability: 35,  due_date: '2025-04-08', priority: 'low',    rep: 'Caden' },
    { id: 16,  title: 'Alpine Construction',         contact_name: 'Mike Torres',    stage: 'call-now',      probability: 50,  due_date: '2025-03-28', priority: 'high',   rep: 'Caden' },
    { id: 5,   title: 'Umbrella Pilot Program',      contact_name: 'James Wright',   stage: 'marketing-appt',probability: 50,  due_date: '2025-03-25', priority: 'medium', rep: 'Jon' },
    { id: 17,  title: 'Fusion Yoga Studio',          contact_name: 'Tara Singh',     stage: 'active',        probability: 60,  due_date: '2025-02-18', priority: 'low',    rep: 'Jon' },
    { id: 18,  title: 'Cedar Ridge Realty',          contact_name: 'Ben Garza',      stage: 'appt-no-show',  probability: 40,  due_date: '2025-03-14', priority: 'medium', rep: 'Jon' },
    { id: 6,   title: 'Cyberdyne Expansion',         contact_name: 'Aisha Mohammed', stage: 'appointment',   probability: 80,  due_date: '2025-02-28', priority: 'high',   rep: 'Jake' },
    { id: 7,   title: 'Oscorp Starter',              contact_name: 'Tom Bailey',     stage: 'call-no-answer',probability: 25,  due_date: '2025-04-10', priority: 'low',    rep: 'Jake' },
    { id: 19,  title: 'Ironside Auto Repair',        contact_name: 'Carlos Ruiz',    stage: 'hot-72',        probability: 45,  due_date: '2025-03-30', priority: 'medium', rep: 'Jake' },
    { id: 8,   title: 'Stark Re-engagement',         contact_name: 'Elena Rodriguez',stage: 'promotional',   probability: 20,  due_date: '2025-02-15', priority: 'low',    rep: 'Zach' },
    { id: 20,  title: 'Nova Accounting',             contact_name: 'Helen Park',     stage: 'call-now',      probability: 70,  due_date: '2025-03-12', priority: 'high',   rep: 'Zach' },
    { id: 21,  title: 'Willow Creek Spa',            contact_name: 'Jane Foster',    stage: 'appt-no-show',  probability: 30,  due_date: '2025-04-15', priority: 'medium', rep: 'Zach' },
    // Won - Eric
    { id: 100, title: 'Lakeside Chiro',         contact_name: 'Dr. Anna Lee',     stage: 'won', probability: 100, priority: 'high',   product_id: 'PRD-1003', value: 249, rep: 'Eric',     won_date: '2025-03-01', delivery_date: '2025-03-10', assigned_designer: 'Alex Morgan',  deal_type: 'new' },
    { id: 107, title: 'Atlas Moving Co',        contact_name: 'Dan Brooks',       stage: 'won', probability: 100, priority: 'medium', product_id: 'PRD-1002', value: 149, rep: 'Eric',     won_date: '2025-02-26', delivery_date: '2025-03-05', assigned_designer: 'Jordan Lee',   deal_type: 'new' },
    { id: 114, title: 'Apex Roofing',           contact_name: 'Bill Hardy',       stage: 'won', probability: 100, priority: 'low',    product_id: 'PRD-1001', value: 59,  rep: 'Eric',     won_date: '2025-02-21', delivery_date: '2025-02-28', assigned_designer: 'Sam Rivera',   deal_type: 'new' },
    { id: 200, title: 'Titan Plumbing',         contact_name: 'Greg Nash',        stage: 'won', probability: 100, priority: 'high',   product_id: 'PRD-1003', value: 249, rep: 'Eric',     won_date: '2025-02-18', delivery_date: '2025-02-25', assigned_designer: 'Casey Taylor', deal_type: 'new' },
    // Won - Elliot
    { id: 101, title: 'Greenfield Landscaping', contact_name: 'Mark Dunn',        stage: 'won', probability: 100, priority: 'medium', product_id: 'PRD-1002', value: 149, rep: 'Elliot',   won_date: '2025-03-01', delivery_date: '2025-03-08', assigned_designer: 'Riley Chen',   deal_type: 'new' },
    { id: 108, title: 'Coastal Law Group',       contact_name: 'Atty. James Liu',  stage: 'won', probability: 100, priority: 'high',   product_id: 'PRD-1003', value: 249, rep: 'Elliot',   won_date: '2025-02-25', delivery_date: '2025-03-04', assigned_designer: 'Alex Morgan',  deal_type: 'new' },
    { id: 116, title: 'Pacific Wealth Mgmt',    contact_name: 'Steven Cho',       stage: 'won', probability: 100, priority: 'low',    product_id: 'PRD-1001', value: 59,  rep: 'Elliot',   won_date: '2025-02-19', delivery_date: '2025-02-26', assigned_designer: 'Jordan Lee',   deal_type: 'new' },
    { id: 201, title: 'Horizon Media Group',    contact_name: 'Tanya Wells',      stage: 'won', probability: 100, priority: 'high',   product_id: 'PRD-1003', value: 249, rep: 'Elliot',   won_date: '2025-02-15', delivery_date: '2025-02-22', assigned_designer: 'Sam Rivera',   deal_type: 'new' },
    // Won - Elizabeth
    { id: 102, title: 'Harbor View Realty',     contact_name: 'Susan Park',       stage: 'won', probability: 100, priority: 'low',    product_id: 'PRD-1001', value: 59,  rep: 'Elizabeth',won_date: '2025-02-28', delivery_date: '2025-03-07', assigned_designer: 'Casey Taylor', deal_type: 'new' },
    { id: 109, title: 'Bright Smiles Ortho',    contact_name: 'Dr. Patel',        stage: 'won', probability: 100, priority: 'medium', product_id: 'PRD-1002', value: 149, rep: 'Elizabeth',won_date: '2025-02-25', delivery_date: '2025-03-03', assigned_designer: 'Riley Chen',   deal_type: 'new' },
    { id: 117, title: 'River Rock Massage',     contact_name: 'Jenny Flores',     stage: 'won', probability: 100, priority: 'high',   product_id: 'PRD-1003', value: 249, rep: 'Elizabeth',won_date: '2025-02-18', delivery_date: '2025-02-25', assigned_designer: 'Alex Morgan',  deal_type: 'new' },
    { id: 202, title: 'Zenith Dance Studio',    contact_name: 'Maria Costa',      stage: 'won', probability: 100, priority: 'medium', product_id: 'PRD-1002', value: 149, rep: 'Elizabeth',won_date: '2025-02-20', delivery_date: '2025-02-27', assigned_designer: 'Jordan Lee',   deal_type: 'new' },
    // Won - Caden
    { id: 103, title: 'Pinnacle Fitness',       contact_name: 'Jake Tran',        stage: 'won', probability: 100, priority: 'high',   product_id: 'PRD-1003', value: 249, rep: 'Caden',    won_date: '2025-02-28', delivery_date: '2025-03-07', assigned_designer: 'Sam Rivera',   deal_type: 'new' },
    { id: 110, title: 'Metro Auto Detail',      contact_name: 'Tony Reeves',      stage: 'won', probability: 100, priority: 'low',    product_id: 'PRD-1001', value: 59,  rep: 'Caden',    won_date: '2025-02-24', delivery_date: '2025-03-01', assigned_designer: 'Casey Taylor', deal_type: 'new' },
    { id: 115, title: 'Elm Street Cafe',        contact_name: 'Rosa Vega',        stage: 'won', probability: 100, priority: 'medium', product_id: 'PRD-1002', value: 149, rep: 'Caden',    won_date: '2025-02-20', delivery_date: '2025-02-27', assigned_designer: 'Riley Chen',   deal_type: 'new' },
    { id: 203, title: 'Crestview Insurance',    contact_name: 'Bill Tanner',      stage: 'won', probability: 100, priority: 'high',   product_id: 'PRD-1003', value: 249, rep: 'Caden',    won_date: '2025-02-14', delivery_date: '2025-02-21', assigned_designer: 'Alex Morgan',  deal_type: 'new' },
    // Won - Jon
    { id: 104, title: 'Downtown Dental',        contact_name: 'Dr. Rita Gomez',   stage: 'won', probability: 100, priority: 'medium', product_id: 'PRD-1002', value: 149, rep: 'Jon',      won_date: '2025-02-27', delivery_date: '2025-03-06', assigned_designer: 'Jordan Lee',   deal_type: 'new' },
    { id: 111, title: 'Summit HR Solutions',    contact_name: 'Karen Wells',      stage: 'won', probability: 100, priority: 'high',   product_id: 'PRD-1003', value: 249, rep: 'Jon',      won_date: '2025-02-24', delivery_date: '2025-03-03', assigned_designer: 'Sam Rivera',   deal_type: 'new' },
    { id: 204, title: 'Quick Print Shop',       contact_name: 'Leo Grant',        stage: 'won', probability: 100, priority: 'low',    product_id: 'PRD-1001', value: 59,  rep: 'Jon',      won_date: '2025-02-17', delivery_date: '2025-02-24', assigned_designer: 'Casey Taylor', deal_type: 'new' },
    { id: 205, title: 'Clearwater HVAC',        contact_name: 'Tom Hardy',        stage: 'won', probability: 100, priority: 'medium', product_id: 'PRD-1002', value: 149, rep: 'Jon',      won_date: '2025-03-01', delivery_date: '2025-03-10', assigned_designer: 'Riley Chen',   deal_type: 'new' },
    // Won - Jake
    { id: 105, title: 'Redwood Accounting',     contact_name: 'Phil Chen',        stage: 'won', probability: 100, priority: 'high',   product_id: 'PRD-1003', value: 249, rep: 'Jake',     won_date: '2025-02-27', delivery_date: '2025-03-06', assigned_designer: 'Alex Morgan',  deal_type: 'new' },
    { id: 112, title: 'Valley Pet Clinic',      contact_name: 'Dr. Amy Tran',     stage: 'won', probability: 100, priority: 'medium', product_id: 'PRD-1002', value: 149, rep: 'Jake',     won_date: '2025-02-23', delivery_date: '2025-03-02', assigned_designer: 'Jordan Lee',   deal_type: 'new' },
    { id: 206, title: 'Northside Tattoo',       contact_name: 'Mike Reeves',      stage: 'won', probability: 100, priority: 'low',    product_id: 'PRD-1001', value: 59,  rep: 'Jake',     won_date: '2025-02-19', delivery_date: '2025-02-26', assigned_designer: 'Sam Rivera',   deal_type: 'new' },
    { id: 207, title: 'Elite Boxing Gym',       contact_name: 'Ray Torres',       stage: 'won', probability: 100, priority: 'high',   product_id: 'PRD-1003', value: 249, rep: 'Jake',     won_date: '2025-02-16', delivery_date: '2025-02-23', assigned_designer: 'Casey Taylor', deal_type: 'new' },
    // Won - Zach
    { id: 106, title: 'Sunrise Bakery',         contact_name: 'Maria Santos',     stage: 'won', probability: 100, priority: 'low',    product_id: 'PRD-1001', value: 59,  rep: 'Zach',     won_date: '2025-02-26', delivery_date: '2025-03-05', assigned_designer: 'Riley Chen',   deal_type: 'new' },
    { id: 113, title: 'Core Pilates Studio',    contact_name: 'Lisa Monroe',      stage: 'won', probability: 100, priority: 'medium', product_id: 'PRD-1002', value: 149, rep: 'Zach',     won_date: '2025-02-22', delivery_date: '2025-03-01', assigned_designer: 'Alex Morgan',  deal_type: 'new' },
    { id: 208, title: 'Prime Steak House',      contact_name: 'Chef Marco',       stage: 'won', probability: 100, priority: 'high',   product_id: 'PRD-1003', value: 249, rep: 'Zach',     won_date: '2025-02-21', delivery_date: '2025-02-28', assigned_designer: 'Jordan Lee',   deal_type: 'new' },
    { id: 209, title: 'Golden Age Senior Care', contact_name: 'Nurse Pat',        stage: 'won', probability: 100, priority: 'low',    product_id: 'PRD-1001', value: 59,  rep: 'Zach',     won_date: '2025-02-14', delivery_date: '2025-02-21', assigned_designer: 'Sam Rivera',   deal_type: 'new' },
    // Upgrade deals
    { id: 300, title: 'Lakeside Chiro Upgrade',        contact_name: 'Dr. Anna Lee',  stage: 'won', probability: 100, priority: 'high',   product_id: 'PRD-1003', value: 249, rep: 'Eric',     won_date: '2025-03-01', delivery_date: '2025-03-08', assigned_designer: 'Alex Morgan',  deal_type: 'upgrade' },
    { id: 301, title: 'Harbor View Realty Upgrade',    contact_name: 'Susan Park',    stage: 'won', probability: 100, priority: 'medium', product_id: 'PRD-1002', value: 149, rep: 'Elliot',   won_date: '2025-02-28', delivery_date: '2025-03-05', assigned_designer: 'Jordan Lee',   deal_type: 'upgrade' },
    { id: 302, title: 'Metro Auto Detail Upgrade',     contact_name: 'Tony Reeves',   stage: 'won', probability: 100, priority: 'medium', product_id: 'PRD-1002', value: 149, rep: 'Jake',     won_date: '2025-02-26', delivery_date: '2025-03-04', assigned_designer: 'Casey Taylor', deal_type: 'upgrade' },
    // Add-on deals
    { id: 310, title: 'Pinnacle Fitness Add-on', contact_name: 'Jake Tran',       stage: 'won', probability: 100, priority: 'low',    product_id: 'PRD-1001', value: 59,  rep: 'Caden',    won_date: '2025-03-01', delivery_date: '2025-03-08', assigned_designer: 'Riley Chen',   deal_type: 'add-on' },
    { id: 311, title: 'Downtown Dental Add-on',  contact_name: 'Dr. Rita Gomez',  stage: 'won', probability: 100, priority: 'low',    product_id: 'PRD-1001', value: 59,  rep: 'Jon',      won_date: '2025-02-27', delivery_date: '2025-03-05', assigned_designer: 'Sam Rivera',   deal_type: 'add-on' },
    { id: 312, title: 'Sunrise Bakery Add-on',   contact_name: 'Maria Santos',    stage: 'won', probability: 100, priority: 'medium', product_id: 'PRD-1002', value: 149, rep: 'Zach',     won_date: '2025-02-28', delivery_date: '2025-03-06', assigned_designer: 'Alex Morgan',  deal_type: 'add-on' },
  ];

  const insertDeal = db.prepare(`
    INSERT OR IGNORE INTO deals
      (id, title, contact_name, rep, stage, probability, priority, due_date,
       product_id, value, won_date, delivery_date, assigned_designer, deal_type, launch_fee_amount)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const d of deals) {
    insertDeal.run(
      d.id, d.title, d.contact_name, d.rep, d.stage, d.probability, d.priority,
      d.due_date || null, d.product_id || null, d.value || 0,
      d.won_date || null, d.delivery_date || null, d.assigned_designer || null,
      d.deal_type || 'new', d.launch_fee_amount || 0
    );
  }

  // ── Onboarding records ─────────────────────────────────────────────────
  const onboardingRecords = [
    {
      id: 'OB-1', customer_name: 'Dr. Anna Lee', business_name: 'Lakeside Chiropractic',
      phone: '+1 415-555-0301', email: 'anna@lakesidechiro.com',
      existing_url: 'www.lakesidechiro.com', new_url: 'lakesidechiro.zinglocal.com',
      offshore_designer: 'Raj Patel', us_designer: 'Alex Morgan', rep: 'Eric',
      product_id: 'PRD-1003', value: 249, won_date: '2025-01-15', status: 'active',
      items: {
        'Website Design': { stage: 'ready-publishing', owner: 'Raj Patel', due_date: '2025-01-29' },
        'AI Chat': { stage: 'complete', owner: 'Alex Morgan', due_date: '2025-02-05' },
        'Landing Pages': { stage: 'in-progress', owner: 'Raj Patel', due_date: '2025-02-05' },
        'Blogs': { stage: 'outstanding', owner: '', due_date: '2025-02-14' },
        'Online Bookings': { stage: 'complete', owner: 'Alex Morgan', due_date: '2025-02-05' },
        'Memberships': { stage: 'outstanding', owner: '', due_date: '2025-02-14' },
        'Social Media': { stage: 'in-progress', owner: 'Alex Morgan', due_date: '2025-01-29' },
        'SMS Marketing': { stage: 'outstanding', owner: '', due_date: '2025-02-14' },
        'Email Marketing': { stage: 'outstanding', owner: '', due_date: '2025-02-14' },
        'GBP Optimization': { stage: 'complete', owner: 'Alex Morgan', due_date: '2025-01-29' },
        'Google Business Reviews': { stage: 'in-progress', owner: 'Alex Morgan', due_date: '2025-02-05' },
        'Local Directories': { stage: 'outstanding', owner: '', due_date: '2025-02-14' },
      },
      web_owners: { 'website-started': 'Raj Patel', 'first-draft': 'Raj Patel', 'website-sent': 'Alex Morgan', 'edits-mode': 'Alex Morgan', 'ready-qa': 'Alex Morgan', 'ready-publishing': 'Nina Walsh', 'complete': '' },
    },
    {
      id: 'OB-2', customer_name: 'Marcus Rivera', business_name: 'Harbor View Realty',
      phone: '+1 312-555-0302', email: 'marcus@harborview.com',
      existing_url: 'www.harborviewrealty.com', new_url: 'harborviewrealty.zinglocal.com',
      offshore_designer: 'Priya Sharma', us_designer: 'Jordan Lee', rep: 'Elliot',
      product_id: 'PRD-1002', value: 149, won_date: '2025-01-20', status: 'active',
      items: {
        'Website Design': { stage: 'edits-mode', owner: 'Priya Sharma', due_date: '2025-02-03' },
        'AI Chat': { stage: 'outstanding', owner: '', due_date: '2025-02-10' },
        'Landing Pages': { stage: 'complete', owner: 'Jordan Lee', due_date: '2025-02-10' },
        'Blogs': { stage: 'outstanding', owner: '', due_date: '2025-02-19' },
        'Online Bookings': { stage: 'in-progress', owner: 'Jordan Lee', due_date: '2025-02-10' },
        'Memberships': { stage: 'outstanding', owner: '', due_date: '2025-02-19' },
        'Social Media': { stage: 'complete', owner: 'Jordan Lee', due_date: '2025-02-03' },
        'SMS Marketing': { stage: 'outstanding', owner: '', due_date: '2025-02-19' },
        'Email Marketing': { stage: 'review', owner: 'Priya Sharma', due_date: '2025-02-19' },
        'GBP Optimization': { stage: 'in-progress', owner: 'Jordan Lee', due_date: '2025-02-03' },
        'Google Business Reviews': { stage: 'outstanding', owner: '', due_date: '2025-02-10' },
        'Local Directories': { stage: 'outstanding', owner: '', due_date: '2025-02-19' },
      },
      web_owners: { 'website-started': 'Priya Sharma', 'first-draft': 'Priya Sharma', 'website-sent': 'Jordan Lee', 'edits-mode': 'Jordan Lee', 'ready-qa': '', 'ready-publishing': '', 'complete': '' },
    },
    {
      id: 'OB-3', customer_name: 'Susan Park', business_name: 'Peak Dental Care',
      phone: '+1 628-555-0303', email: 'susan@peakdental.com',
      existing_url: '', new_url: 'peakdentalcare.zinglocal.com',
      offshore_designer: 'Arjun Singh', us_designer: 'Sam Rivera', rep: 'Elizabeth',
      product_id: 'PRD-1003', value: 249, won_date: '2025-02-01', status: 'active',
      items: {
        'Website Design': { stage: 'complete', owner: 'Arjun Singh', due_date: '2025-02-15' },
        'AI Chat': { stage: 'complete', owner: 'Sam Rivera', due_date: '2025-02-22' },
        'Landing Pages': { stage: 'complete', owner: 'Arjun Singh', due_date: '2025-02-22' },
        'Blogs': { stage: 'complete', owner: 'Sam Rivera', due_date: '2025-03-03' },
        'Online Bookings': { stage: 'complete', owner: 'Sam Rivera', due_date: '2025-02-22' },
        'Memberships': { stage: 'complete', owner: 'Sam Rivera', due_date: '2025-03-03' },
        'Social Media': { stage: 'complete', owner: 'Sam Rivera', due_date: '2025-02-15' },
        'SMS Marketing': { stage: 'complete', owner: 'Sam Rivera', due_date: '2025-03-03' },
        'Email Marketing': { stage: 'in-progress', owner: 'Arjun Singh', due_date: '2025-03-03' },
        'GBP Optimization': { stage: 'complete', owner: 'Sam Rivera', due_date: '2025-02-15' },
        'Google Business Reviews': { stage: 'complete', owner: 'Sam Rivera', due_date: '2025-02-22' },
        'Local Directories': { stage: 'review', owner: 'Sam Rivera', due_date: '2025-03-03' },
      },
      web_owners: { 'website-started': 'Arjun Singh', 'first-draft': 'Arjun Singh', 'website-sent': 'Sam Rivera', 'edits-mode': 'Sam Rivera', 'ready-qa': 'Sam Rivera', 'ready-publishing': 'Derek Huang', 'complete': 'Derek Huang' },
    },
    {
      id: 'OB-4', customer_name: 'Tony Reeves', business_name: 'Metro Auto Detail',
      phone: '+1 213-555-0304', email: 'tony@metroauto.com',
      existing_url: 'www.metroautodetail.net', new_url: 'metroautodetail.zinglocal.com',
      offshore_designer: 'Meera Nair', us_designer: 'Casey Taylor', rep: 'Jake',
      product_id: 'PRD-1002', value: 149, won_date: '2025-02-10', status: 'active',
      items: {
        'Website Design': { stage: 'website-started', owner: 'Meera Nair', due_date: '2025-02-24' },
        'AI Chat': { stage: 'outstanding', owner: '', due_date: '2025-03-03' },
        'Landing Pages': { stage: 'outstanding', owner: '', due_date: '2025-03-03' },
        'Blogs': { stage: 'outstanding', owner: '', due_date: '2025-03-12' },
        'Online Bookings': { stage: 'outstanding', owner: '', due_date: '2025-03-03' },
        'Memberships': { stage: 'outstanding', owner: '', due_date: '2025-03-12' },
        'Social Media': { stage: 'outstanding', owner: '', due_date: '2025-02-24' },
        'SMS Marketing': { stage: 'outstanding', owner: '', due_date: '2025-03-12' },
        'Email Marketing': { stage: 'outstanding', owner: '', due_date: '2025-03-12' },
        'GBP Optimization': { stage: 'outstanding', owner: '', due_date: '2025-02-24' },
        'Google Business Reviews': { stage: 'outstanding', owner: '', due_date: '2025-03-03' },
        'Local Directories': { stage: 'outstanding', owner: '', due_date: '2025-03-12' },
      },
      web_owners: { 'website-started': 'Meera Nair', 'first-draft': '', 'website-sent': '', 'edits-mode': '', 'ready-qa': '', 'ready-publishing': '', 'complete': '' },
    },
    {
      id: 'OB-5', customer_name: 'Jake Tran', business_name: 'Pinnacle Fitness',
      phone: '+1 650-555-0305', email: 'jake@pinnaclefitness.com',
      existing_url: 'www.pinnaclefitness.com', new_url: 'pinnaclefitness.zinglocal.com',
      offshore_designer: 'Vikram Das', us_designer: 'Riley Chen', rep: 'Caden',
      product_id: 'PRD-1001', value: 59, won_date: '2025-02-15', status: 'active',
      items: {
        'Website Design': { stage: 'first-draft', owner: 'Vikram Das', due_date: '2025-03-01' },
        'AI Chat': { stage: 'in-progress', owner: 'Riley Chen', due_date: '2025-03-08' },
        'Landing Pages': { stage: 'outstanding', owner: '', due_date: '2025-03-08' },
        'Blogs': { stage: 'outstanding', owner: '', due_date: '2025-03-17' },
        'Online Bookings': { stage: 'complete', owner: 'Riley Chen', due_date: '2025-03-08' },
        'Memberships': { stage: 'outstanding', owner: '', due_date: '2025-03-17' },
        'Social Media': { stage: 'outstanding', owner: '', due_date: '2025-03-01' },
        'SMS Marketing': { stage: 'outstanding', owner: '', due_date: '2025-03-17' },
        'Email Marketing': { stage: 'outstanding', owner: '', due_date: '2025-03-17' },
        'GBP Optimization': { stage: 'in-progress', owner: 'Riley Chen', due_date: '2025-03-01' },
        'Google Business Reviews': { stage: 'outstanding', owner: '', due_date: '2025-03-08' },
        'Local Directories': { stage: 'outstanding', owner: '', due_date: '2025-03-17' },
      },
      web_owners: { 'website-started': 'Vikram Das', 'first-draft': 'Vikram Das', 'website-sent': '', 'edits-mode': '', 'ready-qa': '', 'ready-publishing': '', 'complete': '' },
    },
    {
      id: 'OB-6', customer_name: 'Maria Santos', business_name: 'Sunrise Bakery',
      phone: '+1 408-555-0306', email: 'maria@sunrisebakery.com',
      existing_url: '', new_url: 'sunrisebakery.zinglocal.com',
      offshore_designer: 'Raj Patel', us_designer: 'Alex Morgan', rep: 'Zach',
      product_id: 'PRD-1002', value: 149, won_date: '2025-02-20', status: 'active',
      items: {
        'Website Design': { stage: 'ready-qa', owner: 'Raj Patel', due_date: '2025-03-06' },
        'AI Chat': { stage: 'complete', owner: 'Alex Morgan', due_date: '2025-03-13' },
        'Landing Pages': { stage: 'complete', owner: 'Raj Patel', due_date: '2025-03-13' },
        'Blogs': { stage: 'in-progress', owner: 'Alex Morgan', due_date: '2025-03-22' },
        'Online Bookings': { stage: 'review', owner: 'Alex Morgan', due_date: '2025-03-13' },
        'Memberships': { stage: 'outstanding', owner: '', due_date: '2025-03-22' },
        'Social Media': { stage: 'complete', owner: 'Alex Morgan', due_date: '2025-03-06' },
        'SMS Marketing': { stage: 'complete', owner: 'Alex Morgan', due_date: '2025-03-22' },
        'Email Marketing': { stage: 'complete', owner: 'Alex Morgan', due_date: '2025-03-22' },
        'GBP Optimization': { stage: 'complete', owner: 'Alex Morgan', due_date: '2025-03-06' },
        'Google Business Reviews': { stage: 'in-progress', owner: 'Alex Morgan', due_date: '2025-03-13' },
        'Local Directories': { stage: 'in-progress', owner: 'Raj Patel', due_date: '2025-03-22' },
      },
      web_owners: { 'website-started': 'Raj Patel', 'first-draft': 'Raj Patel', 'website-sent': 'Alex Morgan', 'edits-mode': 'Alex Morgan', 'ready-qa': 'Alex Morgan', 'ready-publishing': '', 'complete': '' },
    },
    {
      id: 'OB-7', customer_name: 'Dr. Rita Gomez', business_name: 'Downtown Dental',
      phone: '+1 718-555-0307', email: 'rita@downtowndental.com',
      existing_url: 'www.downtowndental.com', new_url: 'downtowndental.zinglocal.com',
      offshore_designer: 'Priya Sharma', us_designer: 'Jordan Lee', rep: 'Jon',
      product_id: 'PRD-1001', value: 59, won_date: '2025-02-25', status: 'active',
      items: {
        'Website Design': { stage: 'complete', owner: 'Priya Sharma', due_date: '2025-03-11' },
        'AI Chat': { stage: 'complete', owner: 'Jordan Lee', due_date: '2025-03-18' },
        'Landing Pages': { stage: 'complete', owner: 'Priya Sharma', due_date: '2025-03-18' },
        'Blogs': { stage: 'complete', owner: 'Jordan Lee', due_date: '2025-03-27' },
        'Online Bookings': { stage: 'complete', owner: 'Jordan Lee', due_date: '2025-03-18' },
        'Memberships': { stage: 'complete', owner: 'Jordan Lee', due_date: '2025-03-27' },
        'Social Media': { stage: 'complete', owner: 'Jordan Lee', due_date: '2025-03-11' },
        'SMS Marketing': { stage: 'complete', owner: 'Jordan Lee', due_date: '2025-03-27' },
        'Email Marketing': { stage: 'complete', owner: 'Priya Sharma', due_date: '2025-03-27' },
        'GBP Optimization': { stage: 'complete', owner: 'Jordan Lee', due_date: '2025-03-11' },
        'Google Business Reviews': { stage: 'complete', owner: 'Jordan Lee', due_date: '2025-03-18' },
        'Local Directories': { stage: 'complete', owner: 'Jordan Lee', due_date: '2025-03-27' },
      },
      web_owners: { 'website-started': 'Priya Sharma', 'first-draft': 'Priya Sharma', 'website-sent': 'Jordan Lee', 'edits-mode': 'Jordan Lee', 'ready-qa': 'Jordan Lee', 'ready-publishing': 'Nina Walsh', 'complete': 'Nina Walsh' },
    },
  ];

  const insertOB = db.prepare(`
    INSERT OR IGNORE INTO onboarding
      (id, customer_name, business_name, phone, email, existing_url, new_url,
       offshore_designer, us_designer, rep, product_id, value, won_date, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertOBItem = db.prepare(`
    INSERT OR IGNORE INTO onboarding_items
      (onboarding_id, item_name, stage, owner, due_date)
    VALUES (?, ?, ?, ?, ?)
  `);
  const insertWebOwner = db.prepare(`
    INSERT OR REPLACE INTO onboarding_web_owners (onboarding_id, stage_key, owner)
    VALUES (?, ?, ?)
  `);

  for (const ob of onboardingRecords) {
    insertOB.run(ob.id, ob.customer_name, ob.business_name, ob.phone, ob.email,
      ob.existing_url, ob.new_url, ob.offshore_designer, ob.us_designer,
      ob.rep, ob.product_id, ob.value, ob.won_date, ob.status);

    // Check if items exist already
    const existingItems = db.prepare('SELECT COUNT(*) as c FROM onboarding_items WHERE onboarding_id=?').get(ob.id);
    if (existingItems.c === 0) {
      for (const [itemName, itemData] of Object.entries(ob.items)) {
        insertOBItem.run(ob.id, itemName, itemData.stage, itemData.owner, itemData.due_date);
      }
      for (const [stageKey, owner] of Object.entries(ob.web_owners)) {
        insertWebOwner.run(ob.id, stageKey, owner);
      }
    }
  }

  // ── Tickets ────────────────────────────────────────────────────────────
  const tickets = [
    { id: 1001, subject: 'Login issues after update',       contact_name: 'Sarah Chen',      priority: 'high',   status: 'open',        category: 'Bug',             description: 'Unable to access dashboard after v2.4 update', created_at: '2025-02-28' },
    { id: 1002, subject: 'API rate limiting questions',     contact_name: 'David Kim',       priority: 'medium', status: 'in-progress', category: 'Question',        description: 'Need clarification on enterprise tier rate limits', created_at: '2025-02-27' },
    { id: 1003, subject: 'Data export not working',         contact_name: 'Marcus Johnson',  priority: 'high',   status: 'open',        category: 'Bug',             description: 'CSV export times out on large datasets', created_at: '2025-02-27' },
    { id: 1004, subject: 'Feature request: Bulk import',   contact_name: 'Priya Patel',     priority: 'low',    status: 'open',        category: 'Feature Request', description: 'Requesting bulk contact import via CSV', created_at: '2025-02-26' },
    { id: 1005, subject: 'Billing discrepancy',             contact_name: 'Aisha Mohammed',  priority: 'high',   status: 'in-progress', category: 'Billing',         description: 'Charged for 5 seats but only using 3', created_at: '2025-02-25' },
    { id: 1006, subject: 'SSO configuration help',         contact_name: 'David Kim',       priority: 'medium', status: 'resolved',    category: 'Question',        description: 'Need help setting up SAML SSO', created_at: '2025-02-20' },
    { id: 1007, subject: 'Mobile app crash',                contact_name: 'Tom Bailey',      priority: 'high',   status: 'open',        category: 'Bug',             description: 'App crashes on Android 14 when opening reports', created_at: '2025-02-28' },
  ];
  const insertTicket = db.prepare(`
    INSERT OR IGNORE INTO tickets (id, subject, contact_name, priority, status, category, description, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const t of tickets) {
    insertTicket.run(t.id, t.subject, t.contact_name, t.priority, t.status, t.category, t.description, t.created_at);
  }

  // ── AR Accounts ────────────────────────────────────────────────────────
  const arAccounts = [
    { id: 'AR-1',  business_name: 'Lakeside Chiropractic',  customer_name: 'Dr. Anna Lee',     email: 'anna@lakesidechiro.com',       phone: '+1 415-555-0301', product: 'DOMINATE', mrr: 249, status: 'past-due', stripe_status: 'past_due', days_past_due: 5,  amount_due: 249, last_payment_date: '2025-02-10', failed_date: '2025-03-15' },
    { id: 'AR-2',  business_name: 'Harbor View Realty',     customer_name: 'Marcus Rivera',    email: 'marcus@harborview.com',        phone: '+1 312-555-0302', product: 'BOOST',    mrr: 149, status: 'unpaid',   stripe_status: 'unpaid',   days_past_due: 32, amount_due: 298, last_payment_date: '2025-01-12', failed_date: '2025-02-12' },
    { id: 'AR-3',  business_name: 'Peak Dental Care',       customer_name: 'Susan Park',       email: 'susan@peakdental.com',         phone: '+1 628-555-0303', product: 'DOMINATE', mrr: 249, status: 'past-due', stripe_status: 'past_due', days_past_due: 8,  amount_due: 249, last_payment_date: '2025-02-07', failed_date: '2025-03-12' },
    { id: 'AR-4',  business_name: 'Metro Auto Detail',      customer_name: 'Tony Reeves',      email: 'tony@metroauto.com',           phone: '+1 213-555-0304', product: 'BOOST',    mrr: 149, status: 'past-due', stripe_status: 'past_due', days_past_due: 3,  amount_due: 149, last_payment_date: '2025-02-17', failed_date: '2025-03-17' },
    { id: 'AR-5',  business_name: 'Sunrise Bakery',         customer_name: 'Maria Santos',     email: 'maria@sunrisebakery.com',      phone: '+1 408-555-0306', product: 'BOOST',    mrr: 149, status: 'unpaid',   stripe_status: 'unpaid',   days_past_due: 45, amount_due: 447, last_payment_date: '2024-12-30', failed_date: '2025-01-30' },
    { id: 'AR-6',  business_name: 'Pinnacle Fitness',       customer_name: 'Jake Tran',        email: 'jake@pinnaclefitness.com',     phone: '+1 650-555-0305', product: 'DISCOVER', mrr: 59,  status: 'past-due', stripe_status: 'past_due', days_past_due: 2,  amount_due: 59,  last_payment_date: '2025-02-18', failed_date: '2025-03-18' },
    { id: 'AR-7',  business_name: 'Alpine Plumbing',        customer_name: 'Dave Kowalski',    email: 'dave@alpineplumbing.com',      phone: '+1 303-555-0401', product: 'BOOST',    mrr: 149, status: 'paid',     stripe_status: 'active',   days_past_due: 0,  amount_due: 0,   amount_paid: 298, paid_date: '2025-03-18', last_payment_date: '2025-03-18', failed_date: '2025-02-15', reactivated: 0 },
    { id: 'AR-8',  business_name: 'Golden Gate Landscaping',customer_name: 'Miguel Flores',    email: 'miguel@gglandscaping.com',     phone: '+1 415-555-0402', product: 'DOMINATE', mrr: 249, status: 'paid',     stripe_status: 'active',   days_past_due: 0,  amount_due: 0,   amount_paid: 249, paid_date: '2025-03-16', last_payment_date: '2025-03-16', failed_date: '2025-03-02', reactivated: 0 },
    { id: 'AR-9',  business_name: 'Redwood Dental Group',   customer_name: 'Dr. Lisa Chen',    email: 'lisa@redwooddental.com',       phone: '+1 650-555-0403', product: 'DOMINATE', mrr: 249, status: 'paid',     stripe_status: 'active',   days_past_due: 0,  amount_due: 0,   amount_paid: 747, paid_date: '2025-03-14', last_payment_date: '2025-03-14', failed_date: '2025-01-10', reactivated: 1 },
    { id: 'AR-10', business_name: 'Evergreen Pest Control', customer_name: 'Tommy Park',       email: 'tommy@evergreenpest.com',      phone: '+1 408-555-0404', product: 'DISCOVER', mrr: 59,  status: 'paid',     stripe_status: 'active',   days_past_due: 0,  amount_due: 0,   amount_paid: 59,  paid_date: '2025-03-19', last_payment_date: '2025-03-19', failed_date: '2025-03-10', reactivated: 0 },
    { id: 'AR-11', business_name: 'Downtown Dental',        customer_name: 'Dr. Rita Gomez',   email: 'rita@downtowndental.com',      phone: '+1 718-555-0307', product: 'DISCOVER', mrr: 59,  status: 'current',  stripe_status: 'active',   days_past_due: 0,  amount_due: 0,   last_payment_date: '2025-03-01',  subscription_created: '2024-09-15' },
    { id: 'AR-12', business_name: 'Summit Roofing',         customer_name: 'Carlos Mendez',    email: 'carlos@summitroofing.com',     phone: '+1 720-555-0501', product: 'BOOST',    mrr: 149, status: 'current',  stripe_status: 'active',   days_past_due: 0,  amount_due: 0,   last_payment_date: '2025-03-05',  subscription_created: '2024-11-01' },
    { id: 'AR-13', business_name: 'Bright Smile Ortho',     customer_name: 'Dr. Patel',        email: 'patel@brightsmile.com',        phone: '+1 303-555-0502', product: 'DOMINATE', mrr: 249, status: 'current',  stripe_status: 'active',   days_past_due: 0,  amount_due: 0,   last_payment_date: '2025-03-10',  subscription_created: '2024-06-20' },
    { id: 'AR-14', business_name: 'Rocky Mountain HVAC',    customer_name: 'Bill Turner',      email: 'bill@rmhvac.com',              phone: '+1 719-555-0503', product: 'BOOST',    mrr: 149, status: 'current',  stripe_status: 'active',   days_past_due: 0,  amount_due: 0,   last_payment_date: '2025-03-12',  subscription_created: '2025-01-08' },
    { id: 'AR-15', business_name: 'Wildflower Yoga',        customer_name: 'Sarah Kim',        email: 'sarah@wildfloweryoga.com',     phone: '+1 970-555-0504', product: 'DISCOVER', mrr: 59,  status: 'current',  stripe_status: 'active',   days_past_due: 0,  amount_due: 0,   last_payment_date: '2025-03-15',  subscription_created: '2025-02-14' },
    { id: 'AR-16', business_name: 'Copper Creek BBQ',       customer_name: 'James Wilson',     email: 'james@coppercreekbbq.com',     phone: '+1 303-555-0601', product: 'DOMINATE', mrr: 249, status: 'current',  stripe_status: 'active',   days_past_due: 0,  amount_due: 0,   last_payment_date: '2025-03-08',  subscription_created: '2024-08-10' },
    { id: 'AR-17', business_name: 'Mile High Movers',       customer_name: 'Derek Shaw',       email: 'derek@milehighmovers.com',     phone: '+1 720-555-0602', product: 'BOOST',    mrr: 149, status: 'current',  stripe_status: 'active',   days_past_due: 0,  amount_due: 0,   last_payment_date: '2025-03-02',  subscription_created: '2024-12-05' },
    { id: 'AR-18', business_name: 'Front Range Electric',   customer_name: 'Mike Hartley',     email: 'mike@frontrangeelectric.com',  phone: '+1 719-555-0603', product: 'DISCOVER', mrr: 59,  status: 'current',  stripe_status: 'active',   days_past_due: 0,  amount_due: 0,   last_payment_date: '2025-03-11',  subscription_created: '2025-03-01' },
    { id: 'AR-19', business_name: 'Aspen Veterinary',       customer_name: 'Dr. Karen Wright', email: 'karen@aspenvets.com',          phone: '+1 970-555-0604', product: 'DOMINATE', mrr: 249, status: 'current',  stripe_status: 'active',   days_past_due: 0,  amount_due: 0,   last_payment_date: '2025-03-14',  subscription_created: '2024-04-22' },
    { id: 'AR-20', business_name: 'Springs Auto Glass',     customer_name: 'Victor Ramos',     email: 'victor@springsautoglass.com',  phone: '+1 719-555-0605', product: 'BOOST',    mrr: 149, status: 'current',  stripe_status: 'active',   days_past_due: 0,  amount_due: 0,   last_payment_date: '2025-03-09',  subscription_created: '2025-02-01' },
  ];

  const insertAR = db.prepare(`
    INSERT OR IGNORE INTO ar_accounts
      (id, business_name, customer_name, email, phone, product, mrr, status, stripe_status,
       days_past_due, amount_due, amount_paid, paid_date, last_payment_date, failed_date,
       subscription_created, reactivated)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const ar of arAccounts) {
    insertAR.run(
      ar.id, ar.business_name, ar.customer_name, ar.email, ar.phone,
      ar.product, ar.mrr, ar.status, ar.stripe_status || null,
      ar.days_past_due || 0, ar.amount_due || 0, ar.amount_paid || 0,
      ar.paid_date || null, ar.last_payment_date || null, ar.failed_date || null,
      ar.subscription_created || null, ar.reactivated || 0
    );
  }

  // AR Timeline entries
  const arTimelines = {
    'AR-1': [
      { date: '2025-03-15', type: 'stripe-retry', note: 'Payment failed - card declined' },
      { date: '2025-03-16', type: 'text', note: 'Auto-text: payment failed notification' },
      { date: '2025-03-18', type: 'email', note: 'Auto-email: payment retry reminder' },
    ],
    'AR-2': [
      { date: '2025-02-12', type: 'stripe-retry', note: 'Payment failed - insufficient funds' },
      { date: '2025-02-13', type: 'text', note: 'Auto-text: payment failed notification' },
      { date: '2025-02-15', type: 'email', note: 'Auto-email: payment retry reminder' },
      { date: '2025-02-19', type: 'stripe-retry', note: 'Stripe retry #2 - declined' },
      { date: '2025-02-20', type: 'call', note: 'Outbound call - left voicemail' },
      { date: '2025-02-25', type: 'stripe-retry', note: 'Stripe retry #3 - declined' },
      { date: '2025-02-26', type: 'email', note: 'Auto-email: final payment warning' },
      { date: '2025-03-01', type: 'escalated', note: 'Marked unpaid - all retries exhausted' },
      { date: '2025-03-05', type: 'call', note: 'Collections call - customer said will pay Friday' },
      { date: '2025-03-12', type: 'text', note: 'Follow-up: payment still not received' },
    ],
    'AR-3': [
      { date: '2025-03-12', type: 'stripe-retry', note: 'Payment failed - expired card' },
      { date: '2025-03-13', type: 'text', note: 'Auto-text: please update card on file' },
      { date: '2025-03-15', type: 'email', note: 'Auto-email: card update reminder' },
      { date: '2025-03-18', type: 'stripe-retry', note: 'Stripe retry #2 - still expired' },
      { date: '2025-03-19', type: 'call', note: 'Outbound call - customer updating card today' },
    ],
    'AR-4': [
      { date: '2025-03-17', type: 'stripe-retry', note: 'Payment failed - card declined' },
      { date: '2025-03-18', type: 'text', note: 'Auto-text: payment failed notification' },
    ],
    'AR-5': [
      { date: '2025-01-30', type: 'stripe-retry', note: 'Payment failed - insufficient funds' },
      { date: '2025-01-31', type: 'text', note: 'Auto-text: payment failed' },
      { date: '2025-02-02', type: 'email', note: 'Auto-email: payment retry' },
      { date: '2025-02-06', type: 'stripe-retry', note: 'Retry #2 - declined' },
      { date: '2025-02-10', type: 'call', note: 'Outbound call - no answer' },
      { date: '2025-02-13', type: 'stripe-retry', note: 'Retry #3 - declined' },
      { date: '2025-02-14', type: 'email', note: 'Final payment warning' },
      { date: '2025-02-20', type: 'escalated', note: 'Marked unpaid - retries exhausted' },
      { date: '2025-02-25', type: 'call', note: 'Collections call - no answer' },
      { date: '2025-03-01', type: 'text', note: 'Collections text - no response' },
      { date: '2025-03-10', type: 'call', note: 'Collections call - customer disputing charges' },
      { date: '2025-03-15', type: 'email', note: 'Sent itemized invoice and contract copy' },
    ],
    'AR-6': [
      { date: '2025-03-18', type: 'stripe-retry', note: 'Payment failed - card declined' },
      { date: '2025-03-19', type: 'text', note: 'Auto-text: payment failed notification' },
    ],
    'AR-7': [
      { date: '2025-02-15', type: 'stripe-retry', note: 'Payment failed - card declined' },
      { date: '2025-02-16', type: 'text', note: 'Auto-text: payment failed notification' },
      { date: '2025-02-18', type: 'email', note: 'Auto-email: payment retry reminder' },
      { date: '2025-02-22', type: 'stripe-retry', note: 'Stripe retry #2 - declined' },
      { date: '2025-02-25', type: 'call', note: 'Outbound call - customer updating card' },
      { date: '2025-03-18', type: 'payment-received', note: 'Payment received: $298 - covers Feb + Mar' },
    ],
    'AR-8': [
      { date: '2025-03-02', type: 'stripe-retry', note: 'Payment failed - expired card' },
      { date: '2025-03-03', type: 'text', note: 'Auto-text: please update card' },
      { date: '2025-03-05', type: 'email', note: 'Auto-email: card update link' },
      { date: '2025-03-16', type: 'payment-received', note: 'Payment received: $249 - card updated' },
    ],
    'AR-9': [
      { date: '2025-01-10', type: 'stripe-retry', note: 'Payment failed - insufficient funds' },
      { date: '2025-01-11', type: 'text', note: 'Auto-text: payment failed' },
      { date: '2025-01-15', type: 'stripe-retry', note: 'Retry #2 - declined' },
      { date: '2025-01-20', type: 'email', note: 'Auto-email: final warning' },
      { date: '2025-01-25', type: 'escalated', note: 'Marked unpaid - retries exhausted' },
      { date: '2025-02-01', type: 'call', note: 'Collections call - payment plan agreed' },
      { date: '2025-03-14', type: 'payment-received', note: 'Payment received: $747 - covers Jan, Feb, Mar' },
    ],
    'AR-10': [
      { date: '2025-03-10', type: 'stripe-retry', note: 'Payment failed - card declined' },
      { date: '2025-03-11', type: 'text', note: 'Auto-text: payment failed notification' },
      { date: '2025-03-19', type: 'payment-received', note: 'Payment received: $59 - card updated' },
    ],
  };

  const insertARTimeline = db.prepare(
    'INSERT INTO ar_timeline (ar_id, date, type, note) VALUES (?, ?, ?, ?)'
  );
  for (const [arId, events] of Object.entries(arTimelines)) {
    const existingCount = db.prepare('SELECT COUNT(*) as c FROM ar_timeline WHERE ar_id=?').get(arId);
    if (existingCount.c === 0) {
      for (const evt of events) {
        insertARTimeline.run(arId, evt.date, evt.type, evt.note);
      }
    }
  }

  console.log('✅ Seed complete.');
}

module.exports = { seed };
