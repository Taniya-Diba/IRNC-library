import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { ZodError } from 'zod';

process.on('uncaughtException', (err) => {
  console.error('[FATAL] Uncaught exception:', err);
  setTimeout(() => process.exit(1), 1000);
});

process.on('unhandledRejection', (reason) => {
  console.error('[FATAL] Unhandled promise rejection:', reason);
});

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

app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200 });
app.use(limiter);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use('/api/auth',      authRouter);
app.use('/api/books',     booksRouter);
app.use('/api/loans',     loansRouter);
app.use('/api/borrowers', borrowersRouter);
app.use('/api/stats',     statsRouter);
app.use('/api/users',     usersRouter);
app.use('/api/uploads',   uploadsRouter);

app.get('/health', (_, res) => res.json({ status: 'ok' }));

app.use((_, res) => res.status(404).json({ error: 'Not found' }));

// Multer / file-upload errors
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

// Global error handler — must be last middleware
app.use((err, req, res, _next) => {
  console.error(`[ERROR] ${req.method} ${req.path}`, {
    message: err.message,
    stack:   process.env.NODE_ENV === 'development' ? err.stack : undefined,
    status:  err.status || err.statusCode
  });

  if (err instanceof ZodError) {
    const messages = err.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ');
    return res.status(400).json({ error: `Validation error: ${messages}` });
  }

  const status = err.status || err.statusCode || 500;
  const message = process.env.NODE_ENV === 'production' && status === 500
    ? 'An unexpected error occurred. Please try again.'
    : err.message || 'Server error';

  res.status(status).json({ error: message });
});

export default app;

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Library API running on port ${PORT}`);
    startOverdueCron();
  });
}
