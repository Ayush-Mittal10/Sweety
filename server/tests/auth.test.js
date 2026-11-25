const request = require('supertest');
const { app, pool, setupDb, resetDb, registerUser } = require('./helpers');

beforeAll(setupDb);
beforeEach(resetDb);
afterAll(() => pool.end());

describe('POST /api/auth/register', () => {
  it('creates a user and stores a hashed password', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Asha', email: 'Asha@Example.com', password: 'secret123' });

    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
    expect(res.body.user).toEqual({ id: 1, name: 'Asha', email: 'asha@example.com' });

    const { rows } = await pool.query('SELECT password_hash FROM users');
    expect(rows[0].password_hash).not.toBe('secret123');
    expect(rows[0].password_hash.startsWith('$2b$')).toBe(true);
  });

  it('rejects an email that is already registered', async () => {
    await registerUser();
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Other', email: 'ASHA@example.com', password: 'secret123' });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe('An account with this email already exists.');
  });

  it('rejects a short password', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Asha', email: 'asha@example.com', password: '123' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Password must be at least 8 characters.');
  });
});

describe('POST /api/auth/login', () => {
  beforeEach(() => registerUser());

  it('returns a token for correct credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'asha@example.com', password: 'secret123' });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe('asha@example.com');
  });

  it('gives the same error for a wrong password and an unknown email', async () => {
    const wrongPassword = await request(app)
      .post('/api/auth/login')
      .send({ email: 'asha@example.com', password: 'wrongpass' });
    const unknownEmail = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: 'secret123' });

    expect(wrongPassword.status).toBe(401);
    expect(unknownEmail.status).toBe(401);
    expect(wrongPassword.body.error).toBe(unknownEmail.body.error);
  });
});

describe('GET /api/auth/me', () => {
  it('returns the logged in user', async () => {
    const token = await registerUser();
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.user.name).toBe('Asha');
  });

  it('returns 401 without a token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('returns 401 for an invalid token', async () => {
    const res = await request(app).get('/api/auth/me').set('Authorization', 'Bearer not-a-real-token');
    expect(res.status).toBe(401);
  });
});
