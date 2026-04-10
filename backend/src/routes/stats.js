import { Router } from 'express';
import supabase from '../db/supabase.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const [books, loansOut, overdue, borrowers] = await Promise.all([
      supabase.from('books').select('id', { count: 'exact', head: true }),
      supabase.from('loans').select('id', { count: 'exact', head: true }).eq('status', 'out'),
      supabase.from('overdue_loans').select('*'),
      supabase.from('borrowers').select('id', { count: 'exact', head: true }),
    ]);

    const genreData = await supabase
      .from('books')
      .select('genre')
      .not('genre', 'is', null);

    const genreCounts = {};
    (genreData.data || []).forEach(b => {
      genreCounts[b.genre] = (genreCounts[b.genre] || 0) + 1;
    });

    res.json({
      total_books:     books.count     || 0,
      books_out:       loansOut.count  || 0,
      books_in:        (books.count || 0) - (loansOut.count || 0),
      overdue_count:   overdue.data?.length || 0,
      total_borrowers: borrowers.count || 0,
      overdue_loans:   overdue.data || [],
      genre_breakdown: genreCounts,
    });
  } catch (err) { next(err); }
});

export default router;
