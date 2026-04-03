'use strict';

const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const Database = require('better-sqlite3');
const { seed } = require('./seed');

const DB_PATH = process.env.DB_PATH || './data/zing.db';
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

function initDB() {
  // Ensure data directory exists
  const dbDir = path.dirname(path.resolve(DB_PATH));
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  const db = new Database(path.resolve(DB_PATH));

  // Run schema
  const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
  db.exec(schema);
  console.log('✅ Schema applied.');

  // Seed only if tables are empty
  const contactCount = db.prepare('SELECT COUNT(*) as c FROM contacts').get();
  if (contactCount.c === 0) {
    console.log('🌱 Seeding database...');
    seed(db);
  } else {
    console.log(`ℹ️  Database already has data (${contactCount.c} contacts). Skipping seed.`);
  }

  return db;
}

// Allow running directly: node db/init.js
if (require.main === module) {
  initDB();
  console.log('✅ Database initialized.');
}

module.exports = { initDB };
