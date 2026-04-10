-- ============================================================
--  Sample seed data — run after schema.sql
--  20 diverse books covering all genres
-- ============================================================
insert into books (
    nfc_tag_id,
    title,
    author,
    isbn,
    genre,
    shelf_location,
    status
  )
values (
    'LIB-0001',
    'The Name of the Wind',
    'Patrick Rothfuss',
    '9780756404741',
    'Fiction',
    'A1',
    'in'
  ),
  (
    'LIB-0002',
    'Dune',
    'Frank Herbert',
    '9780441013593',
    'Fiction',
    'A1',
    'in'
  ),
  (
    'LIB-0003',
    'The Midnight Library',
    'Matt Haig',
    '9780020195481',
    'Fiction',
    'A2',
    'in'
  ),
  (
    'LIB-0004',
    'Project Hail Mary',
    'Andy Weir',
    '9780593135204',
    'Science',
    'A3',
    'in'
  ),
  (
    'LIB-0005',
    'Sapiens',
    'Yuval Noah Harari',
    '9780062316097',
    'History',
    'B1',
    'in'
  ),
  (
    'LIB-0006',
    'The Code Breaker',
    'Walter Isaacson',
    '9781982115869',
    'Biography',
    'B2',
    'in'
  ),
  (
    'LIB-0007',
    'The Pragmatic Programmer',
    'David Thomas',
    '9780135957059',
    'Technology',
    'C1',
    'out'
  ),
  (
    'LIB-0008',
    'Clean Code',
    'Robert C. Martin',
    '9780132350884',
    'Technology',
    'C1',
    'in'
  ),
  (
    'LIB-0009',
    'Design Patterns',
    'Gang of Four',
    '9780201633610',
    'Technology',
    'C1',
    'in'
  ),
  (
    'LIB-0010',
    'Meditations',
    'Marcus Aurelius',
    '9780140449334',
    'Philosophy',
    'B3',
    'in'
  ),
  (
    'LIB-0011',
    'The Republic',
    'Plato',
    '9780140449259',
    'Philosophy',
    'B3',
    'in'
  ),
  (
    'LIB-0012',
    'Thinking, Fast and Slow',
    'Daniel Kahneman',
    '9780374533557',
    'Psychology',
    'B4',
    'in'
  ),
  (
    'LIB-0013',
    'Atomic Habits',
    'James Clear',
    '9780735211292',
    'Psychology',
    'B4',
    'in'
  ),
  (
    'LIB-0014',
    'A Brief History of Time',
    'Stephen Hawking',
    '9780553380163',
    'Science',
    'D1',
    'in'
  ),
  (
    'LIB-0015',
    'The Selfish Gene',
    'Richard Dawkins',
    '9780192860925',
    'Science',
    'D1',
    'in'
  ),
  (
    'LIB-0016',
    'Good to Great',
    'Jim Collins',
    '9780066620992',
    'Business',
    'E1',
    'in'
  ),
  (
    'LIB-0017',
    'Zero to One',
    'Peter Thiel',
    '9780804139021',
    'Business',
    'E1',
    'in'
  ),
  (
    'LIB-0018',
    'The Hitchhiker''s Guide',
    'Douglas Adams',
    '9780345391803',
    'Fiction',
    'A2',
    'in'
  ),
  (
    'LIB-0019',
    'I, Robot',
    'Isaac Asimov',
    '9780553294438',
    'Fiction',
    'A3',
    'in'
  ),
  (
    'LIB-0020',
    'Educated',
    'Tara Westover',
    '9780399590504',
    'Biography',
    'B2',
    'in'
  );
insert into borrowers (name, phone, email)
values (
    'Ali Yılmaz',
    '+90 555 111 2233',
    'ali@example.com'
  ),
  (
    'Sara Demir',
    '+90 555 444 5566',
    'sara@example.com'
  ),
  (
    'John Smith',
    '+1 555 123 4567',
    'john.smith@example.com'
  ),
  (
    'Maria Garcia',
    '+1 555 987 6543',
    'maria.garcia@example.com'
  );
-- Sample active loans (3 books checked out)
with book1 as (
  select id
  from books
  where nfc_tag_id = 'LIB-0007'
),
book2 as (
  select id
  from books
  where nfc_tag_id = 'LIB-0018'
),
borrow1 as (
  select id
  from borrowers
  where name = 'Ali Yılmaz'
),
borrow2 as (
  select id
  from borrowers
  where name = 'John Smith'
),
borrow3 as (
  select id
  from borrowers
  where name = 'Sara Demir'
)
insert into loans (
    book_id,
    borrower_id,
    checkout_date,
    due_date,
    status
  )
select b.id,
  br.id,
  current_date - 5,
  current_date + 9,
  'out'
from book1 b,
  borrow1 br
union all
select b.id,
  br.id,
  current_date - 15,
  current_date - 3,
  'overdue'
from book2 b,
  borrow2 br
union all
select b.id,
  br.id,
  current_date - 2,
  current_date + 12,
  'out'
from (
    select id
    from books
    where nfc_tag_id = 'LIB-0003'
  ) b,
  borrow3 br;