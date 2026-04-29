-- IRNC Library — Migration v2
-- Run against an EXISTING database that has the old schema.
-- Makes minimum changes without dropping data.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Add new columns to books
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE books
  ADD COLUMN IF NOT EXISTS translator            text,
  ADD COLUMN IF NOT EXISTS eisbn                 text,
  ADD COLUMN IF NOT EXISTS category              text,
  ADD COLUMN IF NOT EXISTS cover_image_path      text,
  ADD COLUMN IF NOT EXISTS back_cover_image_path text,
  ADD COLUMN IF NOT EXISTS pdf_path              text;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Rename genre → category (copy data, drop old column)
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'books' AND column_name = 'genre'
  ) THEN
    UPDATE books SET category = genre WHERE category IS NULL;
    ALTER TABLE books DROP COLUMN IF EXISTS genre;
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Update status constraint on books
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE books DROP CONSTRAINT IF EXISTS books_status_check;
ALTER TABLE books ALTER COLUMN status SET DEFAULT 'available';
ALTER TABLE books ADD CONSTRAINT books_status_check
  CHECK (status IN ('available','out','overdue','locked'));

-- Migrate old 'in' values to 'available'
UPDATE books SET status = 'available' WHERE status = 'in';

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Create users table
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
-- 5. Add user_id to loans (nullable — backfill manually after auth is live)
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE loans ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES users(id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. Rewrite sync_book_status trigger
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
-- 7. Recreate views (join to users instead of borrowers)
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
-- 8. RLS policies
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE books        ENABLE ROW LEVEL SECURITY;
ALTER TABLE users        ENABLE ROW LEVEL SECURITY;
ALTER TABLE loans        ENABLE ROW LEVEL SECURITY;
ALTER TABLE loan_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read books"             ON books;
DROP POLICY IF EXISTS "Admin full access on books"        ON books;
DROP POLICY IF EXISTS "Admin full access on borrowers"    ON borrowers;
DROP POLICY IF EXISTS "Admin full access on loans"        ON loans;
DROP POLICY IF EXISTS "Admin full access on loan_history" ON loan_history;

CREATE POLICY "books_public_read" ON books
  FOR SELECT USING (true);

CREATE POLICY "books_admin_write" ON books
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "users_read_own" ON users
  FOR SELECT USING (auth_id = auth.uid());

CREATE POLICY "users_admin_all" ON users
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users u2
      WHERE u2.auth_id = auth.uid()
      AND u2.role = 'admin'
    )
  );

CREATE POLICY "loans_read_own" ON loans
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = loans.user_id
      AND users.auth_id = auth.uid()
    )
  );

CREATE POLICY "loans_member_insert" ON loans
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated'
  );

CREATE POLICY "loans_admin_all" ON loans
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "loan_history_admin" ON loan_history
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- DEVELOPER NOTE:
-- The borrowers table is kept intact — it holds old anonymous checkout data.
-- loans.user_id is nullable in this migration. After auth is live and real
-- users exist, run manual data cleanup if needed.
-- New loans going forward will always have user_id set.
-- ─────────────────────────────────────────────────────────────────────────────
