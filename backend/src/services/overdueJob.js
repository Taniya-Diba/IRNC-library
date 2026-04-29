import cron from 'node-cron';
import { supabaseAdmin } from '../db/supabase.js';

async function checkOverdue() {
  const today = new Date().toISOString().slice(0, 10);

  const { data: overdueLoans, error } = await supabaseAdmin
    .from('loans')
    .select('id, due_date, books(title, author), users(full_name, phone, email, membership_id)')
    .eq('status', 'out')
    .lt('due_date', today);

  if (error) { console.error('Overdue check error:', error); return; }
  if (!overdueLoans?.length) return;

  const ids = overdueLoans.map(l => l.id);
  await supabaseAdmin.from('loans').update({ status: 'overdue' }).in('id', ids);

  if (process.env.RESEND_API_KEY) {
    await sendOverdueEmail(overdueLoans);
  } else {
    console.log(`[OVERDUE] ${overdueLoans.length} overdue book(s):`,
      overdueLoans.map(l => `${l.books.title} → ${l.users.full_name}`)
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
        <td style="padding:8px 12px;border-bottom:1px solid #eee">${l.users.full_name}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee">${l.users.membership_id || '—'}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee">${l.users.phone || '—'}</td>
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
              <th style="padding:8px 12px;text-align:left">Membership ID</th>
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
