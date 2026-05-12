import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock sharp so image processing doesn't fail on fake buffers
vi.mock('sharp', () => ({
  default: vi.fn(() => ({
    resize:   vi.fn().mockReturnThis(),
    webp:     vi.fn().mockReturnThis(),
    toBuffer: vi.fn().mockResolvedValue(Buffer.from('processed-webp-image'))
  }))
}));

describe('uploadToStorage', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('throws when Supabase upload returns error', async () => {
    const { supabaseAdmin } = await import('../../db/supabase.js');
    supabaseAdmin.storage.from().upload
      .mockResolvedValueOnce({ data: null, error: { message: 'Bucket not found' } });

    const { uploadToStorage } = await import('../../middleware/upload.js');
    await expect(uploadToStorage({
      buffer:       Buffer.from('fake'),
      mimetype:     'image/jpeg',
      originalName: 'cover.jpg',
      bucket:       'book-covers',
      bookId:       'test-book-id'
    })).rejects.toThrow('Storage upload failed');
  });

  it('returns path and publicUrl on success for image', async () => {
    const { supabaseAdmin } = await import('../../db/supabase.js');
    supabaseAdmin.storage.from().upload
      .mockResolvedValueOnce({ data: { path: 'test-book-id/123_cover.webp' }, error: null });
    supabaseAdmin.storage.from().getPublicUrl
      .mockReturnValueOnce({ data: { publicUrl: 'https://cdn.supabase.co/test-book-id/123_cover.webp' } });

    const { uploadToStorage } = await import('../../middleware/upload.js');
    const result = await uploadToStorage({
      buffer:       Buffer.from('fake-image'),
      mimetype:     'image/jpeg',
      originalName: 'cover.jpg',
      bucket:       'book-covers',
      bookId:       'test-book-id'
    });
    expect(result.path).toContain('test-book-id');
    expect(result.publicUrl).toContain('https://');
  });

  it('returns null publicUrl for private PDF bucket', async () => {
    const { supabaseAdmin } = await import('../../db/supabase.js');
    supabaseAdmin.storage.from().upload
      .mockResolvedValueOnce({ data: { path: 'test-book-id/123_book.pdf' }, error: null });

    const { uploadToStorage } = await import('../../middleware/upload.js');
    const result = await uploadToStorage({
      buffer:       Buffer.from('%PDF-fake'),
      mimetype:     'application/pdf',
      originalName: 'book.pdf',
      bucket:       'book-pdfs',
      bookId:       'test-book-id'
    });
    expect(result.publicUrl).toBeNull();
  });
});
