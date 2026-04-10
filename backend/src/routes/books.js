import { Router } from 'express';
import { z } from 'zod';
import supabase from '../db/supabase.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

const BookSchema = z.object({
  nfc_tag_id:     z.string().min(1, 'NFC Tag ID is required'),
  title:          z.string().min(1, 'Title is required').trim(),
  author:         z.string().min(1, 'Author is required').trim(),
  isbn:           z.string().trim().optional().or(z.literal('')),
  genre:          z.string().optional(),
  shelf_location: z.string().trim().optional(),
  cover_url:      z.string().url('Invalid cover image URL').optional().or(z.literal('')),
  notes:          z.string().trim().optional(),
});

// GET /api/books — public catalogue
router.get('/', async (req, res, next) => {
  try {
    const { search, genre, status, page = 1, limit = 50 } = req.query;
    const from = (page - 1) * limit;
    const to   = from + Number(limit) - 1;

    let query = supabase
      .from('books')
      .select('*', { count: 'exact' })
      .range(from, to)
      .order('title');

    if (search) query = query.or(`title.ilike.%${search}%,author.ilike.%${search}%`);
    if (genre)  query = query.eq('genre', genre);
    if (status) query = query.eq('status', status);

    const { data, error, count } = await query;
    if (error) throw error;
    res.json({ data, total: count, page: Number(page), limit: Number(limit) });
  } catch (err) { next(err); }
});

// GET /api/books/nfc/:nfcId — lookup by NFC tag (used by phone tap)
router.get('/nfc/:nfcId', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('books')
      .select('*')
      .eq('nfc_tag_id', req.params.nfcId)
      .single();
    if (error) return res.status(404).json({ error: 'Book not found' });
    res.json(data);
  } catch (err) { next(err); }
});

// GET /api/books/:id
router.get('/:id', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('books')
      .select('*')
      .eq('id', req.params.id)
      .single();
    if (error) return res.status(404).json({ error: 'Book not found' });
    res.json(data);
  } catch (err) { next(err); }
});

// POST /api/books — admin only
router.post('/', requireAuth, async (req, res, next) => {
  try {
    const body = BookSchema.parse(req.body);
    const { data, error } = await supabase
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
router.patch('/:id', requireAuth, async (req, res, next) => {
  try {
    const body = BookSchema.partial().parse(req.body);
    const { data, error } = await supabase
      .from('books')
      .update(body)
      .eq('id', req.params.id)
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err) { next(err); }
});

// DELETE /api/books/:id — admin only
router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const { error } = await supabase
      .from('books')
      .delete()
      .eq('id', req.params.id);
    if (error) throw error;
    res.status(204).send();
  } catch (err) { next(err); }
});

export default router;
