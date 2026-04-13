import { Router } from 'express';
import { z } from 'zod';
import supabase from '../db/supabase.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

const CheckoutSchema = z.object({
  book_id:         z.string().uuid('Invalid book ID'),
  borrower_name:   z.string().min(1, 'Name is required').trim(),
  borrower_phone:  z.string().optional(),
  borrower_email:  z.string().email().optional().or(z.literal('')),
  due_date:        z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Due date must be in YYYY-MM-DD format').optional(),
  notes:           z.string().optional(),
});

// GET /api/loans — admin only, all active loans
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { status } = req.query;
    let query = supabase
      .from('loans')
      .select(`*, books(title, author, nfc_tag_id, shelf_location), borrowers(name, phone, email)`)
      .order('checkout_date', { ascending: false });

    if (status) query = query.eq('status', status);

    const { data, error } = await query;
    if (error) throw error;
    res.json(data);
  } catch (err) { next(err); }
});

// GET /api/loans/overdue — admin only
router.get('/overdue', requireAuth, async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('overdue_loans')
      .select('*');
    if (error) throw error;
    res.json(data);
  } catch (err) { next(err); }
});

// GET /api/loans/book/:bookId — loan history for a book (public)
router.get('/book/:bookId', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('loans')
      .select(`*, borrowers(name)`)
      .eq('book_id', req.params.bookId)
      .order('checkout_date', { ascending: false });
    if (error) throw error;
    res.json(data);
  } catch (err) { next(err); }
});

// POST /api/loans — checkout (public — borrower submits form)
router.post('/', async (req, res, next) => {
  try {
    const body = CheckoutSchema.parse(req.body);

    // Check book is available
    const { data: book, error: bookErr } = await supabase
      .from('books')
      .select('id, status, title')
      .eq('id', body.book_id)
      .single();

    if (bookErr || !book) return res.status(404).json({ error: 'Book not found' });
    if (book.status !== 'in') return res.status(409).json({ error: 'Book is not available for checkout' });

    // Find or create borrower by name
    let borrower;
    const { data: existing, error: findErr } = await supabase
      .from('borrowers')
      .select()
      .eq('name', body.borrower_name)
      .maybeSingle();
    if (findErr) throw findErr;

    if (existing) {
      borrower = existing;
    } else {
      const { data: created, error: createErr } = await supabase
        .from('borrowers')
        .insert({ name: body.borrower_name, phone: body.borrower_phone || null, email: body.borrower_email || null })
        .select()
        .single();
      if (createErr) throw createErr;
      borrower = created;
    }

    // Create loan
    const { data: loan, error: lErr } = await supabase
      .from('loans')
      .insert({
        book_id:      body.book_id,
        borrower_id:  borrower.id,
        due_date:     body.due_date || null,
        notes:        body.notes || null,
        status:       'out',
      })
      .select()
      .single();
    if (lErr) throw lErr;

    res.status(201).json({ loan, borrower, book });
  } catch (err) { next(err); }
});

// PATCH /api/loans/:id/return — mark returned (admin)
router.patch('/:id/return', requireAuth, async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('loans')
      .update({ status: 'returned', return_date: new Date().toISOString().slice(0, 10) })
      .eq('id', req.params.id)
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err) { next(err); }
});

export default router;
