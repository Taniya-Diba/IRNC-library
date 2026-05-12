import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { stats as statsApi, loans as loansApi } from '../lib/api.js';
import { getCategoryColors } from '../lib/categoryColors.js';
import StatCard from '../components/ui/StatCard.jsx';
import toast from 'react-hot-toast';
import './AdminDashboard.css';

function fmt(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function daysOverdue(dueDate) {
  return Math.floor((Date.now() - new Date(dueDate)) / 86400000);
}

export default function AdminDashboard() {
  const { t } = useTranslation();
  const [data, setData]           = useState(null);
  const [overdue, setOverdue]     = useState([]);
  const [returning, setReturning] = useState({});
  const [loading, setLoading]     = useState(true);
  const [barsReady, setBarsReady] = useState(false);

  useEffect(() => {
    Promise.all([statsApi.get(), loansApi.overdue()])
      .then(([s, ov]) => {
        setData(s);
        setOverdue(Array.isArray(ov) ? ov : ov?.loans || []);
      })
      .catch(() => toast.error(t('errors.networkError')))
      .finally(() => setLoading(false));
  }, [t]);

  // Animate bars after data loads
  useEffect(() => {
    if (!data?.by_category?.length) return;
    const timer = setTimeout(() => setBarsReady(true), 120);
    return () => clearTimeout(timer);
  }, [data]);

  async function handleReturn(loanId) {
    setReturning(r => ({ ...r, [loanId]: true }));
    try {
      await loansApi.returnBook(loanId);
      setOverdue(ov => ov.filter(l => l.id !== loanId));
      if (data) setData(d => ({ ...d, overdue_count: Math.max(0, (d.overdue_count || 0) - 1) }));
      toast.success(t('admin.markReturned'));
    } catch {
      toast.error(t('errors.unknownError'));
    } finally {
      setReturning(r => ({ ...r, [loanId]: false }));
    }
  }

  // Sort categories by count descending
  const categoryBreakdown = [...(data?.by_category || [])].sort((a, b) => (b.count || 0) - (a.count || 0));
  const maxCatCount = Math.max(...categoryBreakdown.map(c => c.count || 0), 1);

  const lockedCount = data?.locked_books ?? data?.books_locked ?? 0;

  return (
    <div className="page-content">
      <div className="container">
        <div className="admin-page-header">
          <h1>{t('admin.dashboard')}</h1>
          <div className="admin-quick-actions">
            <Link to="/admin/books" className="btn btn-primary btn-sm">{t('admin.addBook')}</Link>
            <Link to="/admin/loans" className="btn btn-secondary btn-sm">{t('admin.viewAllLoans')}</Link>
          </div>
        </div>

        {/* Stat cards */}
        {loading ? (
          <div className="admin-stats-grid">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="skeleton" style={{ height: 90, borderRadius: 18 }} />
            ))}
          </div>
        ) : (
          <div className="admin-stats-grid">
            <StatCard label={t('admin.totalBooks')} value={data?.total_books}     color="blue"   />
            <StatCard label={t('admin.available')}  value={data?.books_available} color="green"  />
            <StatCard label={t('admin.checkedOut')} value={data?.books_out}       color="amber"  />
            <StatCard label={t('admin.overdue')}    value={data?.overdue_count}   color="red"    />
            <StatCard label={t('admin.locked')}     value={lockedCount}           color="purple" />
          </div>
        )}

        {/* Overdue section */}
        <div className="glass admin-section">
          <div className="admin-section-header">
            <h3>
              {t('admin.overdueSection')}
              {overdue.length > 0 && (
                <span className="admin-overdue-count">{overdue.length}</span>
              )}
            </h3>
          </div>
          {overdue.length === 0 ? (
            <div className="admin-all-good">
              <span>✓</span>
              <p>{t('admin.allGood')}</p>
            </div>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>{t('admin.colBook')}</th>
                    <th className="col-hide-mobile">{t('admin.colBorrower')}</th>
                    <th className="col-hide-mobile">{t('admin.colMemberId')}</th>
                    <th className="col-hide-mobile">{t('admin.colPhone')}</th>
                    <th>{t('admin.colDue')}</th>
                    <th>{t('admin.colAction')}</th>
                  </tr>
                </thead>
                <tbody>
                  {overdue.map(loan => {
                    const days = daysOverdue(loan.due_date);
                    const bookColors = getCategoryColors(loan.book?.category);
                    return (
                      <tr key={loan.id}>
                        <td>
                          <div className="overdue-book-cell">
                            <span
                              className="admin-cat-dot"
                              style={{ background: bookColors.from }}
                            />
                            <div>
                              <Link to={`/book/${loan.book_id}`} className="admin-book-link">
                                {loan.book?.title || '—'}
                              </Link>
                              <div className="overdue-borrower-mobile col-show-mobile">
                                <strong>{loan.user?.full_name || loan.borrower_name || '—'}</strong>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="col-hide-mobile">
                          <strong>{loan.user?.full_name || loan.borrower_name || '—'}</strong>
                        </td>
                        <td className="col-hide-mobile">
                          <span className="member-id-chip">
                            {loan.user?.membership_id || '—'}
                          </span>
                        </td>
                        <td className="col-hide-mobile">
                          {loan.user?.phone || '—'}
                        </td>
                        <td>
                          <div className="overdue-date-cell">
                            <span className="admin-overdue-date">{fmt(loan.due_date)}</span>
                            {days > 0 && (
                              <span className="overdue-days-badge">
                                {days} {t('admin.daysOverdue')}
                              </span>
                            )}
                          </div>
                        </td>
                        <td>
                          <button
                            className="btn btn-sm btn-success"
                            disabled={returning[loan.id]}
                            onClick={() => handleReturn(loan.id)}
                          >
                            {returning[loan.id]
                              ? <><span className="spinner" style={{ width: 12, height: 12 }} />{t('admin.returning')}</>
                              : t('admin.markReturned')
                            }
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Category breakdown */}
        {categoryBreakdown.length > 0 && (
          <div className="glass admin-section">
            <h3>{t('admin.byCategory')}</h3>
            <div className="admin-category-bars">
              {categoryBreakdown.map(cat => {
                const colors = getCategoryColors(cat.category);
                const pct = Math.round((cat.count / maxCatCount) * 100);
                return (
                  <div key={cat.category} className="admin-cat-row">
                    <span className="admin-cat-name">{cat.category}</span>
                    <div className="admin-cat-bar-wrap">
                      <div
                        className="admin-cat-bar"
                        style={{
                          width: barsReady ? `${pct}%` : '0%',
                          background: `linear-gradient(90deg, ${colors.from}BF, ${colors.to}BF)`,
                        }}
                      />
                    </div>
                    <span
                      className="admin-cat-count"
                      style={{ color: colors.from }}
                    >
                      {cat.count}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
