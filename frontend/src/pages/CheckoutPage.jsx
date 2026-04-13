import { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { books as booksApi, loans as loansApi } from '../lib/api.js';
import toast from 'react-hot-toast';
import './CheckoutPage.css';

export default function CheckoutPage() {
  const [searchParams]          = useSearchParams();
  const bookId                  = searchParams.get('bookId');
  const navigate                = useNavigate();

  const [book, setBook]         = useState(null);
  const [bookLoading, setBL]    = useState(true);
  const [submitting, setSub]    = useState(false);
  const [done, setDone]         = useState(false);

  const defaultDue = new Date(Date.now() + 14 * 86400 * 1000).toISOString().slice(0, 10);

  const [form, setForm] = useState({
    borrower_name:  '',
    borrower_phone: '',
    borrower_email: '',
    due_date:       defaultDue,
    notes:          '',
  });

  useEffect(() => {
    if (!bookId) { setBL(false); return; }
    booksApi.getById(bookId)
      .then(setBook)
      .catch(() => setBook(null))
      .finally(() => setBL(false));
  }, [bookId]);

  function handleChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.borrower_name.trim()) { toast.error('Please enter your name'); return; }
    setSub(true);
    try {
      await loansApi.checkout({ book_id: bookId, ...form });
      setDone(true);
      toast.success('Book checked out successfully!');
    } catch (err) {
      toast.error(err.message || 'Something went wrong');
    } finally {
      setSub(false);
    }
  }

  // Success screen
  if (done) return (
    <main className="page-content">
      <div className="container checkout-wrap">
        <div className="checkout-success">
          <div className="success-icon">✓</div>
          <h2>Enjoy the book!</h2>
          <p className="success-book-title">{book?.title}</p>
          {form.due_date && (
            <p className="success-due">
              Please return it by{' '}
              <strong>{(() => { const [y,m,d] = form.due_date.split('-'); return `${m}/${d}/${y}`; })()}</strong>
            </p>
          )}
          <Link to="/" className="btn btn-secondary" style={{ marginTop: 24 }}>
            Back to catalogue
          </Link>
        </div>
      </div>
    </main>
  );

  if (bookLoading) return (
    <main className="page-content">
      <div className="container checkout-wrap">
        <div style={{ display:'flex', justifyContent:'center', paddingTop: 60 }}>
          <div className="spinner" />
        </div>
      </div>
    </main>
  );

  if (!book && bookId) return (
    <main className="page-content">
      <div className="container checkout-wrap">
        <div className="empty-state">
          <div className="empty-state-icon">📖</div>
          <h3>Book not found</h3>
          <Link to="/" className="btn btn-secondary" style={{ marginTop: 16 }}>Back to catalogue</Link>
        </div>
      </div>
    </main>
  );

  if (!bookId) return (
    <main className="page-content">
      <div className="container checkout-wrap">
        <div className="empty-state">
          <div className="empty-state-icon">📱</div>
          <h3>Scan a book to check it out</h3>
          <p>Tap the NFC sticker on the back cover of the book with your phone.</p>
        </div>
      </div>
    </main>
  );

  if (book.status === 'out' || book.status === 'overdue') return (
    <main className="page-content">
      <div className="container checkout-wrap">
        <div className="checkout-card card">
          <div className="checkout-book-info">
            {book.cover_url && <img src={book.cover_url} alt={book.title} className="checkout-cover" />}
            <div>
              <h2>{book.title}</h2>
              <p className="checkout-author">by {book.author}</p>
            </div>
          </div>
          <div className="empty-state" style={{ padding: '32px 0' }}>
            <div className="empty-state-icon">⏳</div>
            <h3>This book is currently checked out</h3>
            <p>Check back later or browse other available books.</p>
            <Link to="/" className="btn btn-primary" style={{ marginTop: 16 }}>Browse catalogue</Link>
          </div>
        </div>
      </div>
    </main>
  );

  return (
    <main className="page-content">
      <div className="container checkout-wrap">
        <div className="checkout-card card">

          <div className="checkout-book-info">
            {book.cover_url && (
              <img src={book.cover_url} alt={book.title} className="checkout-cover" />
            )}
            <div>
              <p className="checkout-label">You are checking out</p>
              <h2 className="checkout-title">{book.title}</h2>
              <p className="checkout-author">by {book.author}</p>
              {book.shelf_location && (
                <p className="checkout-shelf">Shelf: {book.shelf_location}</p>
              )}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="checkout-form">
            <div className="form-group">
              <label className="form-label" htmlFor="borrower_name">Your name <span className="required">*</span></label>
              <input
                id="borrower_name"
                name="borrower_name"
                className="form-input"
                value={form.borrower_name}
                onChange={handleChange}
                placeholder="Full name"
                required
                autoFocus
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="borrower_phone">Phone (optional)</label>
                <input
                  id="borrower_phone"
                  name="borrower_phone"
                  className="form-input"
                  value={form.borrower_phone}
                  onChange={handleChange}
                  placeholder="+90 555 000 0000"
                  type="tel"
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="borrower_email">Email (optional)</label>
                <input
                  id="borrower_email"
                  name="borrower_email"
                  className="form-input"
                  value={form.borrower_email}
                  onChange={handleChange}
                  placeholder="you@example.com"
                  type="email"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="due_date">Return by</label>
              <input
                id="due_date"
                name="due_date"
                className="form-input"
                type="date"
                value={form.due_date || defaultDue}
                onChange={handleChange}
                min={new Date().toISOString().slice(0, 10)}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="notes">Notes (optional)</label>
              <textarea
                id="notes"
                name="notes"
                className="form-textarea"
                value={form.notes}
                onChange={handleChange}
                placeholder="Any notes…"
                rows={2}
              />
            </div>

            <div className="checkout-actions">
              <Link to={`/book/${book.id}`} className="btn btn-secondary">
                Cancel
              </Link>
              <button type="submit" className="btn btn-primary btn-lg" disabled={submitting}>
                {submitting ? <><span className="spinner" style={{width:16,height:16}} /> Checking out…</> : 'Confirm checkout'}
              </button>
            </div>
          </form>

        </div>
      </div>
    </main>
  );
}
