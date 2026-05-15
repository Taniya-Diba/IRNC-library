import { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { books as booksApi, loans as loansApi } from '../lib/api.js';
import { useAuth } from '../hooks/useAuth.jsx';
import { getCategoryGradient } from '../lib/categoryColors.js';
import { getPaletteSync } from 'colorthief';
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
  const location = useLocation();
  const { user } = useAuth();

  const nfcId = searchParams.get('nfc');

  const [book, setBook]       = useState(null);
  const [loans, setLoans]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [showBack, setShowBack] = useState(false);
  const [dominantColor, setDominantColor] = useState(null);  // darkest — hero bg
  const [lightestColor, setLightestColor] = useState(null);  // lightest — page bg
  const coverImgRef = useRef(null);

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

  useEffect(() => {
    setDominantColor(null);
    setLightestColor(null);
  }, [book?.id]);

  useEffect(() => {
    const html = document.documentElement;
    if (lightestColor) {
      const [r, g, b] = lightestColor;
      html.style.background = `linear-gradient(to bottom, rgba(${r},${g},${b},0.10) 0%, rgba(${r},${g},${b},0.45) 50%, rgb(${r},${g},${b}) 100%)`;
      html.style.backgroundAttachment = 'fixed';
    } else {
      html.style.background = '';
      html.style.backgroundAttachment = '';
    }
    return () => {
      html.style.background = '';
      html.style.backgroundAttachment = '';
    };
  }, [lightestColor]);

  useEffect(() => {
    if (coverImgRef.current?.complete && coverImgRef.current?.naturalWidth > 0) {
      extractColor(coverImgRef.current);
    }
  }, [book?.cover_image_url]);

  async function extractColor(imgElement) {
    if (!imgElement) return;
    try {
      if (!imgElement.complete || imgElement.naturalWidth === 0) {
        await new Promise((resolve, reject) => {
          imgElement.onload = resolve;
          imgElement.onerror = reject;
        });
      }
      const palette = getPaletteSync(imgElement, { colorCount: 8 });
      const darkest = palette.reduce((prev, curr) =>
        curr.luminance < prev.luminance ? curr : prev
      );
      const lightest = palette.reduce((prev, curr) =>
        curr.luminance > prev.luminance ? curr : prev
      );
      setDominantColor(darkest.array());
      setLightestColor(lightest.array());
    } catch (err) {
      setDominantColor(null);
    }
  }

  function handleCoverLoad(e) {
    extractColor(e.target);
  }

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

  /* Desktop CTA — unchanged */
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

  /* Desktop loan history — unchanged */
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

  function toRgba(color, opacity) {
    if (!color) return null;
    const [r, g, b] = color;
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  }

  function pageGradient(color) {
    if (!color) return null;
    const [r, g, b] = color;
    return `linear-gradient(160deg, rgba(${r}, ${g}, ${b}, 0.55) 0%, rgba(${r}, ${g}, ${b}, 0.30) 55%, rgba(${r}, ${g}, ${b}, 0.08) 100%)`;
  }

  function heroBg(color) {
    if (!color) return getCategoryGradient(book?.category);
    const [r, g, b] = color;
    return `rgba(${r}, ${g}, ${b}, 0.85)`;
  }

  return (
    <div
      className="page-content book-page"
      style={lightestColor ? {
        background: `linear-gradient(to bottom, rgba(${lightestColor[0]},${lightestColor[1]},${lightestColor[2]},0.10) 0%, rgba(${lightestColor[0]},${lightestColor[1]},${lightestColor[2]},0.45) 50%, rgb(${lightestColor[0]},${lightestColor[1]},${lightestColor[2]}) 100%)`,
        transition: 'background 0.8s ease'
      } : undefined}
    >

      {/* color is applied via page div inline style + html background */}

      {/* Back link — desktop only, hidden on mobile via CSS */}
      <div className="container book-desktop-back">
        <Link to="/" className="book-back-link">
          <span className="rtl-flip">←</span>
          {t('common.backToCatalogue')}
        </Link>
      </div>

      {/* ── MOBILE LAYOUT — shown only on < 768px ── */}
      <div className="book-mobile-layout">

        {/* ZONE 1: Cover hero — title block nested inside */}
        <div className="book-mobile-hero">

          {/* Background: cover image, absolutely fills the hero */}
          <div
            className="book-mobile-hero-inner"
            style={{
              backgroundColor: dominantColor
                ? `rgba(${dominantColor[0]}, ${dominantColor[1]}, ${dominantColor[2]}, 0.90)`
                : undefined,
              transition: 'background-color 0.6s ease'
            }}
          >
            {currentCoverUrl ? (
              <img
                key={currentCoverUrl}
                src={currentCoverUrl}
                alt={showBack ? t('book.backCover') : book.title}
                className="book-mobile-hero-img"
                ref={coverImgRef}
                onLoad={handleCoverLoad}
                crossOrigin="anonymous"
              />
            ) : (
              <div
                className="book-mobile-hero-gradient"
                style={{ background: categoryGradient }}
              />
            )}
            <div className="book-mobile-hero-fade" />
          </div>

          {/* Back link overlaid on hero */}
          <Link to="/" className="book-mobile-back-link">
            <svg className="rtl-flip" width="14" height="14" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6"/>
            </svg>
            {t('common.backToCatalogue')}
          </Link>

          {/* ZONE 2: Title block — glass panel nested in hero, cover blurs behind it */}
          <div className={`book-mobile-title-block${hasBackCover ? ' has-flip' : ''}`}>
            {/* Flip button straddles the cover / title boundary */}
            {hasBackCover && (
              <button
                className={`cover-flip-btn ${showBack ? 'flip-up' : 'flip-down'}`}
                onClick={() => setShowBack(v => !v)}
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
            )}
            <div className="book-mobile-badges">
              {book.category && (
                <span className="book-genre-pill">{book.category}</span>
              )}
              <span className={statusClass}>{t(statusKey)}</span>
            </div>
            <h1 className="book-mobile-title">{book.title}</h1>
            <p className="book-mobile-author">{t('book.by')} {book.author}</p>
            {book.translator && (
              <p className="book-mobile-translator">
                {t('book.translator')}: {book.translator}
              </p>
            )}
          </div>
        </div>

        {/* ZONE 3: Scrollable details */}
        <div className="book-mobile-scroll">

          {/* Metadata card */}
          <div className="book-mobile-meta-card">
            {metaRows.map(([key, val], i) => (
              <div
                key={key}
                className={`meta-row${i === metaRows.length - 1 ? ' meta-row-last' : ''}`}
              >
                <span className="meta-label">{t(`book.${key}`)}</span>
                <span className="meta-value">{val}</span>
              </div>
            ))}
          </div>

          {/* Notes */}
          {book.notes && (
            <div className="book-mobile-notes">{book.notes}</div>
          )}

          {/* PDF download */}
          {book.pdf_url && (
            <a
              href={book.pdf_url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary"
              style={{ width: '100%', justifyContent: 'center', marginBottom: 16 }}
            >
              📄 {t('book.downloadPdf')}
            </a>
          )}

          {/* Loan history (simplified 2-col for narrow screens) */}
          {loans.length > 0 && (
            <div className="book-mobile-history">
              <h3 className="history-title">{t('book.loanHistory')}</h3>
              <div className="book-mobile-meta-card">
                {loans.map((loan, i) => (
                  <div
                    key={loan.id}
                    className={`meta-row${i === loans.length - 1 ? ' meta-row-last' : ''}`}
                  >
                    <span className="meta-label">
                      {loan.borrower_name || loan.user?.full_name || '—'}
                    </span>
                    <span className={`badge badge-${loan.status}`} style={{ fontSize: 10 }}>
                      {t(`status.${loan.status}`)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* ZONE 4: Fixed CTA bar — always visible at bottom */}
        <div className="book-mobile-cta-bar">
          {book.status === 'available' && user && (
            <button
              className="btn btn-primary btn-lg"
              style={{ width: '100%', justifyContent: 'center' }}
              onClick={() => navigate(checkoutUrl)}
            >
              {t('book.checkoutBtn')}
            </button>
          )}
          {book.status === 'available' && !user && (
            <div className="cta-dual">
              <button
                className="btn btn-primary"
                onClick={() => navigate('/login', { state: { from: location } })}
              >
                {t('checkout.loginBtn')}
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => navigate('/register', { state: { from: location } })}
              >
                {t('nav.register')}
              </button>
            </div>
          )}
          {book.status === 'locked' && (
            <div className="cta-info-bar cta-locked">
              🔒 {t('book.lockedNotice')}
            </div>
          )}
          {(book.status === 'out' || book.status === 'overdue') && (
            <div className="cta-info-bar cta-out">
              ⏳ {t('book.alreadyOut')}
              {book.current_loan?.due_date && (
                <span className="cta-due-date">
                  {t('book.dueBack')}: {fmt(book.current_loan.due_date)}
                </span>
              )}
            </div>
          )}
        </div>

      </div>

      {/* ── DESKTOP LAYOUT (hidden on mobile) — unchanged ── */}
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
                  crossOrigin="anonymous"
                  onLoad={handleCoverLoad}
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

      {/* Loan history — desktop only, hidden on mobile via CSS */}
      <div className="container book-desktop-history">
        {loanHistory}
      </div>

    </div>
  );
}
