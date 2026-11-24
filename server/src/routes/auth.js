const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const config = require('../config');
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

function signToken(user) {
  return jwt.sign({ userId: user.id }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
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

  const user = rows[0];
  res.status(201).json({ token: signToken(user), user });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'Please enter your email and password.' });
  }

  const { rows } = await pool.query(
    'SELECT id, name, email, password_hash FROM users WHERE email = $1',
    [String(email).trim().toLowerCase()]
  );
  const user = rows[0];

  // Same message for unknown email and wrong password, so the response
  // doesn't reveal which emails are registered
  const passwordMatches = user && (await bcrypt.compare(String(password), user.password_hash));
  if (!passwordMatches) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  res.json({
    token: signToken(user),
    user: { id: user.id, name: user.name, email: user.email },
  });
});

module.exports = router;
