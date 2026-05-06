import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth.jsx';
import { users as usersApi } from '../lib/api.js';
import { getCategoryGradient } from '../lib/categoryColors.js';
import './UserProfilePage.css';

function fmt(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function initials(name) {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

export default function UserProfilePage() {
  const { t } = useTranslation();
  const { user } = useAuth();

  const [loans, setLoans]       = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    usersApi.getLoans(user.id)
      .then(data => setLoans(Array.isArray(data) ? data : data?.loans || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  const activeLoans  = loans.filter(l => l.status === 'out' || l.status === 'overdue');
  const historyLoans = [...loans].sort((a, b) => new Date(b.checkout_date || b.created_at) - new Date(a.checkout_date || a.created_at));

  return (
    <div className="page-content">
      <div className="container">
        <h1 className="profile-page-title">{t('profile.title')}</h1>

        {/* Account details */}
        <div className="glass profile-account-card">
          <div className="profile-avatar" style={{ background: 'linear-gradient(135deg, #6C47FF, #A78BFA)' }}>
            {initials(user?.full_name)}
          </div>
          <div className="profile-account-info">
            <h2>{user?.full_name}</h2>
            <div className="profile-detail-rows">
              <div className="profile-detail-row">
                <span className="profile-detail-label">{t('profile.membershipId')}</span>
                <span className="profile-membership-chip">{user?.membership_id || '—'}</span>
              </div>
              <div className="profile-detail-row">
                <span className="profile-detail-label">{t('profile.memberSince')}</span>
                <span className="profile-detail-value">{fmt(user?.created_at)}</span>
              </div>
              <div className="profile-detail-row">
                <span className="profile-detail-label">{t('profile.email')}</span>
                <span className="profile-detail-value">{user?.email}</span>
              </div>
              {user?.phone && (
                <div className="profile-detail-row">
                  <span className="profile-detail-label">{t('profile.phone')}</span>
                  <span className="profile-detail-value">{user.phone}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Active loans */}
        <div className="glass profile-section">
          <h3>{t('profile.activeLoans')} {activeLoans.length > 0 && <span className="profile-count-badge">{activeLoans.length}</span>}</h3>
          {loading ? (
            <div className="profile-loading"><div className="spinner" /></div>
          ) : activeLoans.length === 0 ? (
            <div className="empty-state" style={{ padding: '32px 0' }}>
              <div className="empty-state-icon">📖</div>
              <p>{t('profile.noActiveLoans')}</p>
            </div>
          ) : (
            <div className="profile-active-loans">
              {activeLoans.map(loan => (
                <div key={loan.id} className="glass profile-loan-row">
                  <div
                    className="profile-loan-cover"
                    style={{ background: getCategoryGradient(loan.book?.category || '') }}
                  >
                    {loan.book?.cover_image_url
                      ? <img src={loan.book.cover_image_url} alt={loan.book?.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: '1rem', fontWeight: 700 }}>{loan.book?.title?.charAt(0)}</span>
                    }
                  </div>
                  <div className="profile-loan-info">
                    <p className="profile-loan-title">{loan.book?.title || '—'}</p>
                    <p className="profile-loan-author">{loan.book?.author || '—'}</p>
                    <div className="profile-loan-meta">
                      <span className={`badge badge-${loan.status}`}>{t(`status.${loan.status}`)}</span>
                      <span className="profile-loan-due">{t('profile.dueOn')}: {fmt(loan.due_date)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Loan history */}
        <div className="glass profile-section">
          <h3>{t('profile.loanHistory')}</h3>
          {loading ? (
            <div className="profile-loading"><div className="spinner" /></div>
          ) : historyLoans.length === 0 ? (
            <div className="empty-state" style={{ padding: '32px 0' }}>
              <div className="empty-state-icon">📚</div>
              <p>{t('profile.noHistory')}</p>
            </div>
          ) : (
            <div className="profile-history-table-wrap">
              <table className="profile-history-table">
                <thead>
                  <tr>
                    <th>{t('admin.colTitle')}</th>
                    <th>{t('admin.colAuthor')}</th>
                    <th>{t('admin.colCheckedOut')}</th>
                    <th>{t('admin.colDue')}</th>
                    <th>{t('admin.colReturned')}</th>
                    <th>{t('admin.colStatus')}</th>
                  </tr>
                </thead>
                <tbody>
                  {historyLoans.map(loan => (
                    <tr key={loan.id}>
                      <td>{loan.book?.title || '—'}</td>
                      <td>{loan.book?.author || '—'}</td>
                      <td>{fmt(loan.checkout_date || loan.created_at)}</td>
                      <td>{fmt(loan.due_date)}</td>
                      <td>{fmt(loan.return_date)}</td>
                      <td><span className={`badge badge-${loan.status}`}>{t(`status.${loan.status}`)}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
