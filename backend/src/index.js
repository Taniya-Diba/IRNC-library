import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { ZodError } from 'zod';

import booksRouter     from './routes/books.js';
import loansRouter     from './routes/loans.js';
import borrowersRouter from './routes/borrowers.js';
import authRouter      from './routes/auth.js';
import statsRouter     from './routes/stats.js';
import usersRouter     from './routes/users.js';
import uploadsRouter   from './routes/uploads.js';
import { startOverdueCron } from './services/overdueJob.js';

const app  = express();
const PORT = process.env.PORT || 3001;

// ── Security ──────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));

// ── Rate limiting ──────────────────────────────────────────
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200 });
app.use(limiter);

// ── Body parsing ───────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── Routes ─────────────────────────────────────────────────
app.use('/api/auth',      authRouter);
app.use('/api/books',     booksRouter);
app.use('/api/loans',     loansRouter);
app.use('/api/borrowers', borrowersRouter);
app.use('/api/stats',     statsRouter);
app.use('/api/users',     usersRouter);
app.use('/api/uploads',   uploadsRouter);

app.get('/health', (_, res) => res.json({ status: 'ok' }));

// ── 404 ────────────────────────────────────────────────────
app.use((_, res) => res.status(404).json({ error: 'Not found' }));

// ── Multer error handler ───────────────────────────────────
app.use((err, req, res, next) => {
  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        error: 'File too large. Images max 5MB, PDFs max 50MB.'
      });
    }
    return res.status(400).json({ error: `Upload error: ${err.message}` });
  }
  if (err.message?.includes('Only') || err.message?.includes('not allowed')) {
    return res.status(415).json({ error: err.message });
  }
  next(err);
});

// ── Generic error handler ─────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error(err);

  if (err instanceof ZodError) {
    const messages = err.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ');
    return res.status(400).json({ error: `Validation error: ${messages}` });
  }

  res.status(err.status || 500).json({ error: err.message || 'Server error' });
});

app.listen(PORT, () => {
  console.log(`Library API running on port ${PORT}`);
  startOverdueCron();
});
