import { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { books as booksApi, loans as loansApi } from '../lib/api.js';
import { useAuth } from '../hooks/useAuth.jsx';
import { getCategoryGradient } from '../lib/categoryColors.js';
import './BookPage.css';

function fmt(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function BookPage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const nfcId = searchParams.get('nfc');

  const [book, setBook]       = useState(null);
  const [loans, setLoans]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    const fetchBook = nfcId
      ? booksApi.getByNfc(nfcId)
      : booksApi.getById(id);

    fetchBook
      .then(async (b) => {
        setBook(b);
        if (b?.id) {
          try {
            const loanData = await loansApi.forBook(b.id);
            setLoans(Array.isArray(loanData) ? loanData : loanData?.loans || []);
          } catch { /* ignore loan errors */ }
        }
      })
      .catch(err => {
        setError(err.status === 404 ? 'notFound' : 'network');
      })
      .finally(() => setLoading(false));
  }, [id, nfcId]);

  if (loading) {
    return (
      <div className="page-content">
        <div className="container book-loading">
          <div className="spinner" style={{ width: 36, height: 36 }} />
        </div>
      </div>
    );
  }

  if (error === 'notFound' || !book) {
    return (
      <div className="page-content">
        <div className="container">
          <div className="glass book-error-card">
            <div style={{ fontSize: 48 }}>🔍</div>
            <h2>{t('book.notFound')}</h2>
            <p>{t('book.notFoundHint')}</p>
            <Link to="/" className="btn btn-secondary">{t('common.backToCatalogue')}</Link>
          </div>
        </div>
      </div>
    );
  }

  const statusClass = `badge badge-${book.status}`;
  const statusKey = book.status === 'out' ? 'status.out'
                  : book.status === 'overdue' ? 'status.overdue'
                  : book.status === 'locked'  ? 'status.locked'
                  : 'status.available';

  const checkoutUrl = `/checkout?bookId=${book.id}`;

  return (
    <div className="page-content">
      <div className="container">
        {/* Back link */}
        <Link to="/" className="book-back-link">
          <span className="rtl-flip">←</span>
          {t('common.backToCatalogue')}
        </Link>

        {/* Main layout */}
        <div className="book-layout">
          {/* Cover column */}
          <div className="book-cover-col">
            <div className="book-cover-main-wrap glass">
              {book.cover_image_url ? (
                <img src={book.cover_image_url} alt={book.title} className="book-cover-main-img" />
              ) : (
                <div
                  className="book-cover-main-placeholder"
                  style={{ background: getCategoryGradient(book.category) }}
                >
                  <span className="book-cover-main-initial">{book.title?.charAt(0)}</span>
                  <div className="book-cover-shine" />
                </div>
              )}
            </div>
            {book.back_cover_image_url && (
              <div className="book-back-cover-wrap">
                <p className="book-back-cover-label">{t('book.backCover')}</p>
                <img src={book.back_cover_image_url} alt={t('book.backCover')} className="book-back-cover-img glass" />
              </div>
            )}
          </div>

          {/* Info column */}
          <div className="book-info-col">
            <div className="book-status-row">
              <span className="book-category-pill">{book.category}</span>
              <span className={statusClass}>{t(statusKey)}</span>
            </div>

            <h1 className="book-title">{book.title}</h1>
            <p className="book-author">{t('book.by')} <strong>{book.author}</strong></p>
            {book.translator && (
              <p className="book-translator">{t('book.translator')}: <em>{book.translator}</em></p>
            )}

            {/* Metadata */}
            <div className="glass book-meta">
              {[
                ['isbn',     book.isbn],
                ['eisbn',    book.eisbn],
                ['shelf',    book.shelf_location],
                ['category', book.category],
                ['added',    fmt(book.created_at)],
                ['qrTag',    book.nfc_tag_id],
              ].filter(([, v]) => v).map(([key, val]) => (
                <div key={key} className="book-meta-row">
                  <span className="book-meta-label">{t(`book.${key}`)}</span>
                  <span className="book-meta-value">{val}</span>
                </div>
              ))}
            </div>

            {/* Notes */}
            {book.notes && (
              <div className="glass book-notes">
                <p className="book-notes-label">{t('book.notes')}</p>
                <p className="book-notes-text">{book.notes}</p>
              </div>
            )}

            {/* PDF */}
            {book.pdf_url && (
              <a href={book.pdf_url} target="_blank" rel="noopener noreferrer" className="btn btn-secondary">
                📄 {t('book.downloadPdf')}
              </a>
            )}

            {/* CTA */}
            <div className="book-cta">
              {book.status === 'available' && user && (
                <button className="btn btn-primary btn-lg" onClick={() => navigate(checkoutUrl)}>
                  {t('book.checkoutBtn')}
                </button>
              )}
              {book.status === 'available' && !user && (
                <button className="btn btn-primary btn-lg" onClick={() => navigate('/login', { state: { from: checkoutUrl } })}>
                  {t('checkout.loginBtn')}
                </button>
              )}
              {book.status === 'locked' && (
                <div className="glass book-status-notice notice-amber">
                  🔒 {t('book.lockedNotice')}
                </div>
              )}
              {(book.status === 'out' || book.status === 'overdue') && (
                <div className="glass book-status-notice notice-amber">
                  <p>{t('book.alreadyOut')}</p>
                  {book.current_loan?.due_date && (
                    <p>{t('book.dueBack')}: <strong>{fmt(book.current_loan.due_date)}</strong></p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Loan history */}
        {loans.length > 0 && (
          <div className="glass book-history">
            <h3>{t('book.loanHistory')}</h3>
            <div className="book-history-table-wrap">
              <table className="book-history-table">
                <thead>
                  <tr>
                    <th>{t('admin.colBorrower')}</th>
                    <th>{t('admin.colCheckedOut')}</th>
                    <th>{t('admin.colDue')}</th>
                    <th>{t('admin.colReturned')}</th>
                    <th>{t('admin.colStatus')}</th>
                  </tr>
                </thead>
                <tbody>
                  {loans.map(loan => (
                    <tr key={loan.id}>
                      <td>{loan.borrower_name || loan.user?.full_name || '—'}</td>
                      <td>{fmt(loan.checkout_date || loan.created_at)}</td>
                      <td>{fmt(loan.due_date)}</td>
                      <td>{fmt(loan.return_date)}</td>
                      <td><span className={`badge badge-${loan.status}`}>{t(`status.${loan.status}`)}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {loans.length === 0 && !loading && (
          <div className="glass book-history">
            <h3>{t('book.loanHistory')}</h3>
            <p className="book-no-history">{t('book.noHistory')}</p>
          </div>
        )}
      </div>
    </div>
  );
}
