import { useState, useEffect } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { books as booksApi, loans as loansApi } from '../lib/api.js';
import './BookPage.css';

function LoanRow({ loan }) {
  const date = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' }) : '—';
  return (
    <tr>
      <td>{loan.borrowers?.name || '—'}</td>
      <td>{date(loan.checkout_date)}</td>
      <td>{date(loan.due_date)}</td>
      <td>{date(loan.return_date)}</td>
      <td><span className={`badge badge-${loan.status}`}>{loan.status}</span></td>
    </tr>
  );
}

export default function BookPage() {
  const { id }              = useParams();
  const [searchParams]      = useSearchParams();
  const nfcId               = searchParams.get('nfc');

  const [book, setBook]     = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const bookData = nfcId
          ? await booksApi.getByNfc(nfcId)
          : await booksApi.getById(id);
        setBook(bookData);

        const loanData = await loansApi.forBook(bookData.id);
        setHistory(loanData);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id, nfcId]);

  if (loading) return (
    <main className="page-content">
      <div className="container book-page-skeleton">
        <div className="skeleton-cover" />
        <div className="skeleton-info">
          <div className="skeleton-line w60" />
          <div className="skeleton-line w40" />
          <div className="skeleton-line w80" />
        </div>
      </div>
    </main>
  );

  if (error || !book) return (
    <main className="page-content">
      <div className="container">
        <div className="empty-state">
          <div className="empty-state-icon">🔍</div>
          <h3>Book not found</h3>
          <p>{error || 'This book does not exist in the library.'}</p>
          <Link to="/" className="btn btn-primary" style={{ marginTop: 16 }}>Back to catalogue</Link>
        </div>
      </div>
    </main>
  );

  const activeLoan = history.find(l => l.status === 'out' || l.status === 'overdue');
  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day:'numeric', month:'long', year:'numeric' }) : null;

  return (
    <main className="page-content">
      <div className="container">

        <Link to="/" className="back-link">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m15 18-6-6 6-6"/>
          </svg>
          Back to catalogue
        </Link>

        <div className="book-detail">
          {/* Cover */}
          <div className="book-detail-cover">
            {book.cover_url ? (
              <img src={book.cover_url} alt={book.title} />
            ) : (
              <div className="book-detail-cover-placeholder">
                <span>{book.title.charAt(0)}</span>
              </div>
            )}
          </div>

          {/* Info */}
          <div className="book-detail-info">
            <div className="book-detail-meta">
              {book.genre && <span className="book-genre-pill">{book.genre}</span>}
              <span className={`badge badge-${book.status}`}>
                {book.status === 'in' ? 'Available' : book.status === 'overdue' ? 'Overdue' : 'Checked out'}
              </span>
            </div>

            <h1 className="book-detail-title">{book.title}</h1>
            <p className="book-detail-author">by {book.author}</p>

            <dl className="book-detail-facts">
              {book.isbn && (
                <><dt>ISBN</dt><dd>{book.isbn}</dd></>
              )}
              {book.shelf_location && (
                <><dt>Shelf</dt><dd>{book.shelf_location}</dd></>
              )}
              {book.added_date && (
                <><dt>Added</dt><dd>{formatDate(book.added_date)}</dd></>
              )}
              <dt>NFC tag</dt><dd className="nfc-tag">{book.nfc_tag_id}</dd>
            </dl>

            {book.notes && (
              <p className="book-detail-notes">{book.notes}</p>
            )}

            {/* Status block */}
            {book.status === 'in' ? (
              <Link
                to={`/checkout?bookId=${book.id}`}
                className="btn btn-primary btn-lg checkout-cta"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 5v14M5 12l7 7 7-7"/>
                </svg>
                Check out this book
              </Link>
            ) : (
              <div className="book-out-info">
                <p className="book-out-label">Currently checked out</p>
                {activeLoan?.due_date && (
                  <p className="book-out-due">Due back: {formatDate(activeLoan.due_date)}</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Loan history */}
        {history.length > 0 && (
          <section className="loan-history-section">
            <h2>Loan history</h2>
            <div className="table-wrap">
              <table className="loan-table">
                <thead>
                  <tr>
                    <th>Borrower</th>
                    <th>Checked out</th>
                    <th>Due</th>
                    <th>Returned</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map(loan => <LoanRow key={loan.id} loan={loan} />)}
                </tbody>
              </table>
            </div>
          </section>
        )}

      </div>
    </main>
  );
}
