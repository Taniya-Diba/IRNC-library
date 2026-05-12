import { describe, it, expect } from 'vitest';
import { z } from 'zod';

const BookSchema = z.object({
  nfc_tag_id:            z.string().min(1).trim(),
  title:                 z.string().min(1).trim(),
  author:                z.string().min(1).trim(),
  translator:            z.string().trim().optional(),
  isbn:                  z.string().trim().optional(),
  eisbn:                 z.string().trim().optional(),
  category:              z.string().trim().optional(),
  shelf_location:        z.string().trim().optional(),
  cover_image_path:      z.string().trim().optional(),
  back_cover_image_path: z.string().trim().optional(),
  pdf_path:              z.string().trim().optional(),
  notes:                 z.string().trim().optional(),
});

describe('BookSchema validation', () => {
  it('accepts a valid book with required fields only', () => {
    const result = BookSchema.safeParse({
      nfc_tag_id: 'LIB-0001',
      title:      'Dune',
      author:     'Frank Herbert'
    });
    expect(result.success).toBe(true);
  });

  it('rejects a book with empty nfc_tag_id', () => {
    const result = BookSchema.safeParse({
      nfc_tag_id: '',
      title:      'Dune',
      author:     'Frank Herbert'
    });
    expect(result.success).toBe(false);
    expect(result.error.errors[0].path).toContain('nfc_tag_id');
  });

  it('rejects a book with missing title', () => {
    const result = BookSchema.safeParse({
      nfc_tag_id: 'LIB-0001',
      author:     'Frank Herbert'
    });
    expect(result.success).toBe(false);
  });

  it('accepts optional fields when provided', () => {
    const result = BookSchema.safeParse({
      nfc_tag_id:    'LIB-0001',
      title:         'Meditations',
      author:        'Marcus Aurelius',
      translator:    'Gregory Hays',
      isbn:          '9780140449334',
      category:      'Philosophy',
      shelf_location:'B1',
      notes:         'Classic text'
    });
    expect(result.success).toBe(true);
    expect(result.data.translator).toBe('Gregory Hays');
  });

  it('trims whitespace from string fields', () => {
    const result = BookSchema.safeParse({
      nfc_tag_id: '  LIB-0001  ',
      title:      '  Dune  ',
      author:     '  Frank Herbert  '
    });
    expect(result.success).toBe(true);
    expect(result.data.nfc_tag_id).toBe('LIB-0001');
    expect(result.data.title).toBe('Dune');
  });
});
