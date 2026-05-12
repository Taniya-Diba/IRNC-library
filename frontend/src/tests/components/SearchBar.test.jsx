import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../lib/i18n.js';
import SearchBar from '../../components/ui/SearchBar.jsx';

const renderSearchBar = (props = {}) => {
  const defaults = {
    onSearch:       vi.fn(),
    onFilter:       vi.fn(),
    onStatusFilter: vi.fn(),
    ...props
  };
  return {
    ...render(
      <I18nextProvider i18n={i18n}>
        <SearchBar {...defaults} />
      </I18nextProvider>
    ),
    handlers: defaults
  };
};

describe('SearchBar component', () => {
  it('renders search input', () => {
    renderSearchBar();
    expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument();
  });

  it('renders category select', () => {
    renderSearchBar();
    expect(screen.getByDisplayValue('All categories')).toBeInTheDocument();
  });

  it('renders status select', () => {
    renderSearchBar();
    expect(screen.getByDisplayValue('All statuses')).toBeInTheDocument();
  });

  it('ALL elements are inside a single .search-bar container (ISSUE-02)', () => {
    const { container } = renderSearchBar();
    const searchBar = container.querySelector('.search-bar');
    expect(searchBar).toBeTruthy();
    const selects = searchBar.querySelectorAll('select');
    expect(selects.length).toBe(2);
    const input = searchBar.querySelector('input');
    expect(input).toBeTruthy();
  });

  it('calls onSearch when user types in search input', async () => {
    const { handlers } = renderSearchBar();
    const input = screen.getByPlaceholderText(/search/i);
    fireEvent.change(input, { target: { value: 'Dune' } });
    await waitFor(() => {
      expect(handlers.onSearch).toHaveBeenCalledWith('Dune');
    }, { timeout: 500 });
  });

  it('calls onFilter when category is changed', () => {
    const { handlers } = renderSearchBar();
    const select = screen.getByDisplayValue('All categories');
    fireEvent.change(select, { target: { value: 'Fiction' } });
    expect(handlers.onFilter).toHaveBeenCalledWith('Fiction');
  });

  it('calls onFilter with empty string when All categories selected', () => {
    const { handlers } = renderSearchBar();
    const select = screen.getByDisplayValue('All categories');
    fireEvent.change(select, { target: { value: '' } });
    expect(handlers.onFilter).toHaveBeenCalledWith('');
  });

  it('calls onStatusFilter when status is changed', () => {
    const { handlers } = renderSearchBar();
    const select = screen.getByDisplayValue('All statuses');
    fireEvent.change(select, { target: { value: 'available' } });
    expect(handlers.onStatusFilter).toHaveBeenCalledWith('available');
  });

  it('has .search-bar class on container', () => {
    const { container } = renderSearchBar();
    const searchBar = container.querySelector('.search-bar');
    expect(searchBar).toBeTruthy();
  });
});
