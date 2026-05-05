-- IRNC Library Management System — Database Schema
-- Run this file once on a new Supabase project via SQL Editor
-- Last updated: April 2026

-- ============================================================
-- SECTION 1 — EXTENSIONS
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- SECTION 2 — TABLES
-- Created in dependency order: books → users → loans → loan_history
-- ============================================================

-- ── books ────────────────────────────────────────────────────
-- The core catalogue. Status is managed automatically by the
-- sync_book_status trigger (via loan events) and the lock/unlock
-- API endpoints. Never set status directly from application code.

CREATE TABLE IF NOT EXISTS books (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  nfc_tag_id            text        UNIQUE NOT NULL,
  title                 text        NOT NULL,
  author                text        NOT NULL,
  translator            text,
  isbn                  text,
  eisbn                 text,
  category              text,
  shelf_location        text,
  cover_image_path      text,
  back_cover_image_path text,
  pdf_path              text,
  status                text        NOT NULL DEFAULT 'available'
                        CHECK (status IN ('available', 'out', 'overdue', 'locked')),
  added_date            date        NOT NULL DEFAULT current_date,
  notes                 text,
  created_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS books_nfc_idx      ON books (nfc_tag_id);
CREATE INDEX IF NOT EXISTS books_status_idx   ON books (status);
CREATE INDEX IF NOT EXISTS books_category_idx ON books (category);

-- ── users ────────────────────────────────────────────────────
-- Library members. Each row is linked to a Supabase Auth account
-- via auth_id. Created automatically on registration by the API.
-- role: 'admin' has full API access; 'member' can borrow books.

CREATE TABLE IF NOT EXISTS users (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id       uuid        UNIQUE NOT NULL,
  full_name     text        NOT NULL,
  email         text        UNIQUE NOT NULL,
  phone         text        NOT NULL,
  membership_id text        UNIQUE NOT NULL,
  role          text        NOT NULL DEFAULT 'member'
                CHECK (role IN ('admin', 'member')),
  is_active     boolean     NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS users_auth_id_idx    ON users (auth_id);
CREATE INDEX IF NOT EXISTS users_membership_idx ON users (membership_id);
CREATE INDEX IF NOT EXISTS users_email_idx      ON users (email);

-- ── loans ────────────────────────────────────────────────────
-- One row per checkout event. A book can only have one active
-- loan at a time (enforced by the API before insert).
-- The sync_book_status trigger keeps books.status in sync.

CREATE TABLE IF NOT EXISTS loans (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id       uuid        NOT NULL REFERENCES books(id) ON DELETE RESTRICT,
  user_id       uuid        NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  checkout_date date        NOT NULL DEFAULT current_date,
  due_date      date,
  return_date   date,
  status        text        NOT NULL DEFAULT 'out'
                CHECK (status IN ('out', 'returned', 'overdue')),
  notes         text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS loans_book_idx   ON loans (book_id);
CREATE INDEX IF NOT EXISTS loans_user_idx   ON loans (user_id);
CREATE INDEX IF NOT EXISTS loans_status_idx ON loans (status);

-- ── loan_history ─────────────────────────────────────────────
-- Append-only audit log. Every loan status change writes one row.
-- Written by the sync_book_status trigger — never write here directly.

CREATE TABLE IF NOT EXISTS loan_history (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id    uuid        NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
  event_type text        NOT NULL
             CHECK (event_type IN ('checkout', 'return', 'overdue_flagged', 'note_added')),
  event_date timestamptz NOT NULL DEFAULT now(),
  snapshot   jsonb
);

CREATE INDEX IF NOT EXISTS loan_history_loan_idx ON loan_history (loan_id);

-- ============================================================
-- SECTION 3 — TRIGGER
-- Fires after every INSERT or status UPDATE on loans.
-- Syncs books.status and writes an audit row to loan_history.
-- ============================================================

CREATE OR REPLACE FUNCTION sync_book_status()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  -- Update the book's status to match the loan status.
  -- 'locked' books cannot have active loans (API prevents this),
  -- so we only act on the three valid loan status values.
  IF NEW.status = 'out' THEN
    UPDATE books SET status = 'out'       WHERE id = NEW.book_id;
  ELSIF NEW.status = 'returned' THEN
    UPDATE books SET status = 'available' WHERE id = NEW.book_id;
  ELSIF NEW.status = 'overdue' THEN
    UPDATE books SET status = 'overdue'   WHERE id = NEW.book_id;
  END IF;

  -- Write an audit row for every status transition.
  INSERT INTO loan_history (loan_id, event_type, snapshot)
  VALUES (
    NEW.id,
    CASE NEW.status
      WHEN 'out'      THEN 'checkout'
      WHEN 'returned' THEN 'return'
      WHEN 'overdue'  THEN 'overdue_flagged'
      ELSE                 'note_added'
    END,
    to_jsonb(NEW)
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_book_status ON loans;
CREATE TRIGGER trg_sync_book_status
  AFTER INSERT OR UPDATE OF status ON loans
  FOR EACH ROW EXECUTE FUNCTION sync_book_status();

-- ============================================================
-- SECTION 4 — VIEWS
-- ============================================================

-- ── currently_out ────────────────────────────────────────────
-- All books that are currently borrowed (status out or overdue).
-- Includes borrower contact info for admin use.

CREATE OR REPLACE VIEW currently_out AS
SELECT
  b.id              AS book_id,
  b.title,
  b.author,
  b.nfc_tag_id,
  b.shelf_location,
  b.category,
  u.id              AS user_id,
  u.full_name       AS borrower_name,
  u.phone           AS borrower_phone,
  u.email           AS borrower_email,
  u.membership_id   AS borrower_membership_id,
  l.id              AS loan_id,
  l.checkout_date,
  l.due_date,
  l.status          AS loan_status
FROM loans l
JOIN books b ON b.id = l.book_id
JOIN users u ON u.id = l.user_id
WHERE l.status IN ('out', 'overdue')
ORDER BY l.due_date ASC NULLS LAST;

-- ── overdue_loans ────────────────────────────────────────────
-- Subset of currently_out where the due date has passed.
-- Used by the daily cron job and the admin overdue panel.

CREATE OR REPLACE VIEW overdue_loans AS
SELECT *
FROM currently_out
WHERE due_date < current_date;

-- ============================================================
-- SECTION 5 — ROW LEVEL SECURITY
-- The backend uses the SERVICE ROLE KEY which bypasses all RLS.
-- These policies protect direct Supabase client access (e.g. from
-- the frontend using the anon key), not backend API calls.
-- ============================================================

ALTER TABLE books        ENABLE ROW LEVEL SECURITY;
ALTER TABLE users        ENABLE ROW LEVEL SECURITY;
ALTER TABLE loans        ENABLE ROW LEVEL SECURITY;
ALTER TABLE loan_history ENABLE ROW LEVEL SECURITY;

-- ── books policies ───────────────────────────────────────────

-- Anyone (including unauthenticated visitors) can browse the catalogue.
CREATE POLICY "books_public_read"
  ON books FOR SELECT
  USING (true);

-- Only active admins can create, update, or delete books.
CREATE POLICY "books_admin_write"
  ON books FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_id  = auth.uid()
      AND   users.role     = 'admin'
      AND   users.is_active = true
    )
  );

-- ── users policies ───────────────────────────────────────────

-- Each member can read their own profile row.
CREATE POLICY "users_read_own"
  ON users FOR SELECT
  USING (auth_id = auth.uid());

-- Each member can update their own profile row.
CREATE POLICY "users_update_own"
  ON users FOR UPDATE
  USING (auth_id = auth.uid());

-- Active admins have full access to all user records.
CREATE POLICY "users_admin_all"
  ON users FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users u2
      WHERE u2.auth_id   = auth.uid()
      AND   u2.role      = 'admin'
      AND   u2.is_active = true
    )
  );

-- ── loans policies ───────────────────────────────────────────

-- Members can read their own loan records.
CREATE POLICY "loans_read_own"
  ON loans FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id      = loans.user_id
      AND   users.auth_id = auth.uid()
    )
  );

-- Any authenticated user can create a loan (API validates availability).
CREATE POLICY "loans_member_insert"
  ON loans FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Active admins have full access to all loan records.
CREATE POLICY "loans_admin_all"
  ON loans FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_id  = auth.uid()
      AND   users.role     = 'admin'
      AND   users.is_active = true
    )
  );

-- ── loan_history policies ────────────────────────────────────

-- Only active admins can read the audit log.
-- Regular users never read or write this table directly.
-- The trigger writes to it via the service role (bypasses RLS).
CREATE POLICY "loan_history_admin_read"
  ON loan_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_id  = auth.uid()
      AND   users.role     = 'admin'
      AND   users.is_active = true
    )
  );

-- ============================================================
-- SEED DATA — delete this section before going to production
-- ============================================================

INSERT INTO books (nfc_tag_id, title, author, translator, isbn, category, shelf_location, status)
VALUES
  ('LIB-0001', 'The Name of the Wind',     'Patrick Rothfuss',  NULL,           '9780756404741', 'Fiction',    'A1', 'available'),
  ('LIB-0002', 'Dune',                     'Frank Herbert',     NULL,           '9780441013593', 'Fiction',    'A1', 'available'),
  ('LIB-0003', 'Sapiens',                  'Yuval Noah Harari', NULL,           '9780062316097', 'History',    'B2', 'available'),
  ('LIB-0004', 'The Pragmatic Programmer', 'David Thomas',      NULL,           '9780135957059', 'Technology', 'C1', 'available'),
  ('LIB-0005', 'Meditations',              'Marcus Aurelius',   'Gregory Hays', '9780140449334', 'Philosophy', 'B1', 'available'),
  ('LIB-0006', 'Clean Code',               'Robert C. Martin',  NULL,           '9780132350884', 'Technology', 'C1', 'available'),
  ('LIB-0007', 'Atomic Habits',            'James Clear',       NULL,           '9780735211292', 'Psychology', 'B3', 'available'),
  ('LIB-0008', 'Thinking Fast and Slow',   'Daniel Kahneman',   NULL,           '9780374533557', 'Psychology', 'B3', 'available'),
  ('LIB-0009', 'A Brief History of Time',  'Stephen Hawking',   NULL,           '9780553380163', 'Science',    'D1', 'available'),
  ('LIB-0010', 'Zero to One',              'Peter Thiel',       NULL,           '9780804139021', 'Business',   'E1', 'locked')
ON CONFLICT (nfc_tag_id) DO NOTHING;

-- LIB-0010 is locked as a demo of the restricted-access status.
-- No user rows — users are created through the registration flow.
-- To create the admin user after first login, run:
--   INSERT INTO users (auth_id, full_name, email, phone, membership_id, role)
--   VALUES ('[auth-uid-from-supabase-dashboard]', 'Admin', 'admin@irnc.net', '+90000000000', 'ADMIN-001', 'admin');

-- ============================================================
-- END SEED DATA
-- ============================================================
