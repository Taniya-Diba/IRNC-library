import { supabaseAdmin, supabaseClient } from '../db/supabase.js';

// requireAuth — verifies Supabase session token, attaches user to req
export async function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  const token = header.slice(7);

  try {
    const { data: { user: authUser }, error: authError } =
      await supabaseClient.auth.getUser(token);

    if (authError || !authUser) {
      const isExpired = authError?.message?.toLowerCase().includes('expired') ||
                        authError?.status === 401;
      console.warn(`[Auth] ${isExpired ? 'Expired' : 'Invalid'} token from ${req.ip}`);
      return res.status(401).json({
        error: isExpired ? 'Token expired' : 'Invalid token',
        code:  isExpired ? 'TOKEN_EXPIRED' : 'TOKEN_INVALID'
      });
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('id, full_name, email, role, membership_id, phone, is_active')
      .eq('auth_id', authUser.id)
      .single();

    if (profileError || !profile) {
      return res.status(401).json({ error: 'User profile not found' });
    }

    if (!profile.is_active) {
      return res.status(403).json({ error: 'Account has been disabled' });
    }

    req.user = { ...profile, auth_id: authUser.id };
    next();
  } catch (err) {
    next(err);
  }
}

// requireAdmin — use AFTER requireAuth, checks role === 'admin'
export function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

// optionalAuth — attaches user if token present, continues if not
export async function optionalAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    req.user = null;
    return next();
  }
  try {
    const token = header.slice(7);
    const { data: { user: authUser } } =
      await supabaseClient.auth.getUser(token);
    if (authUser) {
      const { data: profile } = await supabaseAdmin
        .from('users')
        .select('id, full_name, email, role, membership_id, is_active')
        .eq('auth_id', authUser.id)
        .single();
      req.user = profile?.is_active ? { ...profile, auth_id: authUser.id } : null;
    } else {
      req.user = null;
    }
  } catch {
    req.user = null;
  }
  next();
}
