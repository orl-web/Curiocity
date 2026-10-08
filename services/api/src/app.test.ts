import { describe, it, expect, afterAll } from 'vitest';
import request from 'supertest';
import { app } from './app';

afterAll(() => {
  // allow open postgres connections to close
});

describe('health', () => {
  it('returns ok with db status', async () => {
    const res = await request(app).get('/health');
    expect([200, 503]).toContain(res.status);
    expect(res.body).toHaveProperty('status');
    expect(res.body).toHaveProperty('db');
  });
});

describe('404 handler', () => {
  it('returns json 404 for unknown routes', async () => {
    const res = await request(app).get('/api/definitely-not-a-route');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Not found');
  });
});

describe('api docs', () => {
  it('returns openapi skeleton', async () => {
    const res = await request(app).get('/api/docs');
    expect(res.status).toBe(200);
    expect(res.body.openapi).toBe('3.0.0');
    expect(res.body.info.title).toBe('CurioCity API');
  });
});

describe('query validation', () => {
  it('rejects non-numeric limit', async () => {
    const res = await request(app).get('/api/guides?limit=abc');
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('BAD_REQUEST');
    expect(Array.isArray(res.body.details)).toBe(true);
  });

  it('rejects autocomplete without q', async () => {
    const res = await request(app).get('/api/guides/autocomplete');
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('BAD_REQUEST');
  });

  it('rejects invalid uuid path params', async () => {
    const res = await request(app).get('/api/users/guides/not-a-uuid/reviews');
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('BAD_REQUEST');
  });
});

describe('body validation', () => {
  it('rejects malformed register body', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'not-an-email' });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('BAD_REQUEST');
  });

  it('returns 400 on invalid json instead of hanging', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send('{bad json');
    expect(res.status).toBeGreaterThanOrEqual(400);
  });
});

describe('public read endpoints', () => {
  it('lists published guides', async () => {
    const res = await request(app).get('/api/guides?limit=5');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('guides');
    expect(Array.isArray(res.body.guides)).toBe(true);
  });

  it('returns autocomplete suggestions', async () => {
    const res = await request(app).get('/api/guides/autocomplete?q=Tok');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.suggestions)).toBe(true);
  });

  it('returns payments config without secrets', async () => {
    const res = await request(app).get('/api/payments/config');
    expect(res.status).toBe(200);
    expect(res.body.currency).toBe('eur');
    expect(res.body).toHaveProperty('publishableKey');
    expect(res.body).not.toHaveProperty('secretKey');
  });
});

describe('auth journey', () => {
  const email = `vitest-${Date.now()}@example.com`;
  let token = '';

  it('registers a new user', async () => {
    const res = await request(app).post('/api/auth/register').send({
      email,
      password: 'Test1234!',
      displayName: 'Vitest User',
      role: 'traveler',
    });
    expect(res.status).toBe(201);
    expect(res.body.user).toBeDefined();
  });

  it('logs in and returns a token', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email,
      password: 'Test1234!',
    });
    expect(res.status).toBe(200);
    token = res.body.token || res.body.accessToken;
    expect(token).toBeTruthy();
  });

  it('rejects wrong password', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email,
      password: 'WrongPassword1!',
    });
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it('fetches current user with token', async () => {
    const res = await request(app)
      .get('/api/users/me')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.email).toBe(email);
  });

  it('rejects requests without a token', async () => {
    const res = await request(app).get('/api/users/me');
    expect(res.status).toBe(401);
  });

  it('rejects change-password without auth', async () => {
    const res = await request(app)
      .post('/api/auth/change-password')
      .send({ currentPassword: 'Test1234!', newPassword: 'NewPass123!' });
    expect(res.status).toBe(401);
  });

  it('rejects change-password with short new password', async () => {
    const res = await request(app)
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: 'Test1234!', newPassword: 'short' });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('BAD_REQUEST');
  });

  it('rejects change-password with wrong current password', async () => {
    const res = await request(app)
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: 'WrongPassword1!', newPassword: 'NewPass123!' });
    expect(res.status).toBe(401);
  });

  it('changes password successfully', async () => {
    const res = await request(app)
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: 'Test1234!', newPassword: 'NewPass123!' });
    expect(res.status).toBe(200);
    expect(res.body.message).toContain('Password changed');
  });

  it('logs in with the new password', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email,
      password: 'NewPass123!',
    });
    expect(res.status).toBe(200);
  });
});
