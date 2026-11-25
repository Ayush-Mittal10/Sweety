const request = require('supertest');
const { app, pool, setupDb, resetDb, registerUser } = require('./helpers');
const { toISODate } = require('../src/utils/dates');

beforeAll(setupDb);
afterAll(() => pool.end());

let token;
beforeEach(async () => {
  await resetDb();
  token = await registerUser();
});

// Inserting directly keeps the setup short; the API rules are tested elsewhere
async function insertReadings(userId, readings) {
  for (const [date, slot, value] of readings) {
    await pool.query(
      'INSERT INTO readings (user_id, reading_date, slot, value) VALUES ($1, $2, $3, $4)',
      [userId, date, slot, value]
    );
  }
}

function getReport(date, authToken = token) {
  const query = date ? `?date=${date}` : '';
  return request(app).get(`/api/reports${query}`).set('Authorization', `Bearer ${authToken}`);
}

describe('GET /api/reports', () => {
  beforeEach(() =>
    insertReadings(1, [
      // previous month (September)
      ['2026-09-01', 'morning_fasting', 90],
      ['2026-09-30', 'after_dinner', 210],
      // current month, before the selected date
      ['2026-10-02', 'after_lunch', 150],
      // the selected date
      ['2026-10-15', 'after_lunch', 101],
      ['2026-10-15', 'morning_fasting', 100],
      ['2026-10-15', 'after_dinner', 101],
      // after the selected date, should not count anywhere
      ['2026-10-20', 'morning_fasting', 300],
    ])
  );

  it('returns the daily report with readings in slot order', async () => {
    const res = await getReport('2026-10-15');

    expect(res.status).toBe(200);
    expect(res.body.daily).toMatchObject({
      from: '2026-10-15',
      to: '2026-10-15',
      count: 3,
      highest: 101,
      lowest: 100,
      average: 100.7, // 302 / 3 = 100.666...
    });
    expect(res.body.daily.readings.map((r) => r.slot)).toEqual([
      'morning_fasting',
      'after_lunch',
      'after_dinner',
    ]);
  });

  it('returns month-to-date stats up to the selected date only', async () => {
    const res = await getReport('2026-10-15');

    expect(res.body.monthToDate).toMatchObject({
      from: '2026-10-01',
      to: '2026-10-15',
      count: 4,
      highest: 150,
      lowest: 100,
      average: 113,
    });
  });

  it('includes a per-day summary of the month for the chart', async () => {
    const res = await getReport('2026-10-15');

    // only days with readings, oldest first; the 20th is after the selected date
    expect(res.body.monthToDate.byDay).toEqual([
      { date: '2026-10-02', average: 150, lowest: 150, highest: 150 },
      { date: '2026-10-15', average: 100.7, lowest: 100, highest: 101 },
    ]);
  });

  it('returns stats for the whole previous month', async () => {
    const res = await getReport('2026-10-15');

    expect(res.body.previousMonth).toEqual({
      from: '2026-09-01',
      to: '2026-09-30',
      count: 2,
      highest: 210,
      lowest: 90,
      average: 150,
    });
  });

  it('returns count 0 and nulls when there are no readings', async () => {
    const res = await getReport('2026-08-10');

    expect(res.body.daily).toEqual({
      from: '2026-08-10',
      to: '2026-08-10',
      count: 0,
      highest: null,
      lowest: null,
      average: null,
      readings: [],
    });
  });

  it("does not include another user's readings", async () => {
    const otherToken = await registerUser({ email: 'ravi@example.com' });
    const res = await getReport('2026-10-15', otherToken);

    expect(res.body.daily.count).toBe(0);
    expect(res.body.monthToDate.count).toBe(0);
    expect(res.body.previousMonth.count).toBe(0);
  });

  it('defaults to today when no date is given', async () => {
    const res = await getReport();
    expect(res.status).toBe(200);
    expect(res.body.date).toBe(toISODate(new Date()));
  });

  it('rejects an invalid date', async () => {
    const res = await getReport('2026-13-01');
    expect(res.status).toBe(400);
  });

  it('rejects a future date', async () => {
    const res = await getReport('2099-01-01');
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Date cannot be in the future.');
  });
});
