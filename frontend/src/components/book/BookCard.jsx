import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getCategoryGradient } from '../../lib/categoryColors.js';
import './BookCard.css';

export default function BookCard({ book }) {
  const { t } = useTranslation();
  const { id, title, author, translator, category, status, cover_image_url } = book;

  const statusClass = `badge badge-${status}`;
  const statusKey   = status === 'out' ? 'status.out'
                    : status === 'overdue' ? 'status.overdue'
                    : status === 'locked'  ? 'status.locked'
                    : 'status.available';

  return (
    <Link to={`/book/${id}`} className="book-card glass">
      {/* Cover */}
      <div className="book-cover-container">
        {cover_image_url ? (
          <img src={cover_image_url} alt={title} loading="lazy" className="book-cover-img" />
        ) : (
          <div
            className="book-cover-placeholder"
            style={{ background: getCategoryGradient(category) }}
          >
            <span className="book-cover-initial">{title?.charAt(0)?.toUpperCase()}</span>
          </div>
        )}
        <div className="book-cover-shine" />
      </div>

      {/* Info */}
      <div className="book-card-body">
        <p className="book-card-title">{title}</p>
        <p className="book-card-author">{author}</p>
        {translator && (
          <p className="book-card-translator">{translator}</p>
        )}
        <div className="book-card-footer">
          <span className={statusClass}>{t(statusKey)}</span>
        </div>
      </div>
    </Link>
  );
}
