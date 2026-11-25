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

function addReading(reading) {
  return request(app)
    .post('/api/readings')
    .set('Authorization', `Bearer ${token}`)
    .send({ date: '2026-10-15', slot: 'morning_fasting', value: 110, ...reading });
}

describe('POST /api/readings', () => {
  it('creates a reading', async () => {
    const res = await addReading({ value: 132 });

    expect(res.status).toBe(201);
    expect(res.body.reading).toEqual({
      id: 1,
      date: '2026-10-15',
      slot: 'morning_fasting',
      value: 132,
    });
  });

  it('requires a value', async () => {
    const res = await addReading({ value: '' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Please enter a glucose value.');
  });

  it.each([39, 601, 120.5, 'abc'])('rejects %p as a value', async (value) => {
    const res = await addReading({ value });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Value must be between 40 and 600 mg/dl.');
  });

  it.each([40, 600])('accepts the boundary value %p', async (value) => {
    const res = await addReading({ value });
    expect(res.status).toBe(201);
  });

  it('rejects a second reading in the same slot on the same day', async () => {
    await addReading({ slot: 'after_lunch' });
    const res = await addReading({ slot: 'after_lunch' });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe('You already have an After lunch reading for this date.');
  });

  it('handles two requests for the same slot at the same time', async () => {
    const results = await Promise.all([
      addReading({ slot: 'after_dinner' }),
      addReading({ slot: 'after_dinner' }),
    ]);
    const statuses = results.map((res) => res.status).sort();

    expect(statuses).toEqual([201, 409]);
  });

  it('allows the same slot on a different day', async () => {
    await addReading({ slot: 'after_lunch', date: '2026-10-15' });
    const res = await addReading({ slot: 'after_lunch', date: '2026-10-16' });
    expect(res.status).toBe(201);
  });

  it('rejects a fifth reading on the same day', async () => {
    for (const slot of ['morning_fasting', 'after_breakfast', 'after_lunch', 'after_dinner']) {
      await addReading({ slot });
    }
    const res = await addReading({ slot: 'after_lunch' });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe('You can add only 4 readings per day.');
  });

  it('rejects a future date', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const res = await addReading({ date: toISODate(tomorrow) });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Date cannot be in the future.');
  });

  it('accepts today', async () => {
    const res = await addReading({ date: toISODate(new Date()) });
    expect(res.status).toBe(201);
  });

  it('rejects a date that does not exist', async () => {
    const res = await addReading({ date: '2026-02-30' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Please choose a valid date.');
  });

  it('rejects an unknown slot', async () => {
    const res = await addReading({ slot: 'midnight_snack' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Please choose a time slot.');
  });

  it('requires login', async () => {
    const res = await request(app).post('/api/readings').send({});
    expect(res.status).toBe(401);
  });
});
