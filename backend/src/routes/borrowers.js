import { Router } from 'express';
import supabase from '../db/supabase.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// All borrower routes are admin-only
router.use(requireAuth);

router.get('/', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('borrowers')
      .select('*')
      .order('name');
    if (error) throw error;
    res.json(data);
  } catch (err) { next(err); }
});

router.get('/:id/loans', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('loans')
      .select('*, books(title, author, nfc_tag_id)')
      .eq('borrower_id', req.params.id)
      .order('checkout_date', { ascending: false });
    if (error) throw error;
    res.json(data);
  } catch (err) { next(err); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const { error } = await supabase
      .from('borrowers')
      .delete()
      .eq('id', req.params.id);
    if (error) throw error;
    res.status(204).send();
  } catch (err) { next(err); }
});

export default router;
