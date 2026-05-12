import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../index.js';

describe('POST /api/loans (checkout)', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns 401 when not authenticated', async () => {
    const res = await request(app)
      .post('/api/loans')
      .send({ book_id: '550e8400-e29b-41d4-a716-446655440000' });
    expect(res.status).toBe(401);
  });

  it('returns 400 when book_id is not a valid UUID', async () => {
    const { supabaseClient, supabaseAdmin } = await import('../../db/supabase.js');
    supabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'auth-uuid' } }, error: null
    });
    supabaseAdmin.from().select().eq().single.mockResolvedValueOnce({
      data: { id: 'user-uuid', role: 'member', is_active: true },
      error: null
    });

    const res = await request(app)
      .post('/api/loans')
      .set('Authorization', 'Bearer member-token')
      .send({ book_id: 'not-a-uuid' });
    expect(res.status).toBe(400);
  });

  it('returns 403 when book is locked', async () => {
    const { supabaseClient, supabaseAdmin } = await import('../../db/supabase.js');
    supabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'auth-uuid' } }, error: null
    });
    supabaseAdmin.from().select().eq().single
      .mockResolvedValueOnce({ data: { id: 'user-uuid', role: 'member', is_active: true }, error: null })
      .mockResolvedValueOnce({ data: { id: 'book-uuid', status: 'locked', title: 'Locked Book' }, error: null });

    const res = await request(app)
      .post('/api/loans')
      .set('Authorization', 'Bearer member-token')
      .send({ book_id: '550e8400-e29b-41d4-a716-446655440000' });
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/restricted/i);
  });

  it('returns 409 when book is already out', async () => {
    const { supabaseClient, supabaseAdmin } = await import('../../db/supabase.js');
    supabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'auth-uuid' } }, error: null
    });
    supabaseAdmin.from().select().eq().single
      .mockResolvedValueOnce({ data: { id: 'user-uuid', role: 'member', is_active: true }, error: null })
      .mockResolvedValueOnce({ data: { id: 'book-uuid', status: 'out', title: 'Out Book' }, error: null });

    const res = await request(app)
      .post('/api/loans')
      .set('Authorization', 'Bearer member-token')
      .send({ book_id: '550e8400-e29b-41d4-a716-446655440000' });
    expect(res.status).toBe(409);
  });

  it('returns 400 when due_date is in the past', async () => {
    const { supabaseClient, supabaseAdmin } = await import('../../db/supabase.js');
    supabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'auth-uuid' } }, error: null
    });
    supabaseAdmin.from().select().eq().single
      .mockResolvedValueOnce({ data: { id: 'user-uuid', role: 'member', is_active: true }, error: null });

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const res = await request(app)
      .post('/api/loans')
      .set('Authorization', 'Bearer member-token')
      .send({
        book_id:  '550e8400-e29b-41d4-a716-446655440000',
        due_date: yesterday.toISOString().slice(0, 10)
      });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/future/i);
  });

  it('returns 400 when due_date is more than 90 days away', async () => {
    const { supabaseClient, supabaseAdmin } = await import('../../db/supabase.js');
    supabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'auth-uuid' } }, error: null
    });
    supabaseAdmin.from().select().eq().single
      .mockResolvedValueOnce({ data: { id: 'user-uuid', role: 'member', is_active: true }, error: null })
      .mockResolvedValueOnce({ data: { id: 'book-uuid', status: 'available' }, error: null });

    const farFuture = new Date();
    farFuture.setDate(farFuture.getDate() + 100);

    const res = await request(app)
      .post('/api/loans')
      .set('Authorization', 'Bearer member-token')
      .send({
        book_id:  '550e8400-e29b-41d4-a716-446655440000',
        due_date: farFuture.toISOString().slice(0, 10)
      });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/90 days/i);
  });
});
