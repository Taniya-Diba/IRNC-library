import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { config } from 'dotenv';

// Load backend/.env (script runs from database/ or repo root)
const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, '../backend/.env') });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// ── Helpers ──────────────────────────────────────────
function log(msg)  { console.log(`  ✓  ${msg}`); }
function warn(msg) { console.warn(`  ⚠  ${msg}`); }
function err(msg)  { console.error(`  ✗  ${msg}`); }

function today(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

// ── Step 1: Clean existing seed data ─────────────────
async function cleanSeedData() {
  console.log('\n🗑  Cleaning existing seed data…');

  const { data: seedBooks } = await supabase
    .from('books')
    .select('id')
    .like('nfc_tag_id', 'SEED-%');

  const seedBookIds = (seedBooks || []).map(b => b.id);

  if (seedBookIds.length > 0) {
    const { error: loansErr } = await supabase
      .from('loans')
      .delete()
      .in('book_id', seedBookIds);
    if (loansErr) warn(`Loans cleanup: ${loansErr.message}`);
    else log('Cleared seed loans');

    const { error: booksErr } = await supabase
      .from('books')
      .delete()
      .like('nfc_tag_id', 'SEED-%');
    if (booksErr) warn(`Books cleanup: ${booksErr.message}`);
    else log('Cleared seed books');
  } else {
    log('No existing seed books found');
  }

  const { error: userErr } = await supabase
    .from('users')
    .delete()
    .like('membership_id', 'SEED-%');
  if (userErr) warn(`Users cleanup: ${userErr.message}`);
  else log('Cleared seed users');
}

// ── Step 2: Books ─────────────────────────────────────
const BOOKS = [
  {
    nfc_tag_id:     'SEED-001',
    title:          'Dune',
    author:         'Frank Herbert',
    translator:     null,
    isbn:           '9780441013593',
    eisbn:          null,
    category:       'Fiction',
    shelf_location: 'A1',
    status:         'available',
    notes:          null,
  },
  {
    nfc_tag_id:     'SEED-002',
    title:          'Sapiens: A Brief History of Humankind',
    author:         'Yuval Noah Harari',
    translator:     null,
    isbn:           '9780062316097',
    eisbn:          null,
    category:       'History',
    shelf_location: 'B2',
    status:         'available',
    notes:          null,
  },
  {
    nfc_tag_id:     'SEED-003',
    title:          'Clean Code',
    author:         'Robert C. Martin',
    translator:     null,
    isbn:           '9780132350884',
    eisbn:          null,
    category:       'Technology',
    shelf_location: 'C1',
    status:         'available',
    notes:          'Classic software engineering reference.',
  },
  {
    nfc_tag_id:     'SEED-004',
    title:          'Meditations',
    author:         'Marcus Aurelius',
    translator:     'Gregory Hays',
    isbn:           '9780140449334',
    eisbn:          null,
    category:       'Philosophy',
    shelf_location: 'B1',
    status:         'available',
    notes:          null,
  },
  {
    nfc_tag_id:     'SEED-005',
    title:          'Atomic Habits',
    author:         'James Clear',
    translator:     null,
    isbn:           '9780735211292',
    eisbn:          null,
    category:       'Psychology',
    shelf_location: 'B3',
    status:         'available',
    notes:          null,
  },
  {
    nfc_tag_id:     'SEED-006',
    title:          'The Pragmatic Programmer',
    author:         'David Thomas',
    translator:     null,
    isbn:           '9780135957059',
    eisbn:          null,
    category:       'Technology',
    shelf_location: 'C2',
    status:         'available',
    notes:          null,
  },
  {
    nfc_tag_id:     'SEED-007',
    title:          'Zero to One',
    author:         'Peter Thiel',
    translator:     null,
    isbn:           '9780804139021',
    eisbn:          null,
    category:       'Business',
    shelf_location: 'E1',
    status:         'available',
    notes:          null,
  },
  {
    nfc_tag_id:     'SEED-008',
    title:          'Thinking, Fast and Slow',
    author:         'Daniel Kahneman',
    translator:     null,
    isbn:           '9780374533557',
    eisbn:          null,
    category:       'Psychology',
    shelf_location: 'B4',
    status:         'available',
    notes:          null,
  },
  {
    nfc_tag_id:     'SEED-009',
    title:          'A Brief History of Time',
    author:         'Stephen Hawking',
    translator:     null,
    isbn:           '9780553380163',
    eisbn:          null,
    category:       'Science',
    shelf_location: 'D1',
    status:         'available',
    notes:          null,
  },
  {
    nfc_tag_id:     'SEED-010',
    title:          'The Name of the Wind',
    author:         'Patrick Rothfuss',
    translator:     null,
    isbn:           '9780756404741',
    eisbn:          null,
    category:       'Fiction',
    shelf_location: 'A2',
    status:         'locked',
    notes:          'Reserved for in-library reading only.',
  },
];

// ── Step 3: Seed members ──────────────────────────────
const USERS = [
  {
    auth_id:       '00000000-0000-0000-0000-000000000001',
    full_name:     'Ali Yılmaz',
    email:         'ali.yilmaz.seed@irnc.net',
    phone:         '+90 555 111 0001',
    membership_id: 'SEED-M001',
    role:          'member',
    is_active:     true,
  },
  {
    auth_id:       '00000000-0000-0000-0000-000000000002',
    full_name:     'Sara Demir',
    email:         'sara.demir.seed@irnc.net',
    phone:         '+90 555 111 0002',
    membership_id: 'SEED-M002',
    role:          'member',
    is_active:     true,
  },
  {
    auth_id:       '00000000-0000-0000-0000-000000000003',
    full_name:     'Reza Ahmadi',
    email:         'reza.ahmadi.seed@irnc.net',
    phone:         '+98 912 111 0003',
    membership_id: 'SEED-M003',
    role:          'member',
    is_active:     true,
  },
  {
    auth_id:       '00000000-0000-0000-0000-000000000004',
    full_name:     'Nadia Karimi',
    email:         'nadia.karimi.seed@irnc.net',
    phone:         '+98 912 111 0004',
    membership_id: 'SEED-M004',
    role:          'member',
    is_active:     true,
  },
];

// ── Main ──────────────────────────────────────────────
async function main() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  IRNC Library — Seed Script');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const { error: pingError } = await supabase.from('books').select('id').limit(1);
  if (pingError) {
    err(`Cannot connect to Supabase: ${pingError.message}`);
    err('Check SUPABASE_URL and SUPABASE_SERVICE_KEY in backend/.env');
    process.exit(1);
  }
  log('Connected to Supabase');

  await cleanSeedData();

  // ── Insert books ───────────────────────────────────
  console.log('\n📚 Inserting books…');
  const { data: insertedBooks, error: booksErr } = await supabase
    .from('books')
    .insert(BOOKS)
    .select('id, nfc_tag_id, title, status');

  if (booksErr) {
    err(`Failed to insert books: ${booksErr.message}`);
    process.exit(1);
  }
  log(`Inserted ${insertedBooks.length} books`);

  const bookMap = {};
  insertedBooks.forEach(b => { bookMap[b.nfc_tag_id] = b; });

  // ── Insert users ───────────────────────────────────
  console.log('\n👥 Inserting seed members…');
  const { data: insertedUsers, error: usersErr } = await supabase
    .from('users')
    .insert(USERS)
    .select('id, membership_id, full_name');

  if (usersErr) {
    err(`Failed to insert users: ${usersErr.message}`);
    process.exit(1);
  }
  log(`Inserted ${insertedUsers.length} seed members`);

  const userMap = {};
  insertedUsers.forEach(u => { userMap[u.membership_id] = u; });

  // ── Insert loans ───────────────────────────────────
  // SEED-001 (Dune)       → OUT      checked out 5 days ago, due in 9 days
  // SEED-002 (Sapiens)    → OUT      checked out 3 days ago, due in 11 days
  // SEED-003 (Clean Code) → OUT      checked out 7 days ago, due in 7 days
  // SEED-004 (Meditations)→ OVERDUE  checked out 20 days ago, was due 6 days ago
  // SEED-005–009          → AVAILABLE (no loans)
  // SEED-010              → LOCKED   (no loan; status set directly on book)

  console.log('\n📋 Creating loans…');

  const LOANS = [
    {
      book_id:       bookMap['SEED-001'].id,
      user_id:       userMap['SEED-M001'].id,
      checkout_date: today(-5),
      due_date:      today(9),
      return_date:   null,
      status:        'out',
      notes:         null,
    },
    {
      book_id:       bookMap['SEED-002'].id,
      user_id:       userMap['SEED-M002'].id,
      checkout_date: today(-3),
      due_date:      today(11),
      return_date:   null,
      status:        'out',
      notes:         null,
    },
    {
      book_id:       bookMap['SEED-003'].id,
      user_id:       userMap['SEED-M003'].id,
      checkout_date: today(-7),
      due_date:      today(7),
      return_date:   null,
      status:        'out',
      notes:         null,
    },
    {
      book_id:       bookMap['SEED-004'].id,
      user_id:       userMap['SEED-M004'].id,
      checkout_date: today(-20),
      due_date:      today(-6),
      return_date:   null,
      status:        'overdue',
      notes:         'Borrower has been contacted.',
    },
  ];

  const { data: insertedLoans, error: loansErr } = await supabase
    .from('loans')
    .insert(LOANS)
    .select('id, status, book_id');

  if (loansErr) {
    err(`Failed to insert loans: ${loansErr.message}`);
    process.exit(1);
  }
  log(`Inserted ${insertedLoans.length} loans`);

  // ── Verify final book statuses ─────────────────────
  console.log('\n🔍 Verifying book statuses after trigger…');

  const { data: finalBooks, error: verifyErr } = await supabase
    .from('books')
    .select('nfc_tag_id, title, status')
    .like('nfc_tag_id', 'SEED-%')
    .order('nfc_tag_id');

  if (verifyErr) {
    warn(`Could not verify: ${verifyErr.message}`);
  } else {
    const statusCounts = { available: 0, out: 0, overdue: 0, locked: 0 };
    finalBooks.forEach(b => {
      statusCounts[b.status] = (statusCounts[b.status] || 0) + 1;
    });

    const expected = { available: 5, out: 3, overdue: 1, locked: 1 };
    let allCorrect = true;

    for (const [status, expectedCount] of Object.entries(expected)) {
      const actual = statusCounts[status] || 0;
      if (actual === expectedCount) {
        log(`${status}: ${actual} book(s) ✓`);
      } else {
        warn(`${status}: expected ${expectedCount}, got ${actual}`);
        allCorrect = false;
      }
    }

    if (!allCorrect) {
      warn('Some statuses are unexpected. The trigger may not be active.');
      warn('Check that trg_sync_book_status exists in Supabase.');
    }
  }

  // ── Summary ────────────────────────────────────────
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  ✅  Seed complete! Here is what was created:\n');

  console.log('  BOOKS:');
  console.log('    SEED-001  Dune                     → OUT        (Ali Yılmaz, due ' + today(9) + ')');
  console.log('    SEED-002  Sapiens                  → OUT        (Sara Demir, due ' + today(11) + ')');
  console.log('    SEED-003  Clean Code               → OUT        (Reza Ahmadi, due ' + today(7) + ')');
  console.log('    SEED-004  Meditations              → OVERDUE    (Nadia Karimi, was due ' + today(-6) + ')');
  console.log('    SEED-005  Atomic Habits            → AVAILABLE');
  console.log('    SEED-006  The Pragmatic Programmer → AVAILABLE');
  console.log('    SEED-007  Zero to One              → AVAILABLE');
  console.log('    SEED-008  Thinking, Fast and Slow  → AVAILABLE');
  console.log('    SEED-009  A Brief History of Time  → AVAILABLE');
  console.log('    SEED-010  The Name of the Wind     → LOCKED');

  console.log('\n  MEMBERS (no Supabase Auth login):');
  console.log('    SEED-M001  Ali Yılmaz');
  console.log('    SEED-M002  Sara Demir');
  console.log('    SEED-M003  Reza Ahmadi');
  console.log('    SEED-M004  Nadia Karimi');

  console.log('\n  To re-run:  node seed.js');
  console.log('  To clear:   re-run the script (cleans before inserting)');
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

main().catch(e => {
  console.error('\n  ✗  Seed failed:', e.message);
  process.exit(1);
});
