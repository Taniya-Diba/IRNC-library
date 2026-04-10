import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { ZodError } from 'zod';

import booksRouter    from './routes/books.js';
import loansRouter    from './routes/loans.js';
import borrowersRouter from './routes/borrowers.js';
import authRouter     from './routes/auth.js';
import statsRouter    from './routes/stats.js';
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
app.use(express.json());

// ── Routes ─────────────────────────────────────────────────
app.use('/api/auth',      authRouter);
app.use('/api/books',     booksRouter);
app.use('/api/loans',     loansRouter);
app.use('/api/borrowers', borrowersRouter);
app.use('/api/stats',     statsRouter);

app.get('/health', (_, res) => res.json({ status: 'ok' }));

// ── 404 ────────────────────────────────────────────────────
app.use((_, res) => res.status(404).json({ error: 'Not found' }));

// ── Error handler ──────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error(err);
  
  // Handle Zod validation errors
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
