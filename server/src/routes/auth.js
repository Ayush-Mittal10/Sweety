const express = require('express');
const bcrypt = require('bcrypt');
const pool = require('../db');

const router = express.Router();

const SALT_ROUNDS = 10;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateRegister({ name, email, password }) {
  if (!name || !String(name).trim()) return 'Please enter your name.';
  if (!email || !EMAIL_PATTERN.test(String(email).trim())) return 'Please enter a valid email.';
  if (!password || String(password).length < 8) return 'Password must be at least 8 characters.';
  return null;
}

router.post('/register', async (req, res) => {
  const error = validateRegister(req.body || {});
  if (error) return res.status(400).json({ error });

  const name = req.body.name.trim();
  const email = req.body.email.trim().toLowerCase();

  const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
  if (existing.rowCount > 0) {
    return res.status(409).json({ error: 'An account with this email already exists.' });
  }

  const passwordHash = await bcrypt.hash(req.body.password, SALT_ROUNDS);
  const { rows } = await pool.query(
    `INSERT INTO users (name, email, password_hash)
     VALUES ($1, $2, $3)
     RETURNING id, name, email`,
    [name, email, passwordHash]
  );

  res.status(201).json({ user: rows[0] });
});

module.exports = router;
