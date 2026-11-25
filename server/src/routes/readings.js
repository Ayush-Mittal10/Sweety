const express = require('express');
const pool = require('../db');
const requireAuth = require('../middleware/requireAuth');
const { validateReading } = require('../validation/readings');
const { SLOT_LABELS, SLOTS } = require('../utils/slots');
const { isValidISODate } = require('../utils/dates');

const router = express.Router();
router.use(requireAuth);

const MAX_READINGS_PER_DAY = 4;
const UNIQUE_VIOLATION = '23505';

function duplicateSlotMessage(slot) {
  const label = SLOT_LABELS[slot];
  // "an After lunch" but "a Morning (fasting)"
  const article = /^[aeiou]/i.test(label) ? 'an' : 'a';
  return `You already have ${article} ${label} reading for this date.`;
}

// Checks the "one per slot" and "4 per day" rules against what is already
// saved. When editing, pass the reading's own id so it doesn't clash with itself.
// Returns an error message or null.
async function findDayConflict(userId, date, slot, ignoreId = null) {
  const { rows } = await pool.query(
    `SELECT slot FROM readings
     WHERE user_id = $1 AND reading_date = $2 AND id IS DISTINCT FROM $3::int`,
    [userId, date, ignoreId]
  );

  if (rows.length >= MAX_READINGS_PER_DAY) {
    return 'You can add only 4 readings per day.';
  }
  if (rows.some((reading) => reading.slot === slot)) {
    return duplicateSlotMessage(slot);
  }
  return null;
}

// Route ids come in as strings; anything that isn't a sensible id is
// treated as "not found" instead of reaching the database
function parseId(raw) {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 && id <= 2147483647 ? id : null;
}

// GET /api/readings?date=YYYY-MM-DD  (date is optional)
// Newest day first; within a day, in slot order (morning -> dinner).
router.get('/', async (req, res) => {
  const { date } = req.query;
  const params = [req.userId, SLOTS];
  let dateFilter = '';

  if (date !== undefined) {
    if (!isValidISODate(date)) {
      return res.status(400).json({ error: 'Please choose a valid date.' });
    }
    params.push(date);
    dateFilter = 'AND reading_date = $3';
  }

  const { rows } = await pool.query(
    `SELECT id, reading_date AS date, slot, value
     FROM readings
     WHERE user_id = $1 ${dateFilter}
     ORDER BY reading_date DESC, array_position($2::text[], slot::text)`,
    params
  );

  res.json({ readings: rows });
});

router.post('/', async (req, res) => {
  const body = req.body || {};
  const error = validateReading(body);
  if (error) return res.status(400).json({ error });

  const { date, slot } = body;
  const value = Number(body.value);

  const conflict = await findDayConflict(req.userId, date, slot);
  if (conflict) return res.status(409).json({ error: conflict });

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

router.put('/:id', async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(404).json({ error: 'Reading not found.' });

  const body = req.body || {};
  const error = validateReading(body);
  if (error) return res.status(400).json({ error });

  const { date, slot } = body;
  const value = Number(body.value);

  // Filtering by user_id means someone else's reading looks the same as a
  // missing one, so we don't reveal that it exists
  const existing = await pool.query('SELECT id FROM readings WHERE id = $1 AND user_id = $2', [
    id,
    req.userId,
  ]);
  if (existing.rowCount === 0) {
    return res.status(404).json({ error: 'Reading not found.' });
  }

  const conflict = await findDayConflict(req.userId, date, slot, id);
  if (conflict) return res.status(409).json({ error: conflict });

  try {
    const { rows } = await pool.query(
      `UPDATE readings
       SET reading_date = $1, slot = $2, value = $3, updated_at = now()
       WHERE id = $4 AND user_id = $5
       RETURNING id, reading_date AS date, slot, value`,
      [date, slot, value, id, req.userId]
    );
    res.json({ reading: rows[0] });
  } catch (err) {
    if (err.code === UNIQUE_VIOLATION) {
      return res.status(409).json({ error: duplicateSlotMessage(slot) });
    }
    throw err;
  }
});

router.delete('/:id', async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(404).json({ error: 'Reading not found.' });

  const result = await pool.query('DELETE FROM readings WHERE id = $1 AND user_id = $2', [
    id,
    req.userId,
  ]);
  if (result.rowCount === 0) {
    return res.status(404).json({ error: 'Reading not found.' });
  }

  res.status(204).end();
});

module.exports = router;
