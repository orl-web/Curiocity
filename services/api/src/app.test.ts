import { describe, it, expect, afterAll, beforeAll } from 'vitest';
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

describe('time slots and validity windows', () => {
  const email = `vitest-slots-${Date.now()}@example.com`;
  const password = 'Test1234!';
  let token = '';

  const stops = [
    { name: 'Stop One', latitude: 41.9028, longitude: 12.4964 },
    { name: 'Stop Two', latitude: 41.9038, longitude: 12.4974 },
  ];

  beforeAll(async () => {
    const reg = await request(app).post('/api/auth/register').send({
      email, password, displayName: 'Slots User', role: 'creator',
    });
    token = reg.body.token || reg.body.accessToken;
    if (!token) {
      const login = await request(app).post('/api/auth/login').send({ email, password });
      token = login.body.token || login.body.accessToken;
    }
    expect(token).toBeTruthy();
  });

  it('publishes a guide with time slots and a validity window', async () => {
    const res = await request(app)
      .post('/api/guides')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Night food tour',
        city: 'Rome',
        category: 'food',
        timeSlots: ['night', 'evening'],
        validFrom: new Date(Date.now() - 86400000).toISOString(),
        validUntil: new Date(Date.now() + 86400000 * 7).toISOString(),
        recurrence: { daysOfWeek: [6], slots: ['night'] },
        stops,
      });
    expect(res.status).toBe(201);
  });

  it('rejects an invalid time slot value', async () => {
    const res = await request(app)
      .post('/api/guides')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Bad slots', city: 'Rome', category: 'food', timeSlots: ['midday'], stops });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('BAD_REQUEST');
  });

  it('filters guides by overlapping time slot', async () => {
    const res = await request(app).get('/api/guides?timeSlots=night&limit=50');
    expect(res.status).toBe(200);
    const matched = res.body.guides.filter((g: any) => g.timeSlots?.length);
    expect(matched.length).toBeGreaterThan(0);
    expect(matched.every((g: any) => g.timeSlots.includes('night'))).toBe(true);
  });

  it('does not return night-only guides for a morning filter', async () => {
    const res = await request(app).get('/api/guides?timeSlots=morning&limit=50');
    expect(res.status).toBe(200);
    const nightOnly = res.body.guides.filter((g: any) => g.timeSlots?.length && !g.timeSlots.includes('morning'));
    expect(nightOnly.length).toBe(0);
  });

  it('excludes expired guides by default and includes them with includeExpired', async () => {
    const expired = await request(app)
      .post('/api/guides')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Expired tour', city: 'Rome', category: 'history',
        validUntil: new Date(Date.now() - 86400000).toISOString(),
        stops,
      });
    expect(expired.status).toBe(201);

    const filtered = await request(app).get('/api/guides?limit=50');
    expect(filtered.body.guides.some((g: any) => g.title === 'Expired tour')).toBe(false);

    const withExpired = await request(app).get('/api/guides?includeExpired=true&limit=50');
    expect(withExpired.body.guides.some((g: any) => g.title === 'Expired tour')).toBe(true);
  });

  it('returns time slot and recurrence fields on the guide detail', async () => {
    const list = await request(app).get('/api/guides?search=Night food tour&limit=5');
    expect(list.body.guides.length).toBeGreaterThan(0);
    const detail = await request(app).get(`/api/guides/${list.body.guides[0].id}`);
    expect(detail.status).toBe(200);
    expect(detail.body.timeSlots).toEqual(expect.arrayContaining(['night', 'evening']));
    expect(detail.body.recurrence).toEqual({ daysOfWeek: [6], slots: ['night'] });
    expect(detail.body.validUntil).toBeTruthy();
  });
});
