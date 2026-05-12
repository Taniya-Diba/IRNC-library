import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../index.js';

describe('GET /health', () => {
  it('returns 200 with status ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });
});

describe('Unknown routes', () => {
  it('returns 404 for unknown path', async () => {
    const res = await request(app).get('/api/nonexistent');
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
  });

  it('returns JSON not HTML for 404', async () => {
    const res = await request(app).get('/completely/unknown');
    expect(res.headers['content-type']).toMatch(/json/);
  });
});
