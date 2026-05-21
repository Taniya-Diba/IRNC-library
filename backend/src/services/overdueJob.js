import cron from 'node-cron';
import { supabaseAdmin } from '../db/supabase.js';
import { sendOverdueEmailToAdmin, sendOverdueReminderToMember } from './emailService.js';

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
    // Admin summary email
    try {
      await sendOverdueEmailToAdmin(overdueLoans);
      console.log(`[OVERDUE] Admin email sent for ${overdueLoans.length} book(s)`);
    } catch (err) {
      console.error('[OVERDUE] Admin email failed:', err.message);
    }

    // Per-borrower reminder emails — each wrapped individually so one failure doesn't block others
    for (const loan of overdueLoans) {
      try {
        await sendOverdueReminderToMember(loan);
      } catch (err) {
        console.warn(`[OVERDUE] Reminder to ${loan.users?.email || 'unknown'} failed:`, err.message);
      }
    }
  } else {
    console.log(`[OVERDUE] ${overdueLoans.length} overdue book(s):`,
      overdueLoans.map(l => `${l.books.title} → ${l.users.full_name}`)
    );
  }
}

export function startOverdueCron() {
  cron.schedule('0 8 * * *', async () => {
    console.log('[CRON] Running overdue check...');
    try {
      await checkOverdue();
    } catch (err) {
      console.error('[CRON] Overdue job crashed:', err.message);
    }
  });
  console.log('[CRON] Overdue job scheduled (daily 08:00)');
}

// Allow running directly: node src/services/overdueJob.js
if (process.argv[1].includes('overdueJob')) {
  import('dotenv/config').then(() => checkOverdue());
}
