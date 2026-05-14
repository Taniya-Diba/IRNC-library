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
  const [showBack, setShowBack] = useState(false);

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

  useEffect(() => { setShowBack(false); }, [book?.id]);

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
  const statusKey = book.status === 'out'     ? 'status.out'
                  : book.status === 'overdue' ? 'status.overdue'
                  : book.status === 'locked'  ? 'status.locked'
                  : 'status.available';

  const checkoutUrl = `/checkout?bookId=${book.id}`;

  const currentCoverUrl = showBack
    ? (book?.back_cover_image_url || book?.back_cover_image_path)
    : (book?.cover_image_url || book?.cover_image_path);
  const hasBackCover = !!(book?.back_cover_image_url || book?.back_cover_image_path);
  const categoryGradient = getCategoryGradient(book.category);

  const flipButton = hasBackCover ? (
    <button
      className={`cover-flip-btn ${showBack ? 'flip-up' : 'flip-down'}`}
      onClick={() => setShowBack(prev => !prev)}
      aria-label={showBack ? t('book.showFrontCover') : t('book.showBackCover')}
    >
      {showBack ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
             stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="m18 15-6-6-6 6"/>
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
             stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="m6 9 6 6 6-6"/>
        </svg>
      )}
    </button>
  ) : null;

  const metaRows = [
    ['isbn',     book.isbn],
    ['eisbn',    book.eisbn],
    ['shelf',    book.shelf_location],
    ['category', book.category],
    ['added',    fmt(book.created_at)],
    ['qrTag',    book.nfc_tag_id],
  ].filter(([, v]) => v);

  const ctaSection = (
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
  );

  const loanHistory = (
    <>
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
    </>
  );

  return (
    <div className="page-content book-page">

      {/* Back link — absolute on mobile, normal flow on desktop */}
      <div className="container">
        <Link to="/" className="book-back-link">
          <span className="rtl-flip">←</span>
          {t('common.backToCatalogue')}
        </Link>
      </div>

      {/* ── MOBILE LAYOUT (hidden on desktop) ── */}
      <div className="book-mobile-layout">

        <div className="book-mobile-hero">
          <div className="book-mobile-hero-inner">
            {currentCoverUrl ? (
              <img
                key={currentCoverUrl}
                src={currentCoverUrl}
                alt={showBack ? t('book.backCover') : book.title}
                className="book-mobile-cover-img"
              />
            ) : (
              <div
                className="book-mobile-cover-gradient"
                style={{ background: categoryGradient }}
              />
            )}
          </div>
          <div className="book-mobile-hero-gradient" />
          <div className="book-mobile-hero-text">
            <div className="book-hero-badges">
              <span className="badge-hero">{book.category}</span>
              <span className={`badge-hero badge-hero-${book.status}`}>
                {t(statusKey)}
              </span>
            </div>
            <h1 className="book-mobile-title">{book.title}</h1>
            <p className="book-mobile-author">{t('book.by')} {book.author}</p>
          </div>
          {flipButton}
        </div>

        <div className="book-mobile-details">
          <div className="book-mobile-handle" />
          {book.translator && (
            <p className="book-translator-mobile">
              {t('book.translator')}: <em>{book.translator}</em>
            </p>
          )}
          <div className="glass book-meta">
            {metaRows.map(([key, val]) => (
              <div key={key} className="book-meta-row">
                <span className="book-meta-label">{t(`book.${key}`)}</span>
                <span className="book-meta-value">{val}</span>
              </div>
            ))}
          </div>
          {book.notes && (
            <div className="glass book-notes">
              <p className="book-notes-label">{t('book.notes')}</p>
              <p className="book-notes-text">{book.notes}</p>
            </div>
          )}
          {book.pdf_url && (
            <a href={book.pdf_url} target="_blank" rel="noopener noreferrer" className="btn btn-secondary">
              📄 {t('book.downloadPdf')}
            </a>
          )}
          {ctaSection}
        </div>

      </div>

      {/* ── DESKTOP LAYOUT (hidden on mobile) ── */}
      <div className="container">
        <div className="book-desktop-layout">

          <div className="book-desktop-cover-col">
            <div className="book-desktop-cover-container">
              {currentCoverUrl ? (
                <img
                  key={currentCoverUrl}
                  src={currentCoverUrl}
                  alt={showBack ? t('book.backCover') : book.title}
                  className="book-desktop-cover-img"
                />
              ) : (
                <div
                  className="book-desktop-cover-gradient"
                  style={{ background: categoryGradient }}
                >
                  <span className="book-cover-letter">
                    {book.title?.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <div className="book-cover-shine" />
            </div>
            {flipButton}
          </div>

          <div className="book-desktop-info-col">
            <div className="book-desktop-meta-row">
              {book.category && <span className="book-genre-pill">{book.category}</span>}
              <span className={statusClass}>{t(statusKey)}</span>
            </div>
            <h1 className="book-detail-title">{book.title}</h1>
            <p className="book-detail-author">{t('book.by')} <strong>{book.author}</strong></p>
            {book.translator && (
              <p className="book-detail-translator">
                {t('book.translator')}: <em>{book.translator}</em>
              </p>
            )}
            <div className="glass book-meta">
              {metaRows.map(([key, val]) => (
                <div key={key} className="book-meta-row">
                  <span className="book-meta-label">{t(`book.${key}`)}</span>
                  <span className="book-meta-value">{val}</span>
                </div>
              ))}
            </div>
            {book.notes && (
              <div className="glass book-notes">
                <p className="book-notes-label">{t('book.notes')}</p>
                <p className="book-notes-text">{book.notes}</p>
              </div>
            )}
            {book.pdf_url && (
              <a href={book.pdf_url} target="_blank" rel="noopener noreferrer" className="btn btn-secondary">
                📄 {t('book.downloadPdf')}
              </a>
            )}
            {ctaSection}
          </div>

        </div>
      </div>

      {/* Loan history — both layouts */}
      <div className="container">
        {loanHistory}
      </div>

    </div>
  );
}
