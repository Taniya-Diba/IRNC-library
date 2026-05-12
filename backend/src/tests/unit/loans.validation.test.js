import { describe, it, expect } from 'vitest';
import { z } from 'zod';

const CheckoutSchema = z.object({
  book_id:  z.string().uuid(),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  notes:    z.string().max(500).optional()
});

function today(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

describe('Checkout validation', () => {
  it('accepts valid checkout with book_id only', () => {
    const r = CheckoutSchema.safeParse({
      book_id: '550e8400-e29b-41d4-a716-446655440000'
    });
    expect(r.success).toBe(true);
  });

  it('rejects invalid UUID for book_id', () => {
    const r = CheckoutSchema.safeParse({ book_id: 'not-a-uuid' });
    expect(r.success).toBe(false);
  });

  it('rejects due_date in wrong format', () => {
    const r = CheckoutSchema.safeParse({
      book_id:  '550e8400-e29b-41d4-a716-446655440000',
      due_date: '15/06/2026'
    });
    expect(r.success).toBe(false);
  });

  it('accepts due_date in YYYY-MM-DD format', () => {
    const r = CheckoutSchema.safeParse({
      book_id:  '550e8400-e29b-41d4-a716-446655440000',
      due_date: today(14)
    });
    expect(r.success).toBe(true);
  });

  it('rejects notes longer than 500 characters', () => {
    const r = CheckoutSchema.safeParse({
      book_id: '550e8400-e29b-41d4-a716-446655440000',
      notes:   'x'.repeat(501)
    });
    expect(r.success).toBe(false);
  });
});
