import { useState, useCallback } from 'react';
import { useBooks } from '../hooks/useBooks.js';
import BookCard   from '../components/book/BookCard.jsx';
import SearchBar  from '../components/ui/SearchBar.jsx';
import './CataloguePage.css';

export default function CataloguePage() {
  const { data: bookList, total, loading, error, refetch } = useBooks({ limit: 100 });
  const [search, setSearch]   = useState('');
  const [genre, setGenre]     = useState('');
  const [status, setStatus]   = useState('');

  const handleSearch = useCallback((val) => {
    setSearch(val);
    refetch({ search: val, genre, status });
  }, [genre, status, refetch]);

  const handleGenre = useCallback((val) => {
    setGenre(val);
    refetch({ search, genre: val, status });
  }, [search, status, refetch]);

  const handleStatus = useCallback((val) => {
    setStatus(val);
    refetch({ search, genre, status: val });
  }, [search, genre, refetch]);

  return (
    <main className="page-content">
      <div className="container">
        <div className="catalogue-header">
          <div>
            <h1>Book catalogue</h1>
            <p className="catalogue-sub">
              {total > 0 ? `${total} book${total !== 1 ? 's' : ''} in the collection` : 'Personal library'}
            </p>
          </div>
        </div>

        <div className="catalogue-search">
          <SearchBar
            onSearch={handleSearch}
            onFilter={handleGenre}
            onStatusFilter={handleStatus}
          />
        </div>

        {error && (
          <div className="error-banner">
            Could not load books. Make sure the API is running.
          </div>
        )}

        {loading ? (
          <div className="catalogue-loading">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="book-skeleton" />
            ))}
          </div>
        ) : bookList.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📚</div>
            <h3>No books found</h3>
            <p>Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="books-grid">
            {bookList.map(book => <BookCard key={book.id} book={book} />)}
          </div>
        )}
      </div>
    </main>
  );
}
