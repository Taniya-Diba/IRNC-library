import { useState } from 'react';
import './SearchBar.css';

const GENRES = ['All', 'Fiction', 'History', 'Technology', 'Science', 'Philosophy', 'Psychology', 'Business', 'Biography'];

export default function SearchBar({ onSearch, onFilter, onStatusFilter }) {
  const [search, setSearch]         = useState('');
  const [genre, setGenre]           = useState('All');
  const [status, setStatus]         = useState('all');

  function handleSearch(e) {
    const val = e.target.value;
    setSearch(val);
    onSearch(val);
  }

  function handleGenre(e) {
    const val = e.target.value;
    setGenre(val);
    onFilter(val === 'All' ? '' : val);
  }

  function handleStatus(e) {
    const val = e.target.value;
    setStatus(val);
    onStatusFilter(val === 'all' ? '' : val);
  }

  return (
    <div className="search-bar">
      <div className="search-input-wrap">
        <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
        <input
          type="search"
          className="form-input search-input"
          placeholder="Search by title or author…"
          value={search}
          onChange={handleSearch}
        />
      </div>

      <select className="form-select filter-select" value={genre} onChange={handleGenre}>
        {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
      </select>

      <select className="form-select filter-select" value={status} onChange={handleStatus}>
        <option value="all">All statuses</option>
        <option value="in">Available</option>
        <option value="out">Checked out</option>
      </select>
    </div>
  );
}
