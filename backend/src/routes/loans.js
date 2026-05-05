import { Router } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../db/supabase.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = Router();

// GET /api/loans — admin only, all loans
router.get('/', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { status } = req.query;
    let query = supabaseAdmin
      .from('loans')
      .select(`
        *,
        books(id, title, author, nfc_tag_id, shelf_location, category),
        users(id, full_name, email, phone, membership_id)
      `)
      .order('checkout_date', { ascending: false });

    if (status) query = query.eq('status', status);

    const { data, error } = await query;
    if (error) throw error;
    res.json(data);
  } catch (err) { next(err); }
});

// GET /api/loans/overdue — admin only
router.get('/overdue', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('overdue_loans')
      .select('*');
    if (error) throw error;
    res.json(data);
  } catch (err) { next(err); }
});

// GET /api/loans/book/:bookId — loan history for a book (public)
router.get('/book/:bookId', async (req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('loans')
      .select(`
        *,
        users(id, full_name, membership_id)
      `)
      .eq('book_id', req.params.bookId)
      .order('checkout_date', { ascending: false });
    if (error) throw error;
    res.json(data);
  } catch (err) { next(err); }
});

// POST /api/loans — checkout (requires auth)
router.post('/', requireAuth, async (req, res, next) => {
  try {
    const CheckoutSchema = z.object({
      book_id:  z.string().uuid(),
      due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      notes:    z.string().max(500).optional()
    });

    const body = CheckoutSchema.parse(req.body);
    const userId = req.user.id;

    // Validate due date is not in the past
    if (body.due_date) {
      const due = new Date(body.due_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (due < today) {
        return res.status(400).json({ error: 'Due date must be today or in the future' });
      }

      const maxDate = new Date();
      maxDate.setDate(maxDate.getDate() + 90);
      if (due > maxDate) {
        return res.status(400).json({ error: 'Loan period cannot exceed 90 days' });
      }
    }

    // Check book exists and is available
    const { data: book, error: bookError } = await supabaseAdmin
      .from('books')
      .select('id, title, status')
      .eq('id', body.book_id)
      .single();

    if (bookError || !book) {
      return res.status(404).json({ error: 'Book not found' });
    }

    if (book.status === 'out') {
      return res.status(409).json({ error: 'This book is already checked out' });
    }
    if (book.status === 'overdue') {
      return res.status(409).json({ error: 'This book is already checked out (overdue)' });
    }
    if (book.status === 'locked') {
      return res.status(403).json({
        error: 'This book is restricted to in-library reading only and cannot be borrowed'
      });
    }

    // Check if this user already has an active loan for this book
    const { data: existingLoan } = await supabaseAdmin
      .from('loans')
      .select('id')
      .eq('book_id', body.book_id)
      .eq('user_id', userId)
      .in('status', ['out', 'overdue'])
      .maybeSingle();

    if (existingLoan) {
      return res.status(409).json({ error: 'You already have this book checked out' });
    }

    // Enforce maximum 5 active loans per user
    const { count } = await supabaseAdmin
      .from('loans')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .in('status', ['out', 'overdue']);

    if (count >= 5) {
      return res.status(409).json({
        error: 'You have reached the maximum of 5 borrowed books at once'
      });
    }

    // Create the loan
    const { data: loan, error: loanError } = await supabaseAdmin
      .from('loans')
      .insert({
        book_id:  body.book_id,
        user_id:  userId,
        due_date: body.due_date || null,
        notes:    body.notes || null,
        status:   'out'
      })
      .select(`
        *,
        books(id, title, author, nfc_tag_id, shelf_location),
        users(id, full_name, email, membership_id)
      `)
      .single();

    if (loanError) throw loanError;

    res.status(201).json(loan);
  } catch (err) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ error: 'Invalid input', details: err.errors });
    }
    next(err);
  }
});

// PATCH /api/loans/:id/return — members can return their own; admin can return any
router.patch('/:id/return', requireAuth, async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      const { data: loanCheck } = await supabaseAdmin
        .from('loans')
        .select('user_id')
        .eq('id', req.params.id)
        .single();
      if (loanCheck?.user_id !== req.user.id) {
        return res.status(403).json({ error: 'You can only return your own loans' });
      }
    }

    const { data, error } = await supabaseAdmin
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
