import { Router } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../db/supabase.js';
import { requireAuth, requireAdmin, optionalAuth } from '../middleware/auth.js';

const router = Router();

const BookSchema = z.object({
  nfc_tag_id:            z.string().min(1, 'NFC Tag ID is required').trim(),
  title:                 z.string().min(1, 'Title is required').trim(),
  author:                z.string().min(1, 'Author is required').trim(),
  translator:            z.string().trim().optional(),
  isbn:                  z.string().trim().optional(),
  eisbn:                 z.string().trim().optional(),
  category:              z.string().trim().optional(),
  shelf_location:        z.string().trim().optional(),
  cover_image_path:      z.string().trim().optional(),
  back_cover_image_path: z.string().trim().optional(),
  pdf_path:              z.string().trim().optional(),
  notes:                 z.string().trim().optional()
});

const VALID_STATUSES = ['available', 'out', 'overdue', 'locked'];

// GET /api/books — public catalogue
router.get('/', async (req, res, next) => {
  try {
    const { search, category, status, page = 1, limit = 50 } = req.query;
    const from = (page - 1) * limit;
    const to   = from + Number(limit) - 1;

    let query = supabaseAdmin
      .from('books')
      .select('*', { count: 'exact' })
      .range(from, to)
      .order('title');

    if (search)   query = query.or(`title.ilike.%${search}%,author.ilike.%${search}%`);
    if (category) query = query.eq('category', category);
    if (status && VALID_STATUSES.includes(status)) query = query.eq('status', status);

    const { data, error, count } = await query;
    if (error) throw error;

    const booksWithUrls = (data || []).map(book => {
      let coverUrl = null;
      if (book.cover_image_path) {
        const { data: urlData } = supabaseAdmin.storage
          .from('book-covers')
          .getPublicUrl(book.cover_image_path);
        coverUrl = urlData.publicUrl;
      }
      return { ...book, cover_image_url: coverUrl };
    });

    res.json({ data: booksWithUrls, total: count, page: Number(page), limit: Number(limit) });
  } catch (err) { next(err); }
});

// GET /api/books/nfc/:nfcId — lookup by NFC tag (public, for phone tap)
router.get('/nfc/:nfcId', async (req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('books')
      .select('*')
      .eq('nfc_tag_id', req.params.nfcId)
      .single();
    if (error) return res.status(404).json({ error: 'Book not found' });
    res.json(data);
  } catch (err) { next(err); }
});

// GET /api/books/:id — public, authenticated users also receive signed PDF URL
router.get('/:id', optionalAuth, async (req, res, next) => {
  try {
    const { data: book, error } = await supabaseAdmin
      .from('books')
      .select('*')
      .eq('id', req.params.id)
      .single();
    if (error) return res.status(404).json({ error: 'Book not found' });

    let pdfUrl = null;
    if (book.pdf_path && req.user) {
      const { getSignedUrl } = await import('../middleware/upload.js');
      pdfUrl = await getSignedUrl('book-pdfs', book.pdf_path, 3600);
    }

    let coverUrl = null;
    let backCoverUrl = null;
    if (book.cover_image_path) {
      const { data: urlData } = supabaseAdmin.storage
        .from('book-covers')
        .getPublicUrl(book.cover_image_path);
      coverUrl = urlData.publicUrl;
    }
    if (book.back_cover_image_path) {
      const { data: urlData } = supabaseAdmin.storage
        .from('book-back-covers')
        .getPublicUrl(book.back_cover_image_path);
      backCoverUrl = urlData.publicUrl;
    }

    res.json({
      ...book,
      cover_image_url:      coverUrl,
      back_cover_image_url: backCoverUrl,
      pdf_url:              pdfUrl
    });
  } catch (err) { next(err); }
});

// POST /api/books — admin only
router.post('/', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const body = BookSchema.parse(req.body);
    const { data, error } = await supabaseAdmin
      .from('books')
      .insert(body)
      .select()
      .single();
    if (error) {
      if (error.code === '23505') return res.status(409).json({ error: 'NFC Tag ID already exists' });
      throw error;
    }
    res.status(201).json(data);
  } catch (err) { next(err); }
});

// PATCH /api/books/:id — admin only
router.patch('/:id', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const body = BookSchema.partial().parse(req.body);
    const { data, error } = await supabaseAdmin
      .from('books')
      .update(body)
      .eq('id', req.params.id)
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err) { next(err); }
});

// PATCH /api/books/:id/lock — admin only
router.patch('/:id/lock', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { data: current, error: fetchError } = await supabaseAdmin
      .from('books')
      .select('id, status, title')
      .eq('id', req.params.id)
      .single();

    if (fetchError || !current) {
      return res.status(404).json({ error: 'Book not found' });
    }
    if (current.status === 'out' || current.status === 'overdue') {
      return res.status(409).json({
        error: `Cannot lock "${current.title}" — it is currently checked out`
      });
    }
    if (current.status === 'locked') {
      return res.status(409).json({ error: 'Book is already locked' });
    }

    const { data, error } = await supabaseAdmin
      .from('books')
      .update({ status: 'locked' })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) { next(err); }
});

// PATCH /api/books/:id/unlock — admin only
router.patch('/:id/unlock', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { data: current, error: fetchError } = await supabaseAdmin
      .from('books')
      .select('id, status')
      .eq('id', req.params.id)
      .single();

    if (fetchError || !current) {
      return res.status(404).json({ error: 'Book not found' });
    }
    if (current.status !== 'locked') {
      return res.status(409).json({ error: 'Book is not locked' });
    }

    const { data, error } = await supabaseAdmin
      .from('books')
      .update({ status: 'available' })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) { next(err); }
});

// DELETE /api/books/:id — admin only, cleans up storage files before deleting
router.delete('/:id', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { data: activeLoans } = await supabaseAdmin
      .from('loans')
      .select('id')
      .eq('book_id', req.params.id)
      .in('status', ['out', 'overdue']);

    if (activeLoans?.length > 0) {
      return res.status(409).json({
        error: 'Cannot delete a book that is currently checked out. Return the book first.'
      });
    }

    const { data: book, error: fetchError } = await supabaseAdmin
      .from('books')
      .select('id, title, cover_image_path, back_cover_image_path, pdf_path')
      .eq('id', req.params.id)
      .single();

    if (fetchError || !book) {
      return res.status(404).json({ error: 'Book not found' });
    }

    const { deleteFromStorage } = await import('../middleware/upload.js');

    await Promise.allSettled([
      deleteFromStorage('book-covers',      book.cover_image_path),
      deleteFromStorage('book-back-covers', book.back_cover_image_path),
      deleteFromStorage('book-pdfs',        book.pdf_path)
    ]);

    const { error: deleteError } = await supabaseAdmin
      .from('books')
      .delete()
      .eq('id', req.params.id);

    if (deleteError) throw deleteError;

    res.status(204).send();
  } catch (err) { next(err); }
});

export default router;
