// Creates the tables. Safe to run more than once.
const fs = require('fs');
const path = require('path');
const pool = require('../src/db');

async function main() {
  const sql = fs.readFileSync(path.join(__dirname, '..', 'db', 'schema.sql'), 'utf8');
  await pool.query(sql);
  console.log('Database schema is ready.');
}

main()
  .catch((err) => {
    console.error('Database setup failed:', err.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
