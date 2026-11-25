const express = require('express');
const pool = require('../db');
const requireAuth = require('../middleware/requireAuth');
const { SLOTS } = require('../utils/slots');
const { todayISO, isValidISODate } = require('../utils/dates');
const { getReportRanges } = require('../utils/reportRanges');

const router = express.Router();
router.use(requireAuth);

// Highest, lowest, average (1 decimal) and count for a date range.
// With no readings, count is 0 and the rest are null.
async function getStats(userId, { from, to }) {
  const { rows } = await pool.query(
    `SELECT COUNT(*)::int                      AS count,
            MAX(value)                         AS highest,
            MIN(value)                         AS lowest,
            ROUND(AVG(value)::numeric, 1)::float AS average
     FROM readings
     WHERE user_id = $1 AND reading_date BETWEEN $2 AND $3`,
    [userId, from, to]
  );
  return { from, to, ...rows[0] };
}

// GET /api/reports?date=YYYY-MM-DD  (defaults to today)
router.get('/', async (req, res) => {
  const date = req.query.date || todayISO();

  if (!isValidISODate(date)) {
    return res.status(400).json({ error: 'Please choose a valid date.' });
  }
  if (date > todayISO()) {
    return res.status(400).json({ error: 'Date cannot be in the future.' });
  }

  const ranges = getReportRanges(date);

  const [daily, monthToDate, previousMonth, dailyReadings, monthByDay] = await Promise.all([
    getStats(req.userId, ranges.daily),
    getStats(req.userId, ranges.monthToDate),
    getStats(req.userId, ranges.previousMonth),
    pool.query(
      `SELECT id, reading_date AS date, slot, value
       FROM readings
       WHERE user_id = $1 AND reading_date = $2
       ORDER BY array_position($3::text[], slot::text)`,
      [req.userId, date, SLOTS]
    ),
    // one row per day that has readings, used for the chart
    pool.query(
      `SELECT reading_date                          AS date,
              ROUND(AVG(value)::numeric, 1)::float AS average,
              MIN(value)                           AS lowest,
              MAX(value)                           AS highest
       FROM readings
       WHERE user_id = $1 AND reading_date BETWEEN $2 AND $3
       GROUP BY reading_date
       ORDER BY reading_date`,
      [req.userId, ranges.monthToDate.from, ranges.monthToDate.to]
    ),
  ]);

  res.json({
    date,
    daily: { ...daily, readings: dailyReadings.rows },
    monthToDate: { ...monthToDate, byDay: monthByDay.rows },
    previousMonth,
  });
});

module.exports = router;
