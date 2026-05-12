import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import CATEGORY_COLORS from '../../lib/categoryColors.js';
import './SearchBar.css';

const CATEGORIES = Object.keys(CATEGORY_COLORS).filter(k => k !== 'default');

export default function SearchBar({ onSearch, onFilter, onStatusFilter }) {
  const { t } = useTranslation();
  const [query, setQuery]     = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus]   = useState('');

  useEffect(() => {
    const timer = setTimeout(() => { onSearch?.(query); }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  function handleCategory(e) {
    setCategory(e.target.value);
    onFilter?.(e.target.value);
  }

  function handleStatus(e) {
    setStatus(e.target.value);
    onStatusFilter?.(e.target.value);
  }

  return (
    <div className="search-bar">
      <div className="search-input-wrap">
        <span className="search-icon">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
        </span>
        <input
          type="text"
          className="search-input"
          placeholder={t('catalogue.searchPlaceholder')}
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
      </div>
      <div className="search-divider" />
      <select className="search-select" value={category} onChange={handleCategory}>
        <option value="">{t('catalogue.allCategories')}</option>
        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
      </select>
      <select className="search-select" value={status} onChange={handleStatus}>
        <option value="">{t('catalogue.allStatuses')}</option>
        <option value="available">{t('catalogue.available')}</option>
        <option value="out">{t('catalogue.checkedOut')}</option>
      </select>
    </div>
  );
}
