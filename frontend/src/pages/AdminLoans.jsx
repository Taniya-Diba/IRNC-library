import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { loans as loansApi } from '../lib/api.js';
import toast from 'react-hot-toast';
import './AdminLoans.css';

const STATUS_TABS = ['all', 'out', 'overdue', 'returned'];

export default function AdminLoans() {
  const [loanList, setLoanList]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [returning, setReturning] = useState(null);

  async function load(status = '') {
    setLoading(true);
    try {
      const params = status && status !== 'all' ? { status } : {};
      const data = await loansApi.list(params);
      setLoanList(data);
    } catch (err) {
      toast.error('Failed to load loans');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(activeTab); }, [activeTab]);

  async function handleReturn(loan) {
    setReturning(loan.id);
    try {
      await loansApi.returnBook(loan.id);
      toast.success(`"${loan.books?.title}" marked as returned`);
      load(activeTab);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setReturning(null);
    }
  }

  const fmt = (d) => d
    ? new Date(d).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' })
    : '—';

  const isOverdue = (loan) =>
    loan.status === 'out' && loan.due_date && new Date(loan.due_date) < new Date();

  return (
    <main className="page-content">
      <div className="container">
        <div className="loans-header">
          <h1>All loans</h1>
        </div>

        <div className="loans-tabs">
          {STATUS_TABS.map(tab => (
            <button
              key={tab}
              className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ display:'flex', justifyContent:'center', paddingTop: 60 }}>
            <div className="spinner" />
          </div>
        ) : loanList.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📋</div>
            <h3>No loans found</h3>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="loans-table">
              <thead>
                <tr>
                  <th>Book</th>
                  <th>Borrower</th>
                  <th>Phone</th>
                  <th>Checked out</th>
                  <th>Due</th>
                  <th>Returned</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {loanList.map(loan => (
                  <tr key={loan.id} className={isOverdue(loan) ? 'row-overdue' : ''}>
                    <td>
                      <Link to={`/book/${loan.book_id}`} className="table-link">
                        {loan.books?.title || '—'}
                      </Link>
                    </td>
                    <td>{loan.borrowers?.name || '—'}</td>
                    <td>{loan.borrowers?.phone || '—'}</td>
                    <td>{fmt(loan.checkout_date)}</td>
                    <td className={isOverdue(loan) ? 'overdue-cell' : ''}>
                      {fmt(loan.due_date)}
                    </td>
                    <td>{fmt(loan.return_date)}</td>
                    <td>
                      <span className={`badge badge-${isOverdue(loan) ? 'overdue' : loan.status}`}>
                        {isOverdue(loan) ? 'overdue' : loan.status}
                      </span>
                    </td>
                    <td>
                      {(loan.status === 'out' || loan.status === 'overdue') && (
                        <button
                          className="btn btn-success btn-sm"
                          onClick={() => handleReturn(loan)}
                          disabled={returning === loan.id}
                        >
                          {returning === loan.id
                            ? <span className="spinner" style={{width:13,height:13}} />
                            : 'Return'}
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
    </main>
  );
}
