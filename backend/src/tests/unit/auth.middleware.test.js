import { describe, it, expect, vi, beforeEach } from 'vitest';
import { requireAuth, requireAdmin } from '../../middleware/auth.js';

describe('requireAuth middleware', () => {
  let req, res, next;

  beforeEach(() => {
    vi.clearAllMocks();
    req  = { headers: {}, ip: '127.0.0.1' };
    res  = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    next = vi.fn();
  });

  it('returns 401 when no Authorization header', async () => {
    await requireAuth(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.any(String) })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when Authorization header does not start with Bearer', async () => {
    req.headers.authorization = 'Basic abc123';
    await requireAuth(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('returns 401 with TOKEN_EXPIRED code when token is expired', async () => {
    const { supabaseClient } = await import('../../db/supabase.js');
    supabaseClient.auth.getUser.mockResolvedValueOnce({
      data: { user: null },
      error: { message: 'token is expired', status: 401 }
    });
    req.headers.authorization = 'Bearer expired.token.here';
    await requireAuth(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'TOKEN_EXPIRED' })
    );
  });

  it('returns 401 with TOKEN_INVALID code for bad token', async () => {
    const { supabaseClient } = await import('../../db/supabase.js');
    supabaseClient.auth.getUser.mockResolvedValueOnce({
      data: { user: null },
      error: { message: 'invalid JWT' }
    });
    req.headers.authorization = 'Bearer bad.token';
    await requireAuth(req, res, next);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'TOKEN_INVALID' })
    );
  });

  it('returns 403 when user account is disabled', async () => {
    const { supabaseClient, supabaseAdmin } = await import('../../db/supabase.js');
    supabaseClient.auth.getUser.mockResolvedValueOnce({
      data: { user: { id: 'auth-uuid-123' } },
      error: null
    });
    supabaseAdmin.from().select().eq().single
      .mockResolvedValueOnce({
        data: { id: 'user-uuid', role: 'member', is_active: false },
        error: null
      });
    req.headers.authorization = 'Bearer valid.token';
    await requireAuth(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringContaining('disabled') })
    );
  });

  it('attaches user to req and calls next for valid token', async () => {
    const { supabaseClient, supabaseAdmin } = await import('../../db/supabase.js');
    const mockProfile = { id: 'user-uuid', role: 'member', is_active: true, full_name: 'Test' };
    supabaseClient.auth.getUser.mockResolvedValueOnce({
      data: { user: { id: 'auth-uuid' } }, error: null
    });
    supabaseAdmin.from().select().eq().single
      .mockResolvedValueOnce({ data: mockProfile, error: null });
    req.headers.authorization = 'Bearer valid.token.here';
    await requireAuth(req, res, next);
    expect(req.user).toBeDefined();
    expect(req.user.role).toBe('member');
    expect(next).toHaveBeenCalled();
  });
});

describe('requireAdmin middleware', () => {
  it('returns 403 when user is a member not admin', () => {
    const req  = { user: { role: 'member' } };
    const res  = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();
    requireAdmin(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next when user is admin', () => {
    const req  = { user: { role: 'admin' } };
    const res  = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();
    requireAdmin(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('returns 401 when req.user is undefined', () => {
    const req  = {};
    const res  = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();
    requireAdmin(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });
});
