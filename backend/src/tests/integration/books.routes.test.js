import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../index.js';

const adminProfile = { id: 'admin-uuid', role: 'admin', is_active: true, full_name: 'Admin' };
const memberProfile = { id: 'member-uuid', role: 'member', is_active: true, full_name: 'Member' };

// Sets up getUser + one single() Once for the auth middleware profile lookup
async function mockAdminAuth() {
  const { supabaseClient, supabaseAdmin } = await import('../../db/supabase.js');
  supabaseClient.auth.getUser.mockResolvedValue({
    data: { user: { id: 'admin-auth-uuid' } }, error: null
  });
  supabaseAdmin.from().select().eq().single
    .mockResolvedValueOnce({ data: adminProfile, error: null });
}

async function mockMemberAuth() {
  const { supabaseClient, supabaseAdmin } = await import('../../db/supabase.js');
  supabaseClient.auth.getUser.mockResolvedValue({
    data: { user: { id: 'member-auth-uuid' } }, error: null
  });
  supabaseAdmin.from().select().eq().single
    .mockResolvedValueOnce({ data: memberProfile, error: null });
}

describe('GET /api/books', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns 200 with books array without authentication', async () => {
    const { supabaseAdmin } = await import('../../db/supabase.js');
    supabaseAdmin.from().select().range().order
      .mockResolvedValueOnce({ data: [], count: 0, error: null });

    const res = await request(app).get('/api/books');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('filters by status parameter', async () => {
    // When status is provided the route calls .eq('status', ...) after .order(),
    // so we must mock .eq (not .order) as the terminal call.
    const { supabaseAdmin } = await import('../../db/supabase.js');
    supabaseAdmin.from().eq.mockResolvedValueOnce({ data: [], count: 0, error: null });

    const res = await request(app).get('/api/books?status=available');
    expect(res.status).toBe(200);
  });

  it('ignores invalid status values', async () => {
    // Invalid status is excluded by VALID_STATUSES check → no .eq() added after .order()
    const { supabaseAdmin } = await import('../../db/supabase.js');
    supabaseAdmin.from().select().range().order
      .mockResolvedValueOnce({ data: [], count: 0, error: null });

    const res = await request(app).get('/api/books?status=invalid_status');
    expect(res.status).toBe(200);
  });
});

describe('POST /api/books', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns 401 without auth token', async () => {
    const res = await request(app)
      .post('/api/books')
      .send({ nfc_tag_id: 'LIB-001', title: 'Test', author: 'Author' });
    expect(res.status).toBe(401);
  });

  it('returns 403 when authenticated as member not admin', async () => {
    await mockMemberAuth();
    const res = await request(app)
      .post('/api/books')
      .set('Authorization', 'Bearer member-token')
      .send({ nfc_tag_id: 'LIB-001', title: 'Test', author: 'Author' });
    expect(res.status).toBe(403);
  });

  it('returns 201 when admin creates a valid book', async () => {
    await mockAdminAuth();
    const { supabaseAdmin } = await import('../../db/supabase.js');
    supabaseAdmin.from().select().eq().single
      .mockResolvedValueOnce({
        data: { id: 'new-book-uuid', nfc_tag_id: 'LIB-001',
                title: 'Dune', author: 'Frank Herbert', status: 'available' },
        error: null
      });

    const res = await request(app)
      .post('/api/books')
      .set('Authorization', 'Bearer admin-token')
      .send({ nfc_tag_id: 'LIB-001', title: 'Dune', author: 'Frank Herbert' });
    expect(res.status).toBe(201);
    expect(res.body.title).toBe('Dune');
  });

  it('returns 400 when required fields are missing', async () => {
    await mockAdminAuth();
    const res = await request(app)
      .post('/api/books')
      .set('Authorization', 'Bearer admin-token')
      .send({ nfc_tag_id: 'LIB-001' });
    expect(res.status).toBe(400);
  });
});

describe('PATCH /api/books/:id/lock', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns 409 when book is currently out', async () => {
    await mockAdminAuth();
    const { supabaseAdmin } = await import('../../db/supabase.js');
    supabaseAdmin.from().select().eq().single
      .mockResolvedValueOnce({
        data: { id: 'book-uuid', status: 'out', title: 'Dune' },
        error: null
      });

    const res = await request(app)
      .patch('/api/books/book-uuid/lock')
      .set('Authorization', 'Bearer admin-token');
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/checked out/i);
  });

  it('returns 409 when book is already locked', async () => {
    await mockAdminAuth();
    const { supabaseAdmin } = await import('../../db/supabase.js');
    supabaseAdmin.from().select().eq().single
      .mockResolvedValueOnce({
        data: { id: 'book-uuid', status: 'locked', title: 'Dune' },
        error: null
      });

    const res = await request(app)
      .patch('/api/books/book-uuid/lock')
      .set('Authorization', 'Bearer admin-token');
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/already locked/i);
  });
});
