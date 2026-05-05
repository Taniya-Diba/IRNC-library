import { Router } from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import {
  uploadImage,
  uploadPdf,
  uploadToStorage,
  deleteFromStorage,
  getSignedUrl
} from '../middleware/upload.js';
import { supabaseAdmin } from '../db/supabase.js';

const router = Router();

// POST /api/uploads/cover/:bookId — admin only
router.post('/cover/:bookId',
  requireAuth, requireAdmin,
  uploadImage.single('cover_image'),
  async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No image file provided' });
      }

      const { bookId } = req.params;

      const { data: book, error: bookError } = await supabaseAdmin
        .from('books')
        .select('id, cover_image_path')
        .eq('id', bookId)
        .single();

      if (bookError || !book) {
        return res.status(404).json({ error: 'Book not found' });
      }

      if (book.cover_image_path) {
        await deleteFromStorage('book-covers', book.cover_image_path);
      }

      const { path, publicUrl } = await uploadToStorage({
        buffer:       req.file.buffer,
        mimetype:     req.file.mimetype,
        originalName: req.file.originalname,
        bucket:       'book-covers',
        bookId
      });

      const { error: updateError } = await supabaseAdmin
        .from('books')
        .update({ cover_image_path: path })
        .eq('id', bookId);

      if (updateError) throw updateError;

      res.json({
        cover_image_path: path,
        cover_image_url:  publicUrl
      });
    } catch (err) { next(err); }
  }
);

// POST /api/uploads/back-cover/:bookId — admin only
router.post('/back-cover/:bookId',
  requireAuth, requireAdmin,
  uploadImage.single('back_cover_image'),
  async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No image file provided' });
      }

      const { bookId } = req.params;

      const { data: book, error: bookError } = await supabaseAdmin
        .from('books')
        .select('id, back_cover_image_path')
        .eq('id', bookId)
        .single();

      if (bookError || !book) {
        return res.status(404).json({ error: 'Book not found' });
      }

      if (book.back_cover_image_path) {
        await deleteFromStorage('book-back-covers', book.back_cover_image_path);
      }

      const { path, publicUrl } = await uploadToStorage({
        buffer:       req.file.buffer,
        mimetype:     req.file.mimetype,
        originalName: req.file.originalname,
        bucket:       'book-back-covers',
        bookId
      });

      const { error: updateError } = await supabaseAdmin
        .from('books')
        .update({ back_cover_image_path: path })
        .eq('id', bookId);

      if (updateError) throw updateError;

      res.json({
        back_cover_image_path: path,
        back_cover_image_url:  publicUrl
      });
    } catch (err) { next(err); }
  }
);

// POST /api/uploads/pdf/:bookId — admin only
router.post('/pdf/:bookId',
  requireAuth, requireAdmin,
  uploadPdf.single('pdf'),
  async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No PDF file provided' });
      }

      const { bookId } = req.params;

      const { data: book, error: bookError } = await supabaseAdmin
        .from('books')
        .select('id, pdf_path')
        .eq('id', bookId)
        .single();

      if (bookError || !book) {
        return res.status(404).json({ error: 'Book not found' });
      }

      if (book.pdf_path) {
        await deleteFromStorage('book-pdfs', book.pdf_path);
      }

      const { path } = await uploadToStorage({
        buffer:       req.file.buffer,
        mimetype:     req.file.mimetype,
        originalName: req.file.originalname,
        bucket:       'book-pdfs',
        bookId
      });

      const { error: updateError } = await supabaseAdmin
        .from('books')
        .update({ pdf_path: path })
        .eq('id', bookId);

      if (updateError) throw updateError;

      res.json({ pdf_path: path });
    } catch (err) { next(err); }
  }
);

// GET /api/uploads/pdf/:bookId/url — auth required (members + admin)
router.get('/pdf/:bookId/url',
  requireAuth,
  async (req, res, next) => {
    try {
      const { bookId } = req.params;

      const { data: book, error: bookError } = await supabaseAdmin
        .from('books')
        .select('id, title, pdf_path')
        .eq('id', bookId)
        .single();

      if (bookError || !book) {
        return res.status(404).json({ error: 'Book not found' });
      }

      if (!book.pdf_path) {
        return res.status(404).json({ error: 'This book has no PDF available' });
      }

      const signedUrl = await getSignedUrl('book-pdfs', book.pdf_path, 3600);

      if (!signedUrl) {
        return res.status(500).json({ error: 'Could not generate download URL' });
      }

      res.json({
        url:        signedUrl,
        expires_in: 3600,
        title:      book.title
      });
    } catch (err) { next(err); }
  }
);

// DELETE /api/uploads/cover/:bookId — admin only
router.delete('/cover/:bookId',
  requireAuth, requireAdmin,
  async (req, res, next) => {
    try {
      const { data: book } = await supabaseAdmin
        .from('books')
        .select('cover_image_path')
        .eq('id', req.params.bookId)
        .single();

      if (book?.cover_image_path) {
        await deleteFromStorage('book-covers', book.cover_image_path);
        await supabaseAdmin
          .from('books')
          .update({ cover_image_path: null })
          .eq('id', req.params.bookId);
      }
      res.status(204).send();
    } catch (err) { next(err); }
  }
);

// DELETE /api/uploads/back-cover/:bookId — admin only
router.delete('/back-cover/:bookId',
  requireAuth, requireAdmin,
  async (req, res, next) => {
    try {
      const { data: book } = await supabaseAdmin
        .from('books')
        .select('back_cover_image_path')
        .eq('id', req.params.bookId)
        .single();

      if (book?.back_cover_image_path) {
        await deleteFromStorage('book-back-covers', book.back_cover_image_path);
        await supabaseAdmin
          .from('books')
          .update({ back_cover_image_path: null })
          .eq('id', req.params.bookId);
      }
      res.status(204).send();
    } catch (err) { next(err); }
  }
);

// DELETE /api/uploads/pdf/:bookId — admin only
router.delete('/pdf/:bookId',
  requireAuth, requireAdmin,
  async (req, res, next) => {
    try {
      const { data: book } = await supabaseAdmin
        .from('books')
        .select('pdf_path')
        .eq('id', req.params.bookId)
        .single();

      if (book?.pdf_path) {
        await deleteFromStorage('book-pdfs', book.pdf_path);
        await supabaseAdmin
          .from('books')
          .update({ pdf_path: null })
          .eq('id', req.params.bookId);
      }
      res.status(204).send();
    } catch (err) { next(err); }
  }
);

export default router;
