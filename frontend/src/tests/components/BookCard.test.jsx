import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../lib/i18n.js';
import BookCard from '../../components/book/BookCard.jsx';

const renderCard = (bookProps = {}) => {
  const defaultBook = {
    id:              'test-uuid',
    title:           'Dune',
    author:          'Frank Herbert',
    category:        'Fiction',
    status:          'available',
    translator:      null,
    cover_image_url: null,
    nfc_tag_id:      'LIB-0001',
    shelf_location:  'A1',
    ...bookProps
  };
  return render(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter>
        <BookCard book={defaultBook} />
      </MemoryRouter>
    </I18nextProvider>
  );
};

describe('BookCard component', () => {
  it('renders book title', () => {
    renderCard();
    expect(screen.getByText('Dune')).toBeInTheDocument();
  });

  it('renders author name', () => {
    renderCard();
    expect(screen.getByText('Frank Herbert')).toBeInTheDocument();
  });

  it('renders Available badge for available status', () => {
    renderCard({ status: 'available' });
    expect(screen.getByText('Available')).toBeInTheDocument();
    const badge = screen.getByText('Available').closest('.badge');
    expect(badge).toHaveClass('badge-available');
  });

  it('renders Out badge for out status', () => {
    renderCard({ status: 'out' });
    const badge = screen.getByText('Out').closest('.badge');
    expect(badge).toHaveClass('badge-out');
  });

  it('renders Overdue badge for overdue status', () => {
    renderCard({ status: 'overdue' });
    const badge = screen.getByText('Overdue').closest('.badge');
    expect(badge).toHaveClass('badge-overdue');
  });

  it('renders Locked badge for locked status', () => {
    renderCard({ status: 'locked' });
    const badge = screen.getByText('Locked').closest('.badge');
    expect(badge).toHaveClass('badge-locked');
  });

  it('applies category gradient style to cover div (ISSUE-01)', () => {
    const { container } = renderCard({ category: 'Fiction', cover_image_url: null });
    // The placeholder cover div must have .book-cover class for gradient to be identifiable
    const cover = container.querySelector('.book-cover');
    expect(cover).toBeTruthy();
    const style = cover.getAttribute('style') || '';
    expect(style).toContain('linear-gradient');
  });

  it('shows cover letter when no cover_image_url', () => {
    renderCard({ cover_image_url: null });
    expect(screen.getByText('D')).toBeInTheDocument();
  });

  it('shows <img> when cover_image_url is provided', () => {
    const { container } = renderCard({
      cover_image_url: 'https://example.com/cover.jpg'
    });
    const img = container.querySelector('img');
    expect(img).toBeTruthy();
    expect(img.src).toBe('https://example.com/cover.jpg');
  });

  it('shows translator line when translator is provided', () => {
    renderCard({ translator: 'Gregory Hays' });
    expect(screen.getByText(/Gregory Hays/)).toBeInTheDocument();
  });

  it('does NOT show translator line when translator is null', () => {
    renderCard({ translator: null });
    expect(screen.queryByText(/Translated by/)).not.toBeInTheDocument();
  });

  it('links to the correct book detail page', () => {
    const { container } = renderCard({ id: 'book-uuid-123' });
    const link = container.querySelector('a');
    expect(link.href).toContain('/book/book-uuid-123');
  });

  it('renders the shine overlay div', () => {
    const { container } = renderCard();
    expect(container.querySelector('.book-cover-shine')).toBeTruthy();
  });

  it('renders in Persian when language is FA', () => {
    i18n.changeLanguage('fa');
    renderCard({ status: 'available' });
    expect(screen.getByText('موجود')).toBeInTheDocument();
    i18n.changeLanguage('en');
  });
});
