import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { stats as statsApi, loans as loansApi } from '../lib/api.js';
import StatCard from '../components/ui/StatCard.jsx';
import toast    from 'react-hot-toast';
import './AdminDashboard.css';

function OverdueRow({ loan, onReturn }) {
  const [loading, setLoading] = useState(false);

  async function handleReturn() {
    setLoading(true);
    try {
      await loansApi.returnBook(loan.loan_id);
      toast.success(`"${loan.title}" marked as returned`);
      onReturn();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  const daysPast = loan.due_date
    ? Math.floor((Date.now() - new Date(loan.due_date)) / 86400000)
    : null;

  return (
    <tr>
      <td>
        <Link to={`/book/${loan.book_id}`} className="table-link">{loan.title}</Link>
      </td>
      <td>{loan.author}</td>
      <td>{loan.borrower_name}</td>
      <td>{loan.borrower_phone || '—'}</td>
      <td>
        <span className="overdue-days">
          {loan.due_date ? new Date(loan.due_date).toLocaleDateString('en-GB') : '—'}
          {daysPast > 0 && <span className="days-past"> ({daysPast}d overdue)</span>}
        </span>
      </td>
      <td>
        <button
          className="btn btn-success btn-sm"
          onClick={handleReturn}
          disabled={loading}
        >
          {loading ? <span className="spinner" style={{width:13,height:13}} /> : 'Mark returned'}
        </button>
      </td>
    </tr>
  );
}

export default function AdminDashboard() {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const s = await statsApi.get();
      setData(s);
    } catch (err) {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  if (loading) return (
    <main className="page-content">
      <div className="container" style={{ display:'flex', justifyContent:'center', paddingTop: 60 }}>
        <div className="spinner" />
      </div>
    </main>
  );

  const genres = Object.entries(data?.genre_breakdown || {})
    .sort((a, b) => b[1] - a[1]);

  return (
    <main className="page-content">
      <div className="container">
        <div className="dash-header">
          <h1>Dashboard</h1>
          <div className="dash-actions">
            <Link to="/admin/books" className="btn btn-primary">+ Add book</Link>
            <Link to="/admin/loans" className="btn btn-secondary">View all loans</Link>
          </div>
        </div>

        {/* Stats grid */}
        <div className="stats-grid">
          <StatCard label="Total books"     value={data?.total_books}     icon="📚" color="blue" />
          <StatCard label="Books available" value={data?.books_in}        icon="✓"  color="green" />
          <StatCard label="Checked out"     value={data?.books_out}       icon="↗"  color="amber" />
          <StatCard label="Overdue"         value={data?.overdue_count}   icon="⚠" color="red" />
        </div>

        <div className="dash-grid">
          {/* Overdue books */}
          <section className="dash-section">
            <h2>
              Overdue books
              {data?.overdue_count > 0 && (
                <span className="overdue-badge">{data.overdue_count}</span>
              )}
            </h2>
            {data?.overdue_loans?.length === 0 ? (
              <div className="empty-state" style={{ padding: '32px 0' }}>
                <div className="empty-state-icon" style={{fontSize:32}}>✓</div>
                <p style={{color:'var(--color-success)',fontWeight:600}}>No overdue books</p>
              </div>
            ) : (
              <div className="table-wrap">
                <table className="loan-table">
                  <thead>
                    <tr>
                      <th>Book</th>
                      <th>Author</th>
                      <th>Borrower</th>
                      <th>Phone</th>
                      <th>Due date</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.overdue_loans.map(loan => (
                      <OverdueRow key={loan.loan_id} loan={loan} onReturn={load} />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Genre breakdown */}
          <section className="dash-section genre-section">
            <h2>Collection by genre</h2>
            <div className="genre-list">
              {genres.map(([genre, count]) => (
                <div key={genre} className="genre-row">
                  <span className="genre-name">{genre}</span>
                  <div className="genre-bar-wrap">
                    <div
                      className="genre-bar"
                      style={{ width: `${(count / (data?.total_books || 1)) * 100}%` }}
                    />
                  </div>
                  <span className="genre-count">{count}</span>
                </div>
              ))}
            </div>
          </section>
        </div>

      </div>
    </main>
  );
}
