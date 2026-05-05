import { Router } from 'express';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import { supabaseAdmin, supabaseClient } from '../db/supabase.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

const RegisterSchema = z.object({
  full_name:     z.string().min(2).max(100).trim(),
  email:         z.string().email().toLowerCase().trim(),
  password:      z.string().min(8).max(72),
  phone:         z.string().min(7).max(20).trim(),
  membership_id: z.string().min(4).max(20).trim()
                  .regex(/^[A-Za-z0-9\-_]+$/,
                    'Membership ID must contain only letters, numbers, hyphens, or underscores')
});

const LoginSchema = z.object({
  email:    z.string().email().toLowerCase().trim(),
  password: z.string().min(1)
});

const RefreshSchema = z.object({
  refresh_token: z.string().min(1)
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many login attempts. Please wait 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { error: 'Too many registration attempts. Please wait an hour.' }
});

// POST /api/auth/register
router.post('/register', registerLimiter, async (req, res, next) => {
  try {
    const body = RegisterSchema.parse(req.body);

    const { data: existingMembership } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('membership_id', body.membership_id)
      .maybeSingle();

    if (existingMembership) {
      return res.status(409).json({
        error: 'This IRNC Membership ID is already registered'
      });
    }

    const { data: existingEmail } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', body.email)
      .maybeSingle();

    if (existingEmail) {
      return res.status(409).json({
        error: 'An account with this email already exists'
      });
    }

    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email:         body.email,
        password:      body.password,
        email_confirm: true
      });

    if (authError) {
      if (authError.message?.includes('already registered')) {
        return res.status(409).json({ error: 'Email already in use' });
      }
      throw authError;
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('users')
      .insert({
        auth_id:       authData.user.id,
        full_name:     body.full_name,
        email:         body.email,
        phone:         body.phone,
        membership_id: body.membership_id,
        role:          'member'
      })
      .select()
      .single();

    if (profileError) {
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      throw profileError;
    }

    const { data: signInData, error: signInError } =
      await supabaseClient.auth.signInWithPassword({
        email:    body.email,
        password: body.password
      });

    if (signInError) {
      return res.status(201).json({
        message: 'Registration successful. Please log in.',
        user: {
          id:            profile.id,
          full_name:     profile.full_name,
          email:         profile.email,
          membership_id: profile.membership_id,
          role:          profile.role
        }
      });
    }

    res.status(201).json({
      access_token:  signInData.session.access_token,
      refresh_token: signInData.session.refresh_token,
      expires_in:    signInData.session.expires_in,
      user: {
        id:            profile.id,
        full_name:     profile.full_name,
        email:         profile.email,
        membership_id: profile.membership_id,
        role:          profile.role
      }
    });

  } catch (err) {
    if (err.name === 'ZodError') {
      return res.status(400).json({
        error: 'Validation failed',
        details: err.errors.map(e => ({ field: e.path.join('.'), message: e.message }))
      });
    }
    next(err);
  }
});

// POST /api/auth/login
router.post('/login', loginLimiter, async (req, res, next) => {
  try {
    const body = LoginSchema.parse(req.body);

    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email:    body.email,
      password: body.password
    });

    if (error) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('id, full_name, email, role, membership_id, phone, is_active')
      .eq('auth_id', data.user.id)
      .single();

    if (profileError || !profile) {
      return res.status(401).json({ error: 'User profile not found' });
    }

    if (!profile.is_active) {
      return res.status(403).json({ error: 'Account has been disabled. Contact the administrator.' });
    }

    res.json({
      access_token:  data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_in:    data.session.expires_in,
      user: {
        id:            profile.id,
        full_name:     profile.full_name,
        email:         profile.email,
        membership_id: profile.membership_id,
        role:          profile.role,
        phone:         profile.phone
      }
    });

  } catch (err) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ error: 'Invalid input', details: err.errors });
    }
    next(err);
  }
});

// POST /api/auth/logout
router.post('/logout', requireAuth, async (req, res) => {
  try {
    await supabaseAdmin.auth.admin.signOut(req.user.auth_id);
    res.json({ message: 'Logged out successfully' });
  } catch (err) {
    // Don't fail logout — client should clear token regardless
    res.json({ message: 'Logged out' });
  }
});

// POST /api/auth/refresh
router.post('/refresh', async (req, res, next) => {
  try {
    const { refresh_token } = RefreshSchema.parse(req.body);

    const { data, error } = await supabaseClient.auth.refreshSession({
      refresh_token
    });

    if (error || !data.session) {
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }

    res.json({
      access_token:  data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_in:    data.session.expires_in
    });
  } catch (err) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ error: 'refresh_token is required' });
    }
    next(err);
  }
});

// GET /api/auth/me
router.get('/me', requireAuth, async (req, res) => {
  res.json({
    id:            req.user.id,
    full_name:     req.user.full_name,
    email:         req.user.email,
    membership_id: req.user.membership_id,
    role:          req.user.role,
    phone:         req.user.phone
  });
});

// POST /api/auth/verify — checks if token is still valid
router.post('/verify', requireAuth, async (req, res) => {
  res.json({
    valid: true,
    user: {
      id:            req.user.id,
      full_name:     req.user.full_name,
      email:         req.user.email,
      membership_id: req.user.membership_id,
      role:          req.user.role
    }
  });
});

export default router;
