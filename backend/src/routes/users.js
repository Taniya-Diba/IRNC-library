import { Router } from 'express';
import { supabaseAdmin } from '../db/supabase.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = Router();

// GET /api/users — admin only, list all members
router.get('/', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { search, role, is_active } = req.query;

    let query = supabaseAdmin
      .from('users')
      .select('id, full_name, email, phone, membership_id, role, is_active, created_at',
              { count: 'exact' })
      .order('created_at', { ascending: false });

    if (search) {
      query = query.or(
        `full_name.ilike.%${search}%,email.ilike.%${search}%,membership_id.ilike.%${search}%`
      );
    }
    if (role)              query = query.eq('role', role);
    if (is_active !== undefined) query = query.eq('is_active', is_active === 'true');

    const { data, error, count } = await query;
    if (error) throw error;
    res.json({ data, total: count });
  } catch (err) { next(err); }
});

// GET /api/users/:id — admin only, single user profile
router.get('/:id', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('id, full_name, email, phone, membership_id, role, is_active, created_at')
      .eq('id', req.params.id)
      .single();
    if (error) return res.status(404).json({ error: 'User not found' });
    res.json(data);
  } catch (err) { next(err); }
});

// GET /api/users/:id/loans — admin or own user
router.get('/:id/loans', requireAuth, async (req, res, next) => {
  try {
    if (req.user.role !== 'admin' && req.user.id !== req.params.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { data, error } = await supabaseAdmin
      .from('loans')
      .select(`
        *,
        book:books(id, title, author, nfc_tag_id, cover_image_path, shelf_location)
      `)
      .eq('user_id', req.params.id)
      .order('checkout_date', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (err) { next(err); }
});

// PATCH /api/users/:id/deactivate — admin only
router.patch('/:id/deactivate', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { data: activeLoans } = await supabaseAdmin
      .from('loans')
      .select('id')
      .eq('user_id', req.params.id)
      .in('status', ['out', 'overdue']);

    if (activeLoans?.length > 0) {
      return res.status(409).json({
        error: 'Cannot deactivate user with active loans. Resolve loans first.'
      });
    }

    const { data, error } = await supabaseAdmin
      .from('users')
      .update({ is_active: false })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) { next(err); }
});

// PATCH /api/users/:id/activate — admin only
router.patch('/:id/activate', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('users')
      .update({ is_active: true })
      .eq('id', req.params.id)
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err) { next(err); }
});

export default router;
