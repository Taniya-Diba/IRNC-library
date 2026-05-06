import { useState, useEffect } from 'react';
import { useSearchParams, useLocation, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { books as booksApi, loans as loansApi } from '../lib/api.js';
import { useAuth } from '../hooks/useAuth.jsx';
import { getCategoryGradient } from '../lib/categoryColors.js';
import toast from 'react-hot-toast';
import './CheckoutPage.css';

function fmt(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

function defaultDueDate() {
  const d = new Date();
  d.setDate(d.getDate() + 14);
  return d.toISOString().split('T')[0];
}

function BookStrip({ book, t }) {
  return (
    <div className="checkout-book-strip glass">
      <div
        className="checkout-mini-cover"
        style={{ background: book.cover_image_url ? undefined : getCategoryGradient(book.category) }}
      >
        {book.cover_image_url
          ? <img src={book.cover_image_url} alt={book.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <span className="checkout-mini-initial">{book.title?.charAt(0)}</span>
        }
        <div className="book-cover-shine" />
      </div>
      <div className="checkout-book-info">
        <p className="checkout-book-title">{book.title}</p>
        <p className="checkout-book-author">{book.author}</p>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
          <span className="checkout-tag">{book.category}</span>
          {book.shelf_location && <span className="checkout-tag">{book.shelf_location}</span>}
          <span className={`badge badge-${book.status}`}>{t(`status.${book.status}`)}</span>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const bookId = searchParams.get('bookId');

  const [book, setBook]         = useState(null);
  const [loading, setLoading]   = useState(!!bookId);
  const [notFound, setNotFound] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess]   = useState(null);

  // Form fields
  const [fullName, setFullName] = useState('');
  const [dueDate, setDueDate]   = useState(defaultDueDate());
  const [notes, setNotes]       = useState('');

  useEffect(() => {
    if (user) setFullName(user.full_name || '');
  }, [user]);

  useEffect(() => {
    if (!bookId) return;
    setLoading(true);
    booksApi.getById(bookId)
      .then(setBook)
      .catch(err => { if (err.status === 404) setNotFound(true); })
      .finally(() => setLoading(false));
  }, [bookId]);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const result = await loansApi.checkout({ book_id: bookId, due_date: dueDate, notes });
      setSuccess({ dueDate, bookTitle: book.title });
    } catch (err) {
      toast.error(err.message || t('errors.unknownError'));
    } finally {
      setSubmitting(false);
    }
  }

  const fromState = location.pathname + location.search;

  // STATE 1 — No bookId
  if (!bookId) {
    return (
      <div className="page-content checkout-center">
        <div className="glass-strong checkout-card">
          <div className="checkout-icon">📱</div>
          <h2>{t('checkout.scanTitle')}</h2>
          <p>{t('checkout.scanHint')}</p>
          <Link to="/" className="btn btn-secondary">{t('common.backToCatalogue')}</Link>
        </div>
      </div>
    );
  }

  // STATE 2 — Loading
  if (loading) {
    return (
      <div className="page-content checkout-center">
        <div className="glass checkout-card">
          <div className="spinner" style={{ width: 32, height: 32 }} />
        </div>
      </div>
    );
  }

  // STATE 3 — Not found
  if (notFound || !book) {
    return (
      <div className="page-content checkout-center">
        <div className="glass-strong checkout-card">
          <div className="checkout-icon">🔍</div>
          <h2>{t('checkout.notFoundTitle')}</h2>
          <p>{t('checkout.notFoundHint')}</p>
          <Link to="/" className="btn btn-secondary">{t('common.backToCatalogue')}</Link>
        </div>
      </div>
    );
  }

  // STATE 4 — Locked
  if (book.status === 'locked') {
    return (
      <div className="page-content checkout-center">
        <div className="glass-strong checkout-card">
          <div className="checkout-icon">🔒</div>
          <h2>{t('checkout.lockedTitle')}</h2>
          <p>{t('checkout.lockedHint')}</p>
          <Link to="/" className="btn btn-secondary">{t('common.backToCatalogue')}</Link>
        </div>
      </div>
    );
  }

  // STATE 5 — Out / Overdue
  if (book.status === 'out' || book.status === 'overdue') {
    return (
      <div className="page-content checkout-center">
        <div className="glass-strong checkout-card">
          <BookStrip book={book} t={t} />
          <div className="checkout-icon">⏳</div>
          <h2>{t('checkout.alreadyOutTitle')}</h2>
          <p>{t('checkout.alreadyOutHint')}</p>
          <Link to="/" className="btn btn-secondary">{t('common.backToCatalogue')}</Link>
        </div>
      </div>
    );
  }

  // STATE 8 — Success
  if (success) {
    return (
      <div className="page-content checkout-center">
        <div className="glass-strong checkout-card checkout-success">
          <div className="checkout-success-check">✓</div>
          <h2>{t('checkout.successTitle')}</h2>
          <p><em>{success.bookTitle}</em></p>
          <p>{t('checkout.successDue')} <strong>{fmt(success.dueDate)}</strong></p>
          <Link to="/" className="btn btn-secondary">{t('checkout.successBack')}</Link>
        </div>
      </div>
    );
  }

  // STATE 6 — Not logged in, book available
  if (!user) {
    return (
      <div className="page-content checkout-center">
        <div className="glass-strong checkout-card">
          <BookStrip book={book} t={t} />
          <div className="checkout-login-prompt">
            <h3>{t('checkout.loginRequired')}</h3>
            <p>{t('checkout.loginRequiredHint')}</p>
            <div className="checkout-auth-btns">
              <Link to="/login" state={{ from: fromState }} className="btn btn-primary">
                {t('checkout.loginBtn')}
              </Link>
              <Link to="/register" state={{ from: fromState }} className="btn btn-secondary">
                {t('checkout.registerBtn')}
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // STATE 7 — Logged in, book available
  return (
    <div className="page-content checkout-center">
      <div className="glass-strong checkout-card checkout-form-card">
        <BookStrip book={book} t={t} />
        <form onSubmit={handleSubmit} className="checkout-form">
          <div className="form-group">
            <label className="form-label">{t('checkout.fullName')}</label>
            <input
              className="form-input"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">{t('checkout.membershipId')}</label>
            <div className="checkout-readonly-chip">{user.membership_id || '—'}</div>
          </div>
          <div className="form-group">
            <label className="form-label">{t('checkout.dueDate')}</label>
            <input
              className="form-input"
              type="date"
              value={dueDate}
              min={new Date().toISOString().split('T')[0]}
              onChange={e => setDueDate(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">{t('checkout.notesPlaceholder')} <span style={{color:'var(--text-subtle)'}}>({t('common.optional')})</span></label>
            <textarea
              className="form-textarea"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
            />
          </div>
          <div className="checkout-form-btns">
            <Link to={`/book/${bookId}`} className="btn btn-secondary">{t('checkout.cancel')}</Link>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? <><span className="spinner" />{t('checkout.submitting')}</> : t('checkout.confirm')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
