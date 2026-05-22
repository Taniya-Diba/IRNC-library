# IRNC Library Management System

A full-stack library management system for a physical book collection. Members scan a QR code on the back cover of any book with their phone, confirm the checkout in a browser, and return it when they're done — no app download required. Admins manage the full collection, members, loans, and QR stickers through a bilingual (English / Persian) dashboard. The system holds 1000+ books and sends automated overdue email reminders daily.

## Live URL

Will be live soon!

## Tech Stack

| Layer     | Technology                                                   | Hosting  |
| --------- | ------------------------------------------------------------ | -------- |
| Frontend  | React 18 + Vite 5                                            | Vercel   |
| Backend   | Node.js + Express 4                                          | Railway  |
| Database  | PostgreSQL via Supabase                                      | Supabase |
| Auth      | Supabase Auth                                                | Supabase |
| Storage   | Supabase Storage                                             | Supabase |
| Email     | Resend (member/admin emails), Supabase Auth (password reset) | —        |
| Scheduler | node-cron (daily overdue job)                                | Railway  |

## Features

**Member features**

- Browse and search the full catalogue by title, author, or category
- View book details, cover images, and loan history
- Scan a QR code on the book's back cover to open the checkout page
- Check out up to 5 books at once (max 90-day loan period)
- Download PDFs (where available) for borrowed books
- View active loans and full loan history from the profile page
- Self-service account registration using IRNC Membership ID
- Password reset via email link

**Admin features**

- Dashboard with live stats: total books, checked out, overdue, locked, active members
- Category breakdown chart and overdue books list
- Full book management: add, edit, delete, lock/unlock, upload cover/back cover/PDF
- Loan management: view all loans by status, mark any book as returned
- Member management: search, view loan history, activate/deactivate accounts
- QR code generator: bulk-generate and print QR codes for all books

**System features**

- Bilingual UI: English and Persian (Farsi) with full RTL layout for Persian
- Liquid-glass design system with category-specific gradient colors for book cards
- Automated daily overdue job: flags loans, emails admin digest, emails each borrower
- Supabase JWT auth with automatic token refresh
- Row-level security on all database tables
- Rate limiting, Helmet security headers, Zod request validation

---

## Project Structure

```
irnc-library/
├── backend/
│   ├── src/
│   │   ├── index.js               # Server entry, middleware, route registration
│   │   ├── db/
│   │   │   └── supabase.js        # supabaseAdmin + supabaseClient exports
│   │   ├── middleware/
│   │   │   ├── auth.js            # requireAuth, requireAdmin, optionalAuth
│   │   │   └── upload.js          # multer config, uploadToStorage, getSignedUrl
│   │   ├── routes/
│   │   │   ├── auth.js
│   │   │   ├── books.js
│   │   │   ├── loans.js
│   │   │   ├── users.js
│   │   │   ├── uploads.js
│   │   │   └── stats.js
│   │   ├── services/
│   │   │   ├── emailService.js    # Welcome, overdue admin digest, borrower reminder
│   │   │   └── overdueJob.js      # node-cron daily 08:00 overdue check
│   │   └── tests/
│   ├── .env.example
│   ├── package.json
│   └── vitest.config.js
├── frontend/
│   ├── src/
│   │   ├── App.jsx                # Route definitions
│   │   ├── main.jsx
│   │   ├── components/
│   │   │   ├── book/              # BookCard
│   │   │   ├── layout/            # Navbar, Footer, AdminShell, AdminSidebar
│   │   │   └── ui/                # Modal, SearchBar, FileUpload, StatCard, ErrorBoundary
│   │   ├── hooks/
│   │   │   ├── useAuth.jsx        # AuthProvider, AuthContext, token refresh logic
│   │   │   └── useBooks.js
│   │   ├── lib/
│   │   │   ├── api.js             # Centralized API client
│   │   │   ├── categoryColors.js  # Category → gradient mapping
│   │   │   └── i18n.js            # i18next setup, RTL switching
│   │   ├── locales/
│   │   │   ├── en.json
│   │   │   └── fa.json
│   │   ├── pages/                 # 15 page components
│   │   └── styles/
│   │       └── global.css         # Design tokens, glass utilities, badges
│   ├── .env.example
│   ├── package.json
│   └── vite.config.js
├── database/
│   ├── schema.sql                 # Tables, trigger, views, RLS policies
│   ├── seed.js                    # 10 sample books + 4 members + 4 loans
│   └── seed_v2.sql
└── README.md
```

---

## Prerequisites

- Node.js 18 or higher
- npm
- A Supabase project (free tier is sufficient)
- A Resend account (free tier, for email notifications)

---

## Getting Started

### 1. Clone the repository

```bash
git clone <repository-url>
cd irnc-library
```

### 2. Set up the database

1. Create a new project at [supabase.com](https://supabase.com).
2. Go to **SQL Editor** and run the entire contents of `database/schema.sql`.
   This creates the four tables, indexes, trigger, two views, and all RLS policies.
3. Note your **Project URL**, **Service Role Key**, and **Anon Public Key** from
   **Project Settings → API**.

### 3. Create Supabase Storage buckets

Go to **Storage → New bucket** and create the following three buckets:

| Bucket name        | Public            |
| ------------------ | ----------------- |
| `book-covers`      | Yes (toggle on)   |
| `book-back-covers` | Yes (toggle on)   |
| `book-pdfs`        | No (keep private) |

### 4. Create the admin account

There is no admin registration route. To create the first admin:

1. Go to **Supabase dashboard → Authentication → Users → Add user** (or Invite user).
   Use the email and password you want for the admin account.
2. Copy the UUID shown for that user.
3. Run the following in **SQL Editor** (replace the placeholder values):

```sql
INSERT INTO users (auth_id, full_name, email, phone, membership_id, role)
VALUES (
  '<uuid-from-supabase-dashboard>',
  'Admin',
  'admin@irnc.net',
  '+90000000000',
  'ADMIN-001',
  'admin'
);
```

All accounts created through the normal registration flow are assigned `role = 'member'` automatically.

### 5. Configure Supabase Auth redirect URLs

Go to **Authentication → URL Configuration → Redirect URLs** and add:

```
https://library.irnc.net/reset-password
http://localhost:5173/reset-password
```

This is required for the password reset flow to work.

### 6. Install and run the backend

```bash
cd backend
npm install
cp .env.example .env
# Fill in .env values — see Environment Variables section below
npm run dev
# API runs on http://localhost:3001
```

### 7. Install and run the frontend

```bash
cd frontend
npm install
cp .env.example .env
# Fill in .env values — see Environment Variables section below
npm run dev
# App runs on http://localhost:5173
```

The Vite dev server proxies all `/api` requests to `http://localhost:3001`.

### 8. (Optional) Load seed data

```bash
cd database
npm install
node seed.js
```

This inserts 10 sample books and 4 test members with 4 loans (3 checked out, 1 overdue).
Safe to re-run — it deletes all `SEED-` prefixed data before inserting.
The script reads credentials from `backend/.env`.

---

## Environment Variables

### Backend (`backend/.env`)

| Variable               | Required | Description                                                            |
| ---------------------- | -------- | ---------------------------------------------------------------------- |
| `PORT`                 | No       | Port the API listens on (default: 3001)                                |
| `SUPABASE_URL`         | Yes      | Supabase project URL (e.g. `https://xyz.supabase.co`)                  |
| `SUPABASE_SERVICE_KEY` | Yes      | Service role key — bypasses RLS, keep secret                           |
| `SUPABASE_ANON_KEY`    | Yes      | Anon public key — used for Auth token verification                     |
| `JWT_SECRET`           | Yes      | Arbitrary secret string (not used for signing, kept for compatibility) |
| `ADMIN_EMAIL`          | Yes      | Email address that receives daily overdue digest                       |
| `ADMIN_PASSWORD`       | No       | Informational only, not used in code                                   |
| `RESEND_API_KEY`       | No       | Resend API key — emails are skipped if absent                          |
| `FRONTEND_URL`         | Yes      | Allowed CORS origin and base URL used in email links                   |

### Frontend (`frontend/.env`)

| Variable                 | Required | Description                                                       |
| ------------------------ | -------- | ----------------------------------------------------------------- |
| `VITE_API_URL`           | Yes      | Backend API base URL (e.g. `http://localhost:3001`)               |
| `VITE_SUPABASE_URL`      | Yes      | Supabase project URL                                              |
| `VITE_SUPABASE_ANON_KEY` | Yes      | Supabase anon/public key (safe to expose)                         |
| `VITE_LIBRARY_URL`       | No       | Production URL used in QR codes (e.g. `https://library.irnc.net`) |

---

## Database Schema

### Tables

#### books

| Column                | Type        | Constraints                                                                      |
| --------------------- | ----------- | -------------------------------------------------------------------------------- |
| id                    | uuid        | PRIMARY KEY, DEFAULT gen_random_uuid()                                           |
| nfc_tag_id            | text        | UNIQUE NOT NULL                                                                  |
| title                 | text        | NOT NULL                                                                         |
| author                | text        | NOT NULL                                                                         |
| translator            | text        | —                                                                                |
| isbn                  | text        | —                                                                                |
| eisbn                 | text        | —                                                                                |
| category              | text        | —                                                                                |
| shelf_location        | text        | —                                                                                |
| cover_image_path      | text        | —                                                                                |
| back_cover_image_path | text        | —                                                                                |
| pdf_path              | text        | —                                                                                |
| status                | text        | NOT NULL DEFAULT 'available', CHECK IN ('available', 'out', 'overdue', 'locked') |
| added_date            | date        | NOT NULL DEFAULT current_date                                                    |
| notes                 | text        | —                                                                                |
| created_at            | timestamptz | NOT NULL DEFAULT now()                                                           |

#### users

| Column        | Type        | Constraints                                             |
| ------------- | ----------- | ------------------------------------------------------- |
| id            | uuid        | PRIMARY KEY, DEFAULT gen_random_uuid()                  |
| auth_id       | uuid        | UNIQUE NOT NULL                                         |
| full_name     | text        | NOT NULL                                                |
| email         | text        | UNIQUE NOT NULL                                         |
| phone         | text        | NOT NULL                                                |
| membership_id | text        | UNIQUE NOT NULL                                         |
| role          | text        | NOT NULL DEFAULT 'member', CHECK IN ('admin', 'member') |
| is_active     | boolean     | NOT NULL DEFAULT true                                   |
| created_at    | timestamptz | NOT NULL DEFAULT now()                                  |

#### loans

| Column        | Type        | Constraints                                                     |
| ------------- | ----------- | --------------------------------------------------------------- |
| id            | uuid        | PRIMARY KEY, DEFAULT gen_random_uuid()                          |
| book_id       | uuid        | NOT NULL, FK → books(id) ON DELETE RESTRICT                     |
| user_id       | uuid        | NOT NULL, FK → users(id) ON DELETE RESTRICT                     |
| checkout_date | date        | NOT NULL DEFAULT current_date                                   |
| due_date      | date        | —                                                               |
| return_date   | date        | —                                                               |
| status        | text        | NOT NULL DEFAULT 'out', CHECK IN ('out', 'returned', 'overdue') |
| notes         | text        | —                                                               |
| created_at    | timestamptz | NOT NULL DEFAULT now()                                          |

#### loan_history

| Column     | Type        | Constraints                                                                |
| ---------- | ----------- | -------------------------------------------------------------------------- |
| id         | uuid        | PRIMARY KEY, DEFAULT gen_random_uuid()                                     |
| loan_id    | uuid        | NOT NULL, FK → loans(id) ON DELETE CASCADE                                 |
| event_type | text        | NOT NULL, CHECK IN ('checkout', 'return', 'overdue_flagged', 'note_added') |
| event_date | timestamptz | NOT NULL DEFAULT now()                                                     |
| snapshot   | jsonb       | —                                                                          |

### Trigger

**`trg_sync_book_status`** — Fires after every INSERT or status UPDATE on the `loans` table. Updates `books.status` to match the new loan status (`'returned'` sets the book back to `'available'`; `'out'` and `'overdue'` copy directly). Also writes one audit row to `loan_history` for every transition. Application code never writes to `books.status` or `loan_history` directly.

### Views

| View            | Description                                                                                                                      |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `currently_out` | All loans with status `out` or `overdue`, joined with full book and borrower contact information, ordered by due date ascending. |
| `overdue_loans` | Subset of `currently_out` where `due_date < current_date`. Used by the daily cron job and the admin overdue panel.               |

---

## API Reference

### Auth

| Endpoint                         | Auth   | Description                                                        |
| -------------------------------- | ------ | ------------------------------------------------------------------ |
| `POST /api/auth/register`        | Public | Register a new member. Rate limited: 5 requests/hour.              |
| `POST /api/auth/login`           | Public | Sign in with email and password. Rate limited: 10 requests/15 min. |
| `POST /api/auth/logout`          | Bearer | Revoke the current session.                                        |
| `POST /api/auth/refresh`         | Public | Exchange a refresh token for a new access token.                   |
| `GET  /api/auth/me`              | Bearer | Return the authenticated user's profile.                           |
| `POST /api/auth/verify`          | Bearer | Check if the current token is valid.                               |
| `POST /api/auth/forgot-password` | Public | Trigger a Supabase password reset email.                           |
| `POST /api/auth/reset-password`  | Public | Set a new password using the reset access token.                   |

### Books

| Endpoint                       | Auth                                 | Description                                                                    |
| ------------------------------ | ------------------------------------ | ------------------------------------------------------------------------------ |
| `GET    /api/books`            | Public                               | List/search catalogue. Query: `search`, `category`, `status`, `page`, `limit`. |
| `GET    /api/books/nfc/:nfcId` | Public                               | Look up a book by its QR tag ID (e.g. `LIB-0001`).                             |
| `GET    /api/books/:id`        | Public (optional Bearer for PDF URL) | Get a single book. Authenticated users also receive a 1-hour signed PDF URL.   |
| `POST   /api/books`            | Admin only                           | Create a new book.                                                             |
| `PATCH  /api/books/:id`        | Admin only                           | Update book fields.                                                            |
| `PATCH  /api/books/:id/lock`   | Admin only                           | Set status to `locked` (in-library reading only).                              |
| `PATCH  /api/books/:id/unlock` | Admin only                           | Set status back to `available`.                                                |
| `DELETE /api/books/:id`        | Admin only                           | Delete book and remove its storage files. Cannot delete a checked-out book.    |

### Loans

| Endpoint                        | Auth                       | Description                                              |
| ------------------------------- | -------------------------- | -------------------------------------------------------- |
| `GET   /api/loans`              | Admin only                 | All loans, filterable by status.                         |
| `GET   /api/loans/overdue`      | Admin only                 | Overdue loans from the `overdue_loans` view.             |
| `GET   /api/loans/book/:bookId` | Public                     | Loan history for a given book.                           |
| `POST  /api/loans`              | Bearer                     | Check out a book. Max 5 active loans; max 90-day period. |
| `PATCH /api/loans/:id/return`   | Bearer (own loan) or Admin | Mark a loan as returned.                                 |

### Users

| Endpoint                          | Auth              | Description                                                  |
| --------------------------------- | ----------------- | ------------------------------------------------------------ |
| `GET   /api/users`                | Admin only        | List all members. Query: `search`, `role`, `is_active`.      |
| `GET   /api/users/:id`            | Admin only        | Get a single user's profile.                                 |
| `GET   /api/users/:id/loans`      | Admin or own user | Get a user's loan history.                                   |
| `PATCH /api/users/:id/deactivate` | Admin only        | Deactivate a member. Blocked if the member has active loans. |
| `PATCH /api/users/:id/activate`   | Admin only        | Re-activate a member.                                        |

### Uploads

| Endpoint                                 | Auth       | Description                                                                      |
| ---------------------------------------- | ---------- | -------------------------------------------------------------------------------- |
| `POST   /api/uploads/cover/:bookId`      | Admin only | Upload front cover image (JPEG/PNG/WebP, max 5 MB). Converted to WebP on upload. |
| `POST   /api/uploads/back-cover/:bookId` | Admin only | Upload back cover image (JPEG/PNG/WebP, max 5 MB).                               |
| `POST   /api/uploads/pdf/:bookId`        | Admin only | Upload a PDF (max 50 MB).                                                        |
| `GET    /api/uploads/pdf/:bookId/url`    | Bearer     | Get a 1-hour signed download URL for a book's PDF.                               |
| `DELETE /api/uploads/cover/:bookId`      | Admin only | Delete front cover from storage.                                                 |
| `DELETE /api/uploads/back-cover/:bookId` | Admin only | Delete back cover from storage.                                                  |
| `DELETE /api/uploads/pdf/:bookId`        | Admin only | Delete PDF from storage.                                                         |

### Stats

| Endpoint         | Auth       | Description                                                                                              |
| ---------------- | ---------- | -------------------------------------------------------------------------------------------------------- |
| `GET /api/stats` | Admin only | Returns total books, counts by status, total active members, overdue loans list, and category breakdown. |

---

## Frontend Pages

| Route                 | Page               | Access      | Description                                                    |
| --------------------- | ------------------ | ----------- | -------------------------------------------------------------- |
| `/`                   | CataloguePage      | Public      | Browse all books with search, category, and status filters     |
| `/book/:id`           | BookPage           | Public      | Book detail, cover, loan history; checkout button if available |
| `/book`               | BookPage           | Public      | Same as above (used when navigating without an ID)             |
| `/checkout`           | CheckoutPage       | Public      | QR scan landing page; prompts login if not authenticated       |
| `/login`              | LoginPage          | Public      | Member sign-in                                                 |
| `/register`           | RegisterPage       | Public      | New member registration                                        |
| `/forgot-password`    | ForgotPasswordPage | Public      | Request password reset email                                   |
| `/reset-password`     | ResetPasswordPage  | Public      | Set new password after clicking reset link                     |
| `/profile`            | UserProfilePage    | Member only | Active loans, loan history, account details                    |
| `/admin/login`        | AdminLoginRedirect | Public      | Redirects admin → `/admin`, others → `/login`                  |
| `/admin`              | AdminDashboard     | Admin only  | Stats, overdue list, quick actions                             |
| `/admin/books`        | AdminBooks         | Admin only  | Book catalogue management (CRUD, file uploads)                 |
| `/admin/loans`        | AdminLoans         | Admin only  | All loans, tabbed by status, mark returned                     |
| `/admin/members`      | AdminMembers       | Admin only  | Member list, loan history, activate/deactivate                 |
| `/admin/qr-generator` | AdminQRGenerator   | Admin only  | Generate and print QR codes for all books                      |

---

## Email System

| Email                     | Trigger                                     | Recipient                        | Sender                      |
| ------------------------- | ------------------------------------------- | -------------------------------- | --------------------------- |
| Welcome                   | Successful member registration              | New member                       | Resend (`library@irnc.net`) |
| Overdue digest            | Daily cron job at 08:00                     | Admin (`ADMIN_EMAIL`)            | Resend                      |
| Overdue borrower reminder | Daily cron job at 08:00 (once per borrower) | Each member with an overdue book | Resend                      |
| Password reset            | `POST /api/auth/forgot-password`            | Requesting email address         | Supabase Auth (automatic)   |

The welcome email includes the new member's Membership ID and a link to the catalogue.
The overdue digest includes a table of all overdue books with title, author, borrower name, Membership ID, phone, and due date.
The borrower reminder states how many days overdue the book is and links to the library.
Password reset links are valid for 1 hour and are sent directly by Supabase Auth — the backend triggers the request but does not send the email itself.
All Resend emails are skipped silently if `RESEND_API_KEY` is not set in the environment.

---

## Supabase Storage

| Bucket             | Access                | Max size | Allowed types   | Purpose                                    |
| ------------------ | --------------------- | -------- | --------------- | ------------------------------------------ |
| `book-covers`      | Public                | 5 MB     | JPEG, PNG, WebP | Front cover images                         |
| `book-back-covers` | Public                | 5 MB     | JPEG, PNG, WebP | Back cover images (contains QR sticker)    |
| `book-pdfs`        | Private (signed URLs) | 50 MB    | PDF             | Digital editions for authenticated members |

All image uploads are automatically resized to fit within 800×1200 px and converted to WebP at 85% quality before being stored. File paths inside each bucket follow the pattern `{bookId}/{timestamp}_{sanitized-name}.{ext}`.

---

## Design System

The UI uses a custom liquid-glass design system defined in `frontend/src/styles/global.css`. The page background is a fixed gradient (135°) from soft purple through teal to pale blue-green, with two ambient radial orbs for depth. All cards and panels use a frosted-glass recipe: semi-transparent white background, `backdrop-filter: blur(18px)`, and a white-tinted border.

**Key CSS variables:**

- `--accent: #6C47FF` — primary purple, used for buttons, focus rings, and the spinner
- `--glass-bg: rgba(255, 255, 255, 0.45)` — standard glass surface
- `--blur: blur(18px)` — standard backdrop blur

**Status badge colors:**

| Status    | Text color | Background                 |
| --------- | ---------- | -------------------------- |
| available | `#094a21`  | `rgba(30, 235, 105, 0.50)` |
| out       | `#92400e`  | `rgba(245, 175, 54, 0.60)` |
| overdue   | `#830000`  | `rgba(239, 68, 68, 0.46)`  |
| locked    | `#24094f`  | `rgba(138, 92, 246, 0.60)` |

**Category gradient colors (`frontend/src/lib/categoryColors.js`):**

| Category     | From      | To        |
| ------------ | --------- | --------- |
| Fiction      | `#6C47FF` | `#A78BFA` |
| History      | `#0ea5e9` | `#38bdf8` |
| Technology   | `#06b6d4` | `#67e8f9` |
| Science      | `#10b981` | `#6ee7b7` |
| Philosophy   | `#f59e0b` | `#fcd34d` |
| Psychology   | `#ec4899` | `#f9a8d4` |
| Business     | `#f97316` | `#fdba74` |
| Biography    | `#8b5cf6` | `#c4b5fd` |
| Art & Design | `#14b8a6` | `#5eead4` |
| Religion     | `#ef4444` | `#fca5a5` |
| (default)    | `#64748b` | `#94a3b8` |

**Typography:**

- English: `'Inter', system-ui, -apple-system, sans-serif`
- Persian: `'Vazirmatn', 'Tahoma', sans-serif`

**RTL support:** When the language is switched to Persian (`fa`), `document.documentElement.dir` is set to `'rtl'` and the Vazirmatn font is applied to `body`. The `.rtl-flip` utility class mirrors directional icons. The book-cover shine overlay also reverses direction.

---

## Book Status Values

| Status      | Set by                                       | Meaning                                     |
| ----------- | -------------------------------------------- | ------------------------------------------- |
| `available` | `trg_sync_book_status` trigger (on return)   | On the shelf, can be borrowed               |
| `out`       | `trg_sync_book_status` trigger (on checkout) | Currently borrowed by a member              |
| `overdue`   | Cron job (08:00 daily)                       | Borrowed and past due date                  |
| `locked`    | Admin only (`PATCH /api/books/:id/lock`)     | In-library reading only, cannot be borrowed |

---

## User Roles

| Role     | Created by                                      | Access                                                        |
| -------- | ----------------------------------------------- | ------------------------------------------------------------- |
| `admin`  | Manual SQL INSERT (see Getting Started step 4)  | Full system access — all API endpoints                        |
| `member` | Self-registration via `POST /api/auth/register` | Browse catalogue, checkout/return own books, view own profile |

---

## Deployment

### Frontend (Vercel)

1. Push the repository to GitHub.
2. Go to [vercel.com](https://vercel.com) → **Add New Project** → import the repository.
3. Set **Root Directory** to `frontend`.
4. Set **Build Command** to `vite build` and **Output Directory** to `dist`.
5. Add the following environment variables in the Vercel dashboard:
   - `VITE_API_URL` — your Railway backend URL (e.g. `https://your-app.up.railway.app`)
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_LIBRARY_URL=https://library.irnc.net`
6. Deploy.

### Backend (Railway)

1. Go to [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub**.
2. Select the repository.
3. Set **Root Directory** to `backend`.
4. Set **Start Command** to `node src/index.js`.
5. Add the following environment variables in the Railway dashboard:
   - `PORT` (Railway provides this automatically; you can omit it)
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_KEY`
   - `SUPABASE_ANON_KEY`
   - `JWT_SECRET`
   - `ADMIN_EMAIL`
   - `RESEND_API_KEY`
   - `FRONTEND_URL=https://library.irnc.net`
   - `NODE_ENV=production`
6. Deploy.

### Custom domain

1. In the Vercel project settings, go to **Domains** and add `library.irnc.net`.
2. Copy the CNAME target Vercel provides (e.g. `cname.vercel-dns.com`).
3. In your DNS provider, add a CNAME record:
   ```
   library  CNAME  cname.vercel-dns.com
   ```
4. Wait for DNS propagation (up to 48 hours; usually minutes).

---

## Before Going Live Checklist

- [ ] Delete all seed data: `DELETE FROM loans WHERE book_id IN (SELECT id FROM books WHERE nfc_tag_id LIKE 'SEED-%')` then `DELETE FROM books WHERE nfc_tag_id LIKE 'SEED-%'` then `DELETE FROM users WHERE membership_id LIKE 'SEED-%'`
- [ ] Set `RESEND_API_KEY` in backend environment
- [ ] Set `NODE_ENV=production` in backend environment
- [ ] Update `FRONTEND_URL` in backend environment to `https://library.irnc.net`
- [ ] Update `VITE_API_URL` in Vercel to the Railway backend URL
- [ ] Add `https://library.irnc.net/reset-password` to Supabase Auth redirect URLs
- [ ] Add CNAME record for `library.irnc.net`
- [ ] Test QR code scanning with a printed code
- [ ] Confirm admin account works on production
- [ ] Confirm overdue email sends correctly (run `npm run cron` once manually)

---

## Development Scripts

### Backend

| Script          | Command                           | Description                            |
| --------------- | --------------------------------- | -------------------------------------- |
| `dev`           | `nodemon src/index.js`            | Start with live reload                 |
| `start`         | `node src/index.js`               | Start for production                   |
| `cron`          | `node src/services/overdueJob.js` | Run the overdue check once immediately |
| `test`          | `vitest run`                      | Run test suite once                    |
| `test:watch`    | `vitest`                          | Run tests in watch mode                |
| `test:coverage` | `vitest run --coverage`           | Run tests with coverage report         |
| `test:ui`       | `vitest --ui`                     | Open Vitest browser UI                 |

### Frontend

| Script          | Command                     | Description                            |
| --------------- | --------------------------- | -------------------------------------- |
| `dev`           | `vite`                      | Start dev server on port 5173          |
| `build`         | `vite build`                | Build for production (output: `dist/`) |
| `preview`       | `vite preview`              | Preview the production build locally   |
| `lint`          | `eslint src --ext .js,.jsx` | Lint source files                      |
| `test`          | `vitest run`                | Run test suite once                    |
| `test:watch`    | `vitest`                    | Run tests in watch mode                |
| `test:coverage` | `vitest run --coverage`     | Run tests with coverage report         |

---

## Notes

- The `nfc_tag_id` field stores the QR code identifier (format: `LIB-XXXX`). Despite the name, the system uses printed QR codes — NFC stickers were the original plan but were replaced for cost reasons. The field name is kept for database compatibility.
- Seed data uses the prefix `SEED-` on `nfc_tag_id` (books) and `membership_id` (members) so it can be safely identified and removed before launch. Seed users are inserted directly into the `users` table with placeholder `auth_id` values and have no real Supabase Auth login.
- The audio version system (member recordings, IBAN payments) is deferred to v2 and not implemented.
