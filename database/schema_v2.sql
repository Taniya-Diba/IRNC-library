-- IRNC Library — Schema v2
-- Complete replacement schema. Safe to run on a fresh Supabase project.
-- All tables use CREATE TABLE IF NOT EXISTS; triggers/functions use CREATE OR REPLACE.

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLES
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS books (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nfc_tag_id            text UNIQUE NOT NULL,
  title                 text NOT NULL,
  author                text NOT NULL,
  translator            text,
  isbn                  text,
  eisbn                 text,
  category              text,
  shelf_location        text,
  cover_image_path      text,
  back_cover_image_path text,
  pdf_path              text,
  status                text NOT NULL DEFAULT 'available'
                        CHECK (status IN ('available','out','overdue','locked')),
  added_date            date NOT NULL DEFAULT current_date,
  notes                 text,
  created_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS books_nfc_idx      ON books (nfc_tag_id);
CREATE INDEX IF NOT EXISTS books_status_idx   ON books (status);
CREATE INDEX IF NOT EXISTS books_category_idx ON books (category);

-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id       uuid UNIQUE NOT NULL,
  full_name     text NOT NULL,
  email         text UNIQUE NOT NULL,
  phone         text NOT NULL,
  membership_id text UNIQUE NOT NULL,
  role          text NOT NULL DEFAULT 'member'
                CHECK (role IN ('admin','member')),
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS users_auth_id_idx    ON users (auth_id);
CREATE INDEX IF NOT EXISTS users_membership_idx ON users (membership_id);
CREATE INDEX IF NOT EXISTS users_email_idx      ON users (email);

-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS loans (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id       uuid NOT NULL REFERENCES books(id) ON DELETE RESTRICT,
  user_id       uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  checkout_date date NOT NULL DEFAULT current_date,
  due_date      date,
  return_date   date,
  status        text NOT NULL DEFAULT 'out'
                CHECK (status IN ('out','returned','overdue')),
  notes         text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS loans_book_idx   ON loans (book_id);
CREATE INDEX IF NOT EXISTS loans_user_idx   ON loans (user_id);
CREATE INDEX IF NOT EXISTS loans_status_idx ON loans (status);

-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS loan_history (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id    uuid NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  event_date timestamptz NOT NULL DEFAULT now(),
  snapshot   jsonb
);

CREATE INDEX IF NOT EXISTS loan_history_loan_idx ON loan_history (loan_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- TRIGGER — sync book status from loan status
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION sync_book_status()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = 'out' THEN
    UPDATE books SET status = 'out' WHERE id = NEW.book_id;
  ELSIF NEW.status = 'returned' THEN
    UPDATE books SET status = 'available' WHERE id = NEW.book_id;
  ELSIF NEW.status = 'overdue' THEN
    UPDATE books SET status = 'overdue' WHERE id = NEW.book_id;
  END IF;

  INSERT INTO loan_history (loan_id, event_type, snapshot)
  VALUES (
    NEW.id,
    CASE NEW.status
      WHEN 'out'      THEN 'checkout'
      WHEN 'returned' THEN 'return'
      WHEN 'overdue'  THEN 'overdue_flagged'
      ELSE 'note_added'
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

-- ─────────────────────────────────────────────────────────────────────────────
-- VIEWS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW currently_out AS
SELECT
  b.id            AS book_id,
  b.title,
  b.author,
  b.nfc_tag_id,
  b.shelf_location,
  u.full_name      AS borrower_name,
  u.phone          AS borrower_phone,
  u.email          AS borrower_email,
  u.membership_id  AS borrower_membership_id,
  l.id             AS loan_id,
  l.checkout_date,
  l.due_date,
  l.status         AS loan_status
FROM loans l
JOIN books b ON b.id = l.book_id
JOIN users u ON u.id = l.user_id
WHERE l.status IN ('out','overdue')
ORDER BY l.due_date ASC NULLS LAST;

CREATE OR REPLACE VIEW overdue_loans AS
SELECT * FROM currently_out
WHERE due_date < current_date;

-- ─────────────────────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE books        ENABLE ROW LEVEL SECURITY;
ALTER TABLE users        ENABLE ROW LEVEL SECURITY;
ALTER TABLE loans        ENABLE ROW LEVEL SECURITY;
ALTER TABLE loan_history ENABLE ROW LEVEL SECURITY;

-- Drop old policies if they exist
DROP POLICY IF EXISTS "Public can read books"             ON books;
DROP POLICY IF EXISTS "Admin full access on books"        ON books;
DROP POLICY IF EXISTS "Admin full access on borrowers"    ON borrowers;
DROP POLICY IF EXISTS "Admin full access on loans"        ON loans;
DROP POLICY IF EXISTS "Admin full access on loan_history" ON loan_history;

-- Books: anyone can read
CREATE POLICY "books_public_read" ON books
  FOR SELECT USING (true);

-- Books: admin write (service role bypasses RLS; this covers anon key usage)
CREATE POLICY "books_admin_write" ON books
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Users: authenticated users can read their own record
CREATE POLICY "users_read_own" ON users
  FOR SELECT USING (auth_id = auth.uid());

-- Users: admin can read/write all
CREATE POLICY "users_admin_all" ON users
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users u2
      WHERE u2.auth_id = auth.uid()
      AND u2.role = 'admin'
    )
  );

-- Loans: members see only their own
CREATE POLICY "loans_read_own" ON loans
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = loans.user_id
      AND users.auth_id = auth.uid()
    )
  );

-- Loans: authenticated members can insert
CREATE POLICY "loans_member_insert" ON loans
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated'
  );

-- Loans: admin full access
CREATE POLICY "loans_admin_all" ON loans
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- loan_history: admin only
CREATE POLICY "loan_history_admin" ON loan_history
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- NOTE: The backend uses the SERVICE ROLE KEY which bypasses ALL RLS.
-- These policies protect direct Supabase client access, not backend API calls.
