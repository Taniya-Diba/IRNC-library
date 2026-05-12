import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../index.js';

describe('POST /api/auth/register', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns 400 when required fields are missing', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'test@test.com' });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 400 when password is less than 8 characters', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        full_name: 'Test User', email: 'test@test.com',
        password: 'short', phone: '+905550000001',
        membership_id: 'TEST-001'
      });
    expect(res.status).toBe(400);
  });

  it('returns 409 when membership_id already exists', async () => {
    const { supabaseAdmin } = await import('../../db/supabase.js');
    supabaseAdmin.from().select().eq().maybeSingle
      .mockResolvedValueOnce({ data: { id: 'existing' }, error: null });

    const res = await request(app)
      .post('/api/auth/register')
      .send({
        full_name: 'Test User', email: 'test@test.com',
        password:  'password123', phone: '+905550000001',
        membership_id: 'EXISTING-001'
      });
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/membership/i);
  });

  it('returns 400 when membership_id contains invalid characters', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        full_name: 'Test User', email: 'test@test.com',
        password:  'password123', phone: '+905550000001',
        membership_id: 'INVALID ID!'
      });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/auth/login', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns 401 with generic message for wrong credentials', async () => {
    const { supabaseClient } = await import('../../db/supabase.js');
    supabaseClient.auth.signInWithPassword
      .mockResolvedValueOnce({ data: {}, error: { message: 'Invalid login credentials' } });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'wrong@test.com', password: 'wrongpass' });
    expect(res.status).toBe(401);
    // Must return a generic error that doesn't leak whether email exists
    expect(res.body.error).toBe('Invalid email or password');
  });

  it('returns 400 when email format is invalid', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'not-an-email', password: 'password123' });
    expect(res.status).toBe(400);
  });

  it('returns 200 with tokens on valid credentials', async () => {
    const { supabaseClient, supabaseAdmin } = await import('../../db/supabase.js');
    supabaseClient.auth.signInWithPassword.mockResolvedValueOnce({
      data: {
        user:    { id: 'auth-uuid' },
        session: { access_token: 'access-tok', refresh_token: 'refresh-tok', expires_in: 3600 }
      },
      error: null
    });
    supabaseAdmin.from().select().eq().single
      .mockResolvedValueOnce({
        data: { id: 'user-uuid', full_name: 'Test User', role: 'member',
                membership_id: 'TEST-001', phone: '+90555', is_active: true },
        error: null
      });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@test.com', password: 'password123' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('access_token');
    expect(res.body).toHaveProperty('refresh_token');
    expect(res.body.user.role).toBe('member');
  });
});
