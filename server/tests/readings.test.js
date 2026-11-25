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

  it('uses "a" for slots that start with a consonant', async () => {
    await addReading({ slot: 'morning_fasting' });
    const res = await addReading({ slot: 'morning_fasting' });

    expect(res.body.error).toBe('You already have a Morning (fasting) reading for this date.');
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

describe('GET /api/readings', () => {
  function listReadings(query = '') {
    return request(app).get(`/api/readings${query}`).set('Authorization', `Bearer ${token}`);
  }

  it('lists readings newest day first, in slot order within a day', async () => {
    await addReading({ date: '2026-10-14', slot: 'after_dinner', value: 150 });
    await addReading({ date: '2026-10-15', slot: 'after_lunch', value: 140 });
    await addReading({ date: '2026-10-15', slot: 'morning_fasting', value: 95 });

    const res = await listReadings();

    expect(res.status).toBe(200);
    expect(res.body.readings.map((r) => [r.date, r.slot])).toEqual([
      ['2026-10-15', 'morning_fasting'],
      ['2026-10-15', 'after_lunch'],
      ['2026-10-14', 'after_dinner'],
    ]);
  });

  it('filters by date', async () => {
    await addReading({ date: '2026-10-14' });
    await addReading({ date: '2026-10-15' });

    const res = await listReadings('?date=2026-10-15');

    expect(res.body.readings).toHaveLength(1);
    expect(res.body.readings[0].date).toBe('2026-10-15');
  });

  it('rejects an invalid date filter', async () => {
    const res = await listReadings('?date=yesterday');
    expect(res.status).toBe(400);
  });

  describe('pagination', () => {
    // 3 days x 4 slots = 12 readings
    beforeEach(async () => {
      for (const date of ['2026-10-13', '2026-10-14', '2026-10-15']) {
        for (const slot of ['morning_fasting', 'after_breakfast', 'after_lunch', 'after_dinner']) {
          await addReading({ date, slot });
        }
      }
    });

    it('defaults to page 1 with 20 per page', async () => {
      const res = await listReadings();

      expect(res.body.readings).toHaveLength(12);
      expect(res.body.pagination).toEqual({ page: 1, limit: 20, total: 12, totalPages: 1 });
    });

    it('returns the requested page', async () => {
      const page1 = await listReadings('?page=1&limit=5');
      const page3 = await listReadings('?page=3&limit=5');

      expect(page1.body.readings).toHaveLength(5);
      expect(page1.body.readings[0]).toMatchObject({ date: '2026-10-15', slot: 'morning_fasting' });
      expect(page3.body.readings).toHaveLength(2);
      expect(page3.body.readings[1]).toMatchObject({ date: '2026-10-13', slot: 'after_dinner' });
      expect(page3.body.pagination).toEqual({ page: 3, limit: 5, total: 12, totalPages: 3 });
    });

    it('does not repeat or skip readings across pages', async () => {
      const pages = await Promise.all([1, 2, 3].map((page) => listReadings(`?page=${page}&limit=5`)));
      const ids = pages.flatMap((res) => res.body.readings.map((r) => r.id));

      expect(new Set(ids).size).toBe(12);
    });

    it('works together with the date filter', async () => {
      const res = await listReadings('?date=2026-10-14&limit=3');

      expect(res.body.readings).toHaveLength(3);
      expect(res.body.pagination).toEqual({ page: 1, limit: 3, total: 4, totalPages: 2 });
    });

    it('returns an empty list past the last page', async () => {
      const res = await listReadings('?page=10&limit=5');

      expect(res.status).toBe(200);
      expect(res.body.readings).toEqual([]);
      expect(res.body.pagination.total).toBe(12);
    });

    it('caps the page size at 100', async () => {
      const res = await listReadings('?limit=500');
      expect(res.body.pagination.limit).toBe(100);
    });

    it.each(['?page=0', '?page=-1', '?limit=0', '?page=abc', '?limit=2.5'])(
      'rejects %s',
      async (query) => {
        const res = await listReadings(query);
        expect(res.status).toBe(400);
      }
    );
  });

  it("does not show another user's readings", async () => {
    await addReading({ value: 120 });
    const otherToken = await registerUser({ email: 'ravi@example.com' });

    const res = await request(app)
      .get('/api/readings')
      .set('Authorization', `Bearer ${otherToken}`);

    expect(res.status).toBe(200);
    expect(res.body.readings).toEqual([]);
  });
});

describe('PUT /api/readings/:id', () => {
  function updateReading(id, reading, authToken = token) {
    return request(app)
      .put(`/api/readings/${id}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ date: '2026-10-15', slot: 'morning_fasting', value: 110, ...reading });
  }

  it('updates the value', async () => {
    const created = await addReading({ value: 110 });
    const res = await updateReading(created.body.reading.id, { value: 125 });

    expect(res.status).toBe(200);
    expect(res.body.reading.value).toBe(125);
  });

  it('allows saving a reading without changing its slot', async () => {
    // the reading must not count as a duplicate of itself
    const created = await addReading({ slot: 'after_lunch' });
    const res = await updateReading(created.body.reading.id, { slot: 'after_lunch', value: 160 });

    expect(res.status).toBe(200);
  });

  it('allows editing when the day already has 4 readings', async () => {
    let lastId;
    for (const slot of ['morning_fasting', 'after_breakfast', 'after_lunch', 'after_dinner']) {
      const created = await addReading({ slot });
      lastId = created.body.reading.id;
    }

    const res = await updateReading(lastId, { slot: 'after_dinner', value: 180 });
    expect(res.status).toBe(200);
  });

  it('rejects moving a reading into a slot that is already taken', async () => {
    await addReading({ slot: 'after_lunch' });
    const created = await addReading({ slot: 'after_dinner' });

    const res = await updateReading(created.body.reading.id, { slot: 'after_lunch' });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe('You already have an After lunch reading for this date.');
  });

  it('rejects moving a reading to a day that is already full', async () => {
    for (const slot of ['morning_fasting', 'after_breakfast', 'after_lunch', 'after_dinner']) {
      await addReading({ slot, date: '2026-10-15' });
    }
    const created = await addReading({ date: '2026-10-14' });

    const res = await updateReading(created.body.reading.id, { date: '2026-10-15' });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe('You can add only 4 readings per day.');
  });

  it('applies the same validation as create', async () => {
    const created = await addReading();
    const res = await updateReading(created.body.reading.id, { value: 700 });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Value must be between 40 and 600 mg/dl.');
  });

  it("returns 404 for another user's reading", async () => {
    const created = await addReading();
    const otherToken = await registerUser({ email: 'ravi@example.com' });

    const res = await updateReading(created.body.reading.id, { value: 200 }, otherToken);

    expect(res.status).toBe(404);
  });

  it.each(['999', 'abc', '99999999999'])('returns 404 for id %p', async (id) => {
    const res = await updateReading(id, {});
    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/readings/:id', () => {
  function deleteReading(id, authToken = token) {
    return request(app).delete(`/api/readings/${id}`).set('Authorization', `Bearer ${authToken}`);
  }

  it('deletes a reading and frees up its slot', async () => {
    const created = await addReading({ slot: 'after_lunch' });

    const res = await deleteReading(created.body.reading.id);
    expect(res.status).toBe(204);

    const again = await addReading({ slot: 'after_lunch' });
    expect(again.status).toBe(201);
  });

  it("returns 404 for another user's reading and leaves it alone", async () => {
    const created = await addReading();
    const otherToken = await registerUser({ email: 'ravi@example.com' });

    const res = await deleteReading(created.body.reading.id, otherToken);
    expect(res.status).toBe(404);

    const { rowCount } = await pool.query('SELECT id FROM readings');
    expect(rowCount).toBe(1);
  });

  it('returns 404 for a reading that does not exist', async () => {
    const res = await deleteReading(999);
    expect(res.status).toBe(404);
  });
});
