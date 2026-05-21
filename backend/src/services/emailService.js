/**
 * IRNC Library — Email Service
 *
 * Emails sent by this system:
 *
 * 1. Welcome email
 *    Trigger: successful user registration
 *    To: new member
 *    Contains: membership ID, catalogue link
 *
 * 2. Daily overdue alert
 *    Trigger: cron job at 08:00 daily
 *    To: admin (ADMIN_EMAIL in .env)
 *    Contains: list of all overdue books + borrower contacts
 *
 * 3. Overdue reminder to borrower
 *    Trigger: same cron job at 08:00 daily
 *    To: each borrower with an overdue book (if email on file)
 *    Contains: book title, due date, days overdue
 *
 * 4. Password reset
 *    Trigger: POST /api/auth/forgot-password
 *    To: the requesting email address
 *    Sent by: Supabase Auth automatically (not this service)
 *    Contains: reset link valid for 1 hour
 */

import { Resend } from 'resend';

let resend;
function getResend() {
  if (!resend) resend = new Resend(process.env.RESEND_API_KEY);
  return resend;
}

export async function sendWelcomeEmail(user) {
  const r = getResend();
  await r.emails.send({
    from:    'IRNC Library <library@irnc.net>',
    to:      user.email,
    subject: 'Welcome to IRNC Library',
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;">
        <h1 style="font-size:22px;color:#1a1625;margin-bottom:8px;">
          Welcome, ${user.full_name}!
        </h1>
        <p style="color:#6b6585;font-size:15px;line-height:1.6;">
          Your IRNC Library account has been created successfully.
        </p>
        <div style="background:#f0ebff;border-radius:10px;padding:16px 20px;margin:24px 0;">
          <p style="margin:0;font-size:13px;color:#6b6585;">Your membership ID</p>
          <p style="margin:6px 0 0;font-size:20px;font-weight:700;
                    color:#6C47FF;font-family:monospace;">
            ${user.membership_id}
          </p>
        </div>
        <p style="color:#6b6585;font-size:14px;line-height:1.6;">
          To borrow a book, scan the QR code on its back cover with your phone,
          or browse the full catalogue at the link below.
        </p>
        <a href="${process.env.FRONTEND_URL}"
           style="display:inline-block;margin-top:20px;padding:12px 24px;
                  background:#6C47FF;color:#fff;border-radius:999px;
                  text-decoration:none;font-size:14px;font-weight:600;">
          Browse the catalogue →
        </a>
        <p style="margin-top:32px;font-size:12px;color:#9e9b93;">
          IRNC Library · ${process.env.FRONTEND_URL}
        </p>
      </div>
    `
  });
}

export async function sendOverdueEmailToAdmin(loans) {
  const r = getResend();

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

  await r.emails.send({
    from:    'IRNC Library <library@irnc.net>',
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
}

export async function sendOverdueReminderToMember(loan) {
  if (!loan.users?.email) return;
  const r = getResend();
  const daysOverdue = Math.floor(
    (Date.now() - new Date(loan.due_date)) / 86400000
  );
  await r.emails.send({
    from:    'IRNC Library <library@irnc.net>',
    to:      loan.users.email,
    subject: `Overdue book reminder — ${loan.books.title}`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;">
        <h1 style="font-size:20px;color:#1a1625;">
          Your borrowed book is overdue
        </h1>
        <p style="color:#6b6585;font-size:15px;line-height:1.6;">
          Hi ${loan.users.full_name},
        </p>
        <p style="color:#6b6585;font-size:15px;line-height:1.6;">
          The following book was due <strong>${daysOverdue} day${daysOverdue !== 1 ? 's' : ''} ago</strong>
          and has not yet been returned:
        </p>
        <div style="background:#fffbeb;border:1px solid #fde68a;
                    border-radius:10px;padding:16px 20px;margin:20px 0;">
          <p style="margin:0;font-size:16px;font-weight:700;color:#1a1625;">
            ${loan.books.title}
          </p>
          <p style="margin:6px 0 0;font-size:14px;color:#6b6585;">
            by ${loan.books.author}
          </p>
          <p style="margin:10px 0 0;font-size:13px;color:#92400e;">
            Was due: ${new Date(loan.due_date).toLocaleDateString('en-GB', {
              day:'numeric', month:'long', year:'numeric'
            })}
          </p>
        </div>
        <p style="color:#6b6585;font-size:14px;line-height:1.6;">
          Please return the book to the library at your earliest convenience.
        </p>
        <a href="${process.env.FRONTEND_URL}"
           style="display:inline-block;margin-top:16px;padding:12px 24px;
                  background:#6C47FF;color:#fff;border-radius:999px;
                  text-decoration:none;font-size:14px;font-weight:600;">
          Visit the library →
        </a>
      </div>
    `
  });
}
