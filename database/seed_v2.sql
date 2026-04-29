-- IRNC Library — Seed v2
-- Updated for schema v2: 'available' status, 'category' column, new fields.
-- Does NOT insert borrowers (replaced by users via Supabase Auth).

-- ─────────────────────────────────────────────────────────────────────────────
-- BOOKS
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO books (nfc_tag_id, title, author, translator, isbn, category, shelf_location, status) VALUES
  ('LIB-0001', 'The Name of the Wind',     'Patrick Rothfuss',  NULL,            '9780756404741', 'Fiction',    'A1', 'available'),
  ('LIB-0002', 'Dune',                     'Frank Herbert',     NULL,            '9780441013593', 'Fiction',    'A1', 'available'),
  ('LIB-0003', 'Sapiens',                  'Yuval Noah Harari', NULL,            '9780062316097', 'History',    'B2', 'available'),
  ('LIB-0004', 'The Pragmatic Programmer', 'David Thomas',      NULL,            '9780135957059', 'Technology', 'C1', 'available'),
  ('LIB-0005', 'Meditations',              'Marcus Aurelius',   'Gregory Hays',  '9780140449334', 'Philosophy', 'B1', 'available'),
  ('LIB-0006', 'Clean Code',               'Robert C. Martin',  NULL,            '9780132350884', 'Technology', 'C1', 'available'),
  ('LIB-0007', 'Atomic Habits',            'James Clear',       NULL,            '9780735211292', 'Psychology', 'B3', 'available'),
  ('LIB-0008', 'Thinking Fast and Slow',   'Daniel Kahneman',   NULL,            '9780374533557', 'Psychology', 'B3', 'available'),
  ('LIB-0009', 'A Brief History of Time',  'Stephen Hawking',   NULL,            '9780553380163', 'Science',    'D1', 'available'),
  ('LIB-0010', 'Zero to One',              'Peter Thiel',       NULL,            '9780804139021', 'Business',   'E1', 'locked')
ON CONFLICT (nfc_tag_id) DO NOTHING;

-- LIB-0010 is locked as a demo of the restricted status

-- ─────────────────────────────────────────────────────────────────────────────
-- TEST USER (placeholder — replace auth_id with real Supabase Auth UID
-- after the first registration in the Auth dashboard)
-- ─────────────────────────────────────────────────────────────────────────────

-- INSERT INTO users (auth_id, full_name, email, phone, membership_id, role) VALUES
--   ('00000000-0000-0000-0000-000000000001', 'Test Member', 'test@example.com', '+90555000001', 'IRNC-0001', 'member');
--
-- To insert the admin user, get the real auth_id from the Supabase Auth dashboard:
-- INSERT INTO users (auth_id, full_name, email, phone, membership_id, role) VALUES
--   ('[real-auth-uid]', 'Admin', 'admin@irnc.net', '+90000000000', 'ADMIN-001', 'admin');
