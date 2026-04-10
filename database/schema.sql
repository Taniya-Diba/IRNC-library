-- ============================================================
--  IRNC Personal Library — Full Database Schema
--  Run this in Supabase SQL Editor
-- ============================================================

create extension if not exists "pgcrypto";

-- ─────────────────────────────────────────
--  BORROWERS
-- ─────────────────────────────────────────
create table if not exists borrowers (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  phone      text,
  email      text,
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────
--  BOOKS
-- ─────────────────────────────────────────
create table if not exists books (
  id             uuid primary key default gen_random_uuid(),
  nfc_tag_id     text unique not null,
  title          text not null,
  author         text not null,
  isbn           text,
  genre          text,
  shelf_location text,
  cover_url      text,
  status         text not null default 'in' check (status in ('in','out')),
  added_date     date not null default current_date,
  notes          text,
  created_at     timestamptz not null default now()
);

create index if not exists books_nfc_idx    on books (nfc_tag_id);
create index if not exists books_status_idx on books (status);
create index if not exists books_genre_idx  on books (genre);

-- ─────────────────────────────────────────
--  LOANS
-- ─────────────────────────────────────────
create table if not exists loans (
  id            uuid primary key default gen_random_uuid(),
  book_id       uuid not null references books(id) on delete restrict,
  borrower_id   uuid not null references borrowers(id) on delete restrict,
  checkout_date date not null default current_date,
  due_date      date,
  return_date   date,
  status        text not null default 'out' check (status in ('out','returned','overdue')),
  notes         text,
  created_at    timestamptz not null default now()
);

create index if not exists loans_book_idx     on loans (book_id);
create index if not exists loans_borrower_idx on loans (borrower_id);
create index if not exists loans_status_idx   on loans (status);

-- ─────────────────────────────────────────
--  LOAN HISTORY (append-only audit log)
-- ─────────────────────────────────────────
create table if not exists loan_history (
  id          uuid primary key default gen_random_uuid(),
  loan_id     uuid not null references loans(id) on delete cascade,
  event_type  text not null check (event_type in ('checkout','return','overdue_flagged','note_added')),
  event_date  timestamptz not null default now(),
  snapshot    jsonb
);

create index if not exists loan_history_loan_idx on loan_history (loan_id);

-- ─────────────────────────────────────────
--  TRIGGER: sync book status + write history
-- ─────────────────────────────────────────
create or replace function sync_book_status()
returns trigger language plpgsql as $$
begin
  if NEW.status = 'out' then
    update books set status = 'out' where id = NEW.book_id;
  else
    update books set status = 'in' where id = NEW.book_id;
  end if;

  insert into loan_history (loan_id, event_type, snapshot)
  values (
    NEW.id,
    case NEW.status
      when 'out'      then 'checkout'
      when 'returned' then 'return'
      when 'overdue'  then 'overdue_flagged'
      else 'note_added'
    end,
    to_jsonb(NEW)
  );

  return NEW;
end;
$$;

drop trigger if exists trg_sync_book_status on loans;
create trigger trg_sync_book_status
after insert or update of status on loans
for each row execute function sync_book_status();

-- ─────────────────────────────────────────
--  VIEWS
-- ─────────────────────────────────────────
create or replace view currently_out as
select
  b.id          as book_id,
  b.title,
  b.author,
  b.nfc_tag_id,
  b.shelf_location,
  br.name       as borrower_name,
  br.phone      as borrower_phone,
  br.email      as borrower_email,
  l.id          as loan_id,
  l.checkout_date,
  l.due_date,
  l.status      as loan_status
from loans l
join books     b  on b.id  = l.book_id
join borrowers br on br.id = l.borrower_id
where l.status in ('out','overdue')
order by l.due_date asc nulls last;

create or replace view overdue_loans as
select * from currently_out
where due_date < current_date;

-- ─────────────────────────────────────────
--  ROW LEVEL SECURITY
--  Public: read books only
--  Authenticated (admin): full access
-- ─────────────────────────────────────────
alter table books         enable row level security;
alter table borrowers     enable row level security;
alter table loans         enable row level security;
alter table loan_history  enable row level security;

-- Anyone can read books
create policy "Public can read books"
  on books for select using (true);

-- Admin full access (service role bypasses RLS automatically)
create policy "Admin full access on books"
  on books for all using (auth.role() = 'authenticated');

create policy "Admin full access on borrowers"
  on borrowers for all using (auth.role() = 'authenticated');

create policy "Admin full access on loans"
  on loans for all using (auth.role() = 'authenticated');

create policy "Admin full access on loan_history"
  on loan_history for all using (auth.role() = 'authenticated');
