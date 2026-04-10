import cron from 'node-cron';
import supabase from '../db/supabase.js';

async function checkOverdue() {
  const today = new Date().toISOString().slice(0, 10);

  // Find loans that are past due but still marked 'out'
  const { data: overdueLoans, error } = await supabase
    .from('loans')
    .select('id, due_date, books(title, author), borrowers(name, phone, email)')
    .eq('status', 'out')
    .lt('due_date', today);

  if (error) { console.error('Overdue check error:', error); return; }
  if (!overdueLoans?.length) return;

  // Update status to 'overdue'
  const ids = overdueLoans.map(l => l.id);
  await supabase.from('loans').update({ status: 'overdue' }).in('id', ids);

  // Send email summary if RESEND_API_KEY is set
  if (process.env.RESEND_API_KEY) {
    await sendOverdueEmail(overdueLoans);
  } else {
    console.log(`[OVERDUE] ${overdueLoans.length} overdue book(s):`,
      overdueLoans.map(l => `${l.books.title} → ${l.borrowers.name}`)
    );
  }
}

async function sendOverdueEmail(loans) {
  try {
    const { Resend } = await import('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);

    const rows = loans.map(l =>
      `<tr>
        <td style="padding:8px 12px;border-bottom:1px solid #eee">${l.books.title}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee">${l.books.author}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee">${l.borrowers.name}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee">${l.borrowers.phone || '—'}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee">${l.due_date}</td>
      </tr>`
    ).join('');

    await resend.emails.send({
      from:    'library@irnc.net',
      to:      process.env.ADMIN_EMAIL,
      subject: `Library: ${loans.length} overdue book${loans.length > 1 ? 's' : ''}`,
      html: `
        <h2 style="font-family:sans-serif">Overdue Books — ${new Date().toDateString()}</h2>
        <table style="border-collapse:collapse;font-family:sans-serif;font-size:14px">
          <thead>
            <tr style="background:#f5f5f5">
              <th style="padding:8px 12px;text-align:left">Title</th>
              <th style="padding:8px 12px;text-align:left">Author</th>
              <th style="padding:8px 12px;text-align:left">Borrower</th>
              <th style="padding:8px 12px;text-align:left">Phone</th>
              <th style="padding:8px 12px;text-align:left">Due date</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      `,
    });
    console.log(`[OVERDUE] Email sent for ${loans.length} book(s)`);
  } catch (err) {
    console.error('[OVERDUE] Email failed:', err.message);
  }
}

export function startOverdueCron() {
  // Runs every day at 08:00
  cron.schedule('0 8 * * *', () => {
    console.log('[CRON] Running overdue check...');
    checkOverdue();
  });
  console.log('[CRON] Overdue job scheduled (daily 08:00)');
}

// Allow running directly: node src/services/overdueJob.js
if (process.argv[1].includes('overdueJob')) {
  import('dotenv/config').then(() => checkOverdue());
}
