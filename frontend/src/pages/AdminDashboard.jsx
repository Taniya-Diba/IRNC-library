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

export default function AdminDashboard() {
  const { t } = useTranslation();
  const [data, setData]         = useState(null);
  const [overdue, setOverdue]   = useState([]);
  const [returning, setReturning] = useState({});
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    Promise.all([statsApi.get(), loansApi.overdue()])
      .then(([s, ov]) => {
        setData(s);
        setOverdue(Array.isArray(ov) ? ov : ov?.loans || []);
      })
      .catch(() => toast.error(t('errors.networkError')))
      .finally(() => setLoading(false));
  }, []);

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

  const categoryBreakdown = data?.by_category || [];
  const maxCatCount = Math.max(...categoryBreakdown.map(c => c.count || 0), 1);

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
            {[1,2,3,4,5].map(i => <div key={i} className="skeleton" style={{ height: 90, borderRadius: 18 }} />)}
          </div>
        ) : (
          <div className="admin-stats-grid">
            <StatCard label={t('admin.totalBooks')}  value={data?.total_books}      color="blue"   />
            <StatCard label={t('admin.available')}   value={data?.books_available}  color="green"  />
            <StatCard label={t('admin.checkedOut')}  value={data?.books_out}        color="amber"  />
            <StatCard label={t('admin.overdue')}     value={data?.overdue_count}    color="red"    />
            <StatCard label={t('admin.locked')}      value={data?.locked_books}     color="purple" />
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
                    <th>{t('admin.colAuthor')}</th>
                    <th>{t('admin.colBorrower')}</th>
                    <th>{t('admin.colMemberId')}</th>
                    <th>{t('admin.colPhone')}</th>
                    <th>{t('admin.colDue')}</th>
                    <th>{t('admin.colAction')}</th>
                  </tr>
                </thead>
                <tbody>
                  {overdue.map(loan => (
                    <tr key={loan.id} className="admin-overdue-row">
                      <td><Link to={`/book/${loan.book_id}`} className="admin-book-link">{loan.book?.title || '—'}</Link></td>
                      <td>{loan.book?.author || '—'}</td>
                      <td>{loan.user?.full_name || loan.borrower_name || '—'}</td>
                      <td>{loan.user?.membership_id || '—'}</td>
                      <td>{loan.user?.phone || '—'}</td>
                      <td className="admin-overdue-date">{fmt(loan.due_date)}</td>
                      <td>
                        <button
                          className="btn btn-sm btn-secondary"
                          disabled={returning[loan.id]}
                          onClick={() => handleReturn(loan.id)}
                        >
                          {returning[loan.id] ? <><span className="spinner" />{t('admin.returning')}</> : t('admin.markReturned')}
                        </button>
                      </td>
                    </tr>
                  ))}
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
                        style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${colors.from}, ${colors.to})` }}
                      />
                    </div>
                    <span className="admin-cat-count">{cat.count}</span>
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
