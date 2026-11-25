const fs = require('fs');
const path = require('path');
const request = require('supertest');
const app = require('../src/app');
const pool = require('../src/db');

const schema = fs.readFileSync(path.join(__dirname, '..', 'db', 'schema.sql'), 'utf8');

async function setupDb() {
  await pool.query(schema);
}

async function resetDb() {
  await pool.query('TRUNCATE users RESTART IDENTITY CASCADE');
}

// Registers a user and returns their token
async function registerUser(overrides = {}) {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ name: 'Asha', email: 'asha@example.com', password: 'secret123', ...overrides });
  return res.body.token;
}

module.exports = { app, pool, setupDb, resetDb, registerUser };
