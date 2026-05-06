import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { loans as loansApi } from '../lib/api.js';
import toast from 'react-hot-toast';
import './AdminLoans.css';

function fmt(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

const TABS = ['all', 'out', 'overdue', 'returned'];

export default function AdminLoans() {
  const { t } = useTranslation();
  const [tab, setTab]         = useState('all');
  const [loans, setLoans]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [returning, setReturning] = useState({});

  useEffect(() => { load(); }, [tab]);

  async function load() {
    setLoading(true);
    try {
      const params = tab !== 'all' ? { status: tab } : {};
      const d = await loansApi.list(params);
      setLoans(Array.isArray(d) ? d : d?.loans || []);
    } catch {
      toast.error(t('errors.networkError'));
    } finally {
      setLoading(false);
    }
  }

  async function handleReturn(loanId) {
    setReturning(r => ({ ...r, [loanId]: true }));
    try {
      await loansApi.returnBook(loanId);
      setLoans(ls => ls.map(l => l.id === loanId ? { ...l, status: 'returned', return_date: new Date().toISOString() } : l));
      toast.success(t('admin.markReturned'));
    } catch {
      toast.error(t('errors.unknownError'));
    } finally {
      setReturning(r => ({ ...r, [loanId]: false }));
    }
  }

  const TAB_KEYS = {
    all: 'admin.tabAll', out: 'admin.tabOut',
    overdue: 'admin.tabOverdue', returned: 'admin.tabReturned'
  };

  return (
    <div className="page-content">
      <div className="container">
        <h1 style={{ marginBottom: 24 }}>{t('admin.loansPage')}</h1>

        {/* Tab bar */}
        <div className="loans-tab-bar">
          {TABS.map(tb => (
            <button
              key={tb}
              className={`btn btn-sm ${tab === tb ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setTab(tb)}
            >
              {t(TAB_KEYS[tb])}
            </button>
          ))}
        </div>

        <div className="glass admin-section loans-table-section">
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}>
              <div className="spinner" style={{ width: 32, height: 32 }} />
            </div>
          ) : loans.length === 0 ? (
            <div className="empty-state" style={{ padding: '32px 0' }}>
              <div className="empty-state-icon">📋</div>
              <p>{t('common.noResults')}</p>
            </div>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>{t('admin.colBook')}</th>
                    <th>{t('admin.colBorrower')}</th>
                    <th>{t('admin.colMemberId')}</th>
                    <th>{t('admin.colPhone')}</th>
                    <th>{t('admin.colCheckedOut')}</th>
                    <th>{t('admin.colDue')}</th>
                    <th>{t('admin.colReturned')}</th>
                    <th>{t('admin.colStatus')}</th>
                    <th>{t('admin.colAction')}</th>
                  </tr>
                </thead>
                <tbody>
                  {loans.map(loan => (
                    <tr
                      key={loan.id}
                      className={loan.status === 'overdue' ? 'loan-overdue-row' : ''}
                    >
                      <td>{loan.book?.title || '—'}</td>
                      <td>{loan.user?.full_name || loan.borrower_name || '—'}</td>
                      <td>{loan.user?.membership_id || '—'}</td>
                      <td>{loan.user?.phone || '—'}</td>
                      <td>{fmt(loan.checkout_date || loan.created_at)}</td>
                      <td>{fmt(loan.due_date)}</td>
                      <td>{fmt(loan.return_date)}</td>
                      <td><span className={`badge badge-${loan.status}`}>{t(`status.${loan.status}`)}</span></td>
                      <td>
                        {(loan.status === 'out' || loan.status === 'overdue') && (
                          <button
                            className="btn btn-sm btn-secondary"
                            disabled={returning[loan.id]}
                            onClick={() => handleReturn(loan.id)}
                          >
                            {returning[loan.id]
                              ? <><span className="spinner" />{t('admin.returning')}</>
                              : t('admin.return')
                            }
                          </button>
                        )}
                      </td>
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
