const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const DATABASE_URL = process.argv[2] || process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('Usage: node scripts/migrate.js <DATABASE_URL>');
  process.exit(1);
}

const sql = fs.readFileSync(path.join(__dirname, '../db/init.sql'), 'utf8');
const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

pool.query(sql)
  .then(() => {
    console.log('[OK] Schema migration applied successfully!');
    pool.end();
  })
  .catch((err) => {
    console.error('[ERROR] Migration failed:', err.message);
    pool.end();
    process.exit(1);
  });