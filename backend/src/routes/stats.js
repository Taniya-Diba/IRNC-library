import { Router } from 'express';
import { supabaseAdmin } from '../db/supabase.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = Router();

router.get('/', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const [totalBooks, booksOut, booksAvailable, booksOverdue, booksLocked, totalMembers, overdue] =
      await Promise.all([
        supabaseAdmin.from('books').select('id', { count: 'exact', head: true }),
        supabaseAdmin.from('books').select('id', { count: 'exact', head: true }).eq('status', 'out'),
        supabaseAdmin.from('books').select('id', { count: 'exact', head: true }).eq('status', 'available'),
        supabaseAdmin.from('books').select('id', { count: 'exact', head: true }).eq('status', 'overdue'),
        supabaseAdmin.from('books').select('id', { count: 'exact', head: true }).eq('status', 'locked'),
        supabaseAdmin.from('users').select('id', { count: 'exact', head: true }).eq('role', 'member').eq('is_active', true),
        supabaseAdmin.from('overdue_loans').select('*'),
      ]);

    const catData = await supabaseAdmin
      .from('books')
      .select('category')
      .not('category', 'is', null);

    const categoryBreakdown = {};
    (catData.data || []).forEach(b => {
      categoryBreakdown[b.category] = (categoryBreakdown[b.category] || 0) + 1;
    });

    res.json({
      total_books:        totalBooks.count    || 0,
      books_out:          booksOut.count      || 0,
      books_available:    booksAvailable.count || 0,
      books_overdue:      booksOverdue.count  || 0,
      books_locked:       booksLocked.count   || 0,
      total_members:      totalMembers.count  || 0,
      overdue_count:      overdue.data?.length || 0,
      overdue_loans:      overdue.data || [],
      category_breakdown: categoryBreakdown,
    });
  } catch (err) { next(err); }
});

export default router;
