import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import BookCard from '../components/book/BookCard.jsx';
import SearchBar from '../components/ui/SearchBar.jsx';
import { books as booksApi } from '../lib/api.js';
import useBooks from '../hooks/useBooks.js';
import './CataloguePage.css';

export default function CataloguePage() {
  const { t } = useTranslation();
  const [params, setParams] = useState({});
  const { data, total, loading, error, refetch } = useBooks(params);

  const handleSearch = useCallback((q) => {
    const next = { ...params, search: q };
    setParams(next);
    refetch(next);
  }, [params, refetch]);

  const handleFilter = useCallback((category) => {
    const next = { ...params, category };
    setParams(next);
    refetch(next);
  }, [params, refetch]);

  const handleStatusFilter = useCallback((status) => {
    const next = { ...params, status };
    setParams(next);
    refetch(next);
  }, [params, refetch]);

  return (
    <div className="page-content">
      <div className="container">
        <div className="catalogue-header">
          <h1>{t('catalogue.title')}</h1>
          {!loading && !error && (
            <p className="catalogue-subtitle">
              {t('catalogue.subtitle', { count: total || 0 })}
            </p>
          )}
        </div>

        <div className="catalogue-search">
          <SearchBar
            onSearch={handleSearch}
            onFilter={handleFilter}
            onStatusFilter={handleStatusFilter}
          />
        </div>

        {error && (
          <div className="glass catalogue-error">
            <p>{t('errors.networkError')}</p>
          </div>
        )}

        {loading ? (
          <div className="books-grid">
            {Array.from({ length: 12 }, (_, i) => (
              <div key={i} className="skeleton skeleton-book" />
            ))}
          </div>
        ) : data.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📚</div>
            <h3>{t('catalogue.noResults')}</h3>
            <p>{t('catalogue.noResultsHint')}</p>
          </div>
        ) : (
          <div className="books-grid">
            {data.map(book => <BookCard key={book.id} book={book} />)}
          </div>
        )}
      </div>
    </div>
  );
}
