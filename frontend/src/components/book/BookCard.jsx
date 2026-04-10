import { Link } from 'react-router-dom';
import './BookCard.css';

const GENRE_COLORS = {
  Fiction:     '#8b5cf6',
  History:     '#d97706',
  Technology:  '#2563eb',
  Science:     '#0891b2',
  Philosophy:  '#059669',
  Psychology:  '#db2777',
  Business:    '#ea580c',
  Biography:   '#7c3aed',
};

export default function BookCard({ book }) {
  const genreColor = GENRE_COLORS[book.genre] || '#6b7280';

  return (
    <Link to={`/book/${book.id}`} className="book-card">
      <div className="book-cover" style={{ '--genre-color': genreColor }}>
        {book.cover_url ? (
          <img src={book.cover_url} alt={book.title} loading="lazy" />
        ) : (
          <div className="book-cover-placeholder">
            <span>{book.title.charAt(0)}</span>
          </div>
        )}
        <div className={`book-status-dot ${book.status === 'in' ? 'dot-in' : 'dot-out'}`} />
      </div>
      <div className="book-card-body">
        <p className="book-card-title">{book.title}</p>
        <p className="book-card-author">{book.author}</p>
        <div className="book-card-footer">
          {book.genre && (
            <span className="book-genre-tag" style={{ color: genreColor, background: genreColor + '18' }}>
              {book.genre}
            </span>
          )}
          <span className={`badge badge-${book.status}`}>
            {book.status === 'in' ? 'Available' : 'Out'}
          </span>
        </div>
      </div>
    </Link>
  );
}
