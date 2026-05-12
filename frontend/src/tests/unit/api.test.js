import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('API client error handling', () => {
  beforeEach(() => { fetch.mockReset(); });

  it('throws error with code TOKEN_EXPIRED on 401 TOKEN_EXPIRED response', async () => {
    fetch.mockResolvedValueOnce({
      ok:     false,
      status: 401,
      json:   async () => ({ error: 'Token expired', code: 'TOKEN_EXPIRED' })
    });

    const { auth } = await import('../../lib/api.js');
    try {
      await auth.me();
      expect.fail('Should have thrown');
    } catch (err) {
      expect(err.code).toBe('TOKEN_EXPIRED');
      expect(err.status).toBe(401);
    }
  });

  it('throws error with code TOKEN_INVALID for invalid token', async () => {
    fetch.mockResolvedValueOnce({
      ok:     false,
      status: 401,
      json:   async () => ({ error: 'Invalid token', code: 'TOKEN_INVALID' })
    });

    const { auth } = await import('../../lib/api.js');
    try {
      await auth.me();
      expect.fail('Should have thrown');
    } catch (err) {
      expect(err.code).toBe('TOKEN_INVALID');
    }
  });

  it('returns null for 204 No Content responses', async () => {
    fetch.mockResolvedValueOnce({
      ok:     true,
      status: 204,
      json:   async () => { throw new Error('No body'); }
    });

    const { books } = await import('../../lib/api.js');
    const result = await books.remove('some-id');
    expect(result).toBeNull();
  });
});

describe('API client FormData upload (ISSUE-06)', () => {
  beforeEach(() => { fetch.mockReset(); });

  it('does NOT manually set Content-Type when uploading FormData', async () => {
    fetch.mockResolvedValueOnce({
      ok: true, status: 200,
      json: async () => ({ cover_image_url: 'https://example.com/cover.jpg' })
    });

    const { books } = await import('../../lib/api.js');
    const fakeFile = new File(['content'], 'cover.jpg', { type: 'image/jpeg' });
    await books.uploadCover('book-id', fakeFile);

    const [, options] = fetch.mock.calls[0];
    // Content-Type must NOT be set — browser sets it automatically with multipart boundary
    expect(options.headers['Content-Type']).toBeUndefined();
  });
});
