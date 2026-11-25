const express = require('express');
const pool = require('../db');
const requireAuth = require('../middleware/requireAuth');
const { validateReading } = require('../validation/readings');
const { SLOT_LABELS } = require('../utils/slots');

const router = express.Router();
router.use(requireAuth);

const MAX_READINGS_PER_DAY = 4;
const UNIQUE_VIOLATION = '23505';

function duplicateSlotMessage(slot) {
  return `You already have an ${SLOT_LABELS[slot]} reading for this date.`;
}

router.post('/', async (req, res) => {
  const body = req.body || {};
  const error = validateReading(body);
  if (error) return res.status(400).json({ error });

  const { date, slot } = body;
  const value = Number(body.value);

  const { rows: sameDay } = await pool.query(
    'SELECT slot FROM readings WHERE user_id = $1 AND reading_date = $2',
    [req.userId, date]
  );

  if (sameDay.length >= MAX_READINGS_PER_DAY) {
    return res.status(409).json({ error: 'You can add only 4 readings per day.' });
  }
  if (sameDay.some((reading) => reading.slot === slot)) {
    return res.status(409).json({ error: duplicateSlotMessage(slot) });
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO readings (user_id, reading_date, slot, value)
       VALUES ($1, $2, $3, $4)
       RETURNING id, reading_date AS date, slot, value`,
      [req.userId, date, slot, value]
    );
    res.status(201).json({ reading: rows[0] });
  } catch (err) {
    // Two requests for the same slot at the same moment can both pass the
    // check above; the unique constraint catches the second one.
    if (err.code === UNIQUE_VIOLATION) {
      return res.status(409).json({ error: duplicateSlotMessage(slot) });
    }
    throw err;
  }
});

module.exports = router;
