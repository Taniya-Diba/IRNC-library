# IRNC Personal Library System

A full-stack personal library management system with NFC support, built with React + Vite (frontend) and Node.js + Express (backend), backed by Supabase (PostgreSQL).

## Features

- 📚 **Catalogue** — Browse 1000+ books with search, filter, and pagination
- 📱 **NFC Checkout** — Tap stickers with any smartphone (no app needed)
- 💾 **Database** — PostgreSQL with automatic status sync and audit trail
- 🔐 **Admin Dashboard** — Manage collection, track loans, flag overdue books
- ⏰ **Auto Overdue** — Daily job at 08:00 flags overdue books and sends emails
- 🚀 **Full API** — RESTful API with JWT auth and comprehensive validation
- 🎨 **Modern UI** — Custom CSS design system, responsive, no frameworks

## Project Structure

```
irnc-library/
├── backend/                 # Node.js + Express API
│   ├── src/
│   │   ├── index.js        # Server entry, middleware setup
│   │   ├── db/supabase.js  # Supabase client
│   │   ├── middleware/auth.js
│   │   ├── routes/         # All API endpoints
│   │   └── services/overdueJob.js
│   ├── package.json
│   └── .env (fill in Supabase credentials)
│
├── frontend/                # React + Vite SPA
│   ├── src/
│   │   ├── App.jsx         # All routes
│   │   ├── lib/api.js      # Centralized API client
│   │   ├── hooks/          # useAuth, useBooks
│   │   ├── pages/          # 8 main pages
│   │   ├── components/     # Layout, UI, Book cards
│   │   └── styles/global.css
│   ├── vite.config.js      # Dev proxy to backend
│   ├── package.json
│   └── .env (fill in API URL)
│
├── database/
│   ├── schema.sql          # Tables, triggers, RLS, views
│   └── seed.sql            # 20 sample books + fixtures
│
└── README.md
```

## Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account (free tier)

### 1. Database Setup

1. Create Supabase project
2. Go to SQL Editor → paste `database/schema.sql` → Run
3. Optionally run `database/seed.sql` for 20 sample books

### 2. Backend

```bash
cd backend
cp .env.example .env

# Fill .env with:
# - Your Supabase URL and service role key
# - A strong JWT_SECRET
# - Admin email/password
# - (Optional) RESEND_API_KEY for email notifications

npm install
npm run dev     # Runs on http://localhost:3001
```

### 3. Frontend

```bash
cd frontend
cp .env.example .env

# Fill .env with:
# - VITE_API_URL=http://localhost:3001
# - Supabase URL and anon key

npm install
npm run dev     # Runs on http://localhost:5173 with proxy to /api
```

### 4. Verify

1. Check http://localhost:3001/health → `{"status":"ok"}`
2. Browse http://localhost:5173 → See catalogue
3. Admin login: http://localhost:5173/admin/login (use creds from .env)

## Environment Variables

### Backend `.env`

```env
PORT=3001
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=eyJh...    # Service role key (NOT anon)
JWT_SECRET=your-long-random-secret-string
ADMIN_EMAIL=you@example.com
ADMIN_PASSWORD=your-admin-password
RESEND_API_KEY=re_xxxx          # Optional: for email notifications
FRONTEND_URL=http://localhost:5173
```

### Frontend `.env`

```env
VITE_API_URL=http://localhost:3001
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJh...  # Anon/public key (safe in frontend)
```

## Architecture

### Database (PostgreSQL)

- **books** — Catalogue with NFC tag IDs, status synced via trigger
- **borrowers** — Name, phone, email (upserted on checkout)
- **loans** — Checkout/return tracking with status (out/returned/overdue)
- **loan_history** — Append-only audit log with snapshots
- **Trigger** — Syncs `books.status` when loan status changes
- **RLS** — Public read on books; auth-only on other tables

### Backend (Express)

- All requests validated with Zod
- JWT auth (7-day expiry) for admin routes
- Rate limiting (200 req/15 min)
- Helmet.js for security headers
- CORS restricted to `FRONTEND_URL`
- node-cron job: Daily 08:00 check for overdue, send emails

### Frontend (React + Vite)

- React Router for SPA routing
- React Context for auth state + localStorage
- Centralized API client in `lib/api.js`
- Custom CSS with design tokens (no Tailwind/Bootstrap)
- react-hot-toast for notifications

## API Routes

### Public

- `GET /health` — Server status
- `GET /api/books` — List books with search/filter/pagination
- `GET /api/books/nfc/:nfcId` — Lookup by NFC tag (used by tap)
- `GET /api/books/:id` — Single book detail
- `GET /api/loans/book/:bookId` — Loan history
- `POST /api/auth/login` — Admin authentication
- `POST /api/loans` — Checkout form (public)

### Protected (Bearer token required)

- `POST /api/auth/verify` — Verify token validity
- `POST /api/books` — Create book
- `PATCH /api/books/:id` — Update book
- `DELETE /api/books/:id` — Delete book
- `GET /api/loans` — All loans
- `GET /api/loans/overdue` — Overdue only
- `PATCH /api/loans/:id/return` — Mark returned
- `GET /api/borrowers` — All borrowers
- `DELETE /api/borrowers/:id` — Delete borrower
- `GET /api/stats` — Dashboard stats

## Frontend Pages

| Path                 | Component      | Access    | Purpose                          |
| -------------------- | -------------- | --------- | -------------------------------- |
| `/`                  | CataloguePage  | Public    | Browse all books, search, filter |
| `/book?nfc=LIB-XXXX` | BookPage       | Public    | Book detail (NFC tap link)       |
| `/book/:id`          | BookPage       | Public    | Book detail by UUID              |
| `/checkout`          | CheckoutPage   | Public    | Checkout form                    |
| `/admin/login`       | AdminLogin     | Public    | Admin auth                       |
| `/admin`             | AdminDashboard | Protected | Stats, overdue books             |
| `/admin/books`       | AdminBooks     | Protected | Book CRUD, search                |
| `/admin/loans`       | AdminLoans     | Protected | Loan history, return books       |

## NFC Sticker Setup

Each physical book gets an NFC sticker (NTAG213, ~$0.20):

1. Add book to library (admin panel)
2. Open **NFC Tools** app (iOS/Android)
3. Write URL: `https://library.irnc.net/book?nfc=LIB-0001`
4. Tap → hold phone flat to sticker (~0.5 sec)
5. Stick on back cover

That's it! When borrower taps: browser opens → shows book details + checkout form.

## Deployment

### Frontend → Vercel

1. Connect GitHub repo to Vercel
2. Set environment variables:
   - `VITE_API_URL=https://api.example.com` (your backend URL)
   - etc.
3. Deploy

### Backend → Railway / Render / Fly.io

1. Create project, connect GitHub
2. Set environment variables (same as local .env)
3. Set start command: `node src/index.js`
4. Deploy

### Database → Supabase (already set up)

- Free tier handles 1000+ books easily
- Backups included

### DNS

Add to your DNS provider (e.g., WordPress host):

```
library  CNAME  cname.vercel-dns.com  (or your platform's DNS target)
```

## Development

**Terminal 1** — Backend:

```bash
cd backend && npm run dev
```

**Terminal 2** — Frontend:

```bash
cd frontend && npm run dev
```

**Test endpoints**:

```bash
curl http://localhost:3001/health
curl http://localhost:5173        # React app
```

## Troubleshooting

### Frontend won't connect to backend

- Check `VITE_API_URL` in `frontend/.env`
- Ensure backend is running on port 3001
- Check browser console for CORS errors

### Database errors

- Run `database/schema.sql` first
- Check Supabase URL and service role key in `.env`
- Verify RLS policies (should be auto-created by schema)

### Auth not working

- Verify JWT_SECRET matches in `.env`
- Check token expiry (7 days)
- Clear localStorage and re-login

### Overdue emails not sending

- Set `RESEND_API_KEY` in backend `.env`
- Job runs daily at 08:00 UTC
- Check backend logs for errors

## License

Project for IRNC. All rights reserved.
