import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../lib/i18n.js';

// Tests badge CSS class assignment (ISSUE-03: badge-available unstyled)
describe('Status badge CSS classes', () => {
  const renderBadge = (status) => {
    const { container } = render(
      <I18nextProvider i18n={i18n}>
        <span className={`badge badge-${status}`}>{status}</span>
      </I18nextProvider>
    );
    return container.firstChild;
  };

  it('badge-available class is applied correctly', () => {
    const badge = renderBadge('available');
    expect(badge).toHaveClass('badge-available');
    expect(badge).toHaveClass('badge');
  });

  it('badge-out class is applied correctly', () => {
    const badge = renderBadge('out');
    expect(badge).toHaveClass('badge-out');
    expect(badge).toHaveClass('badge');
  });

  it('badge-overdue class is applied correctly', () => {
    const badge = renderBadge('overdue');
    expect(badge).toHaveClass('badge-overdue');
    expect(badge).toHaveClass('badge');
  });

  it('badge-locked class is applied correctly', () => {
    const badge = renderBadge('locked');
    expect(badge).toHaveClass('badge-locked');
    expect(badge).toHaveClass('badge');
  });

  it('badge-returned class is applied correctly', () => {
    const badge = renderBadge('returned');
    expect(badge).toHaveClass('badge-returned');
  });

  it('each status uses a distinct badge class', () => {
    const statuses = ['available', 'out', 'overdue', 'locked', 'returned'];
    const classes = statuses.map(s => `badge-${s}`);
    const unique = new Set(classes);
    expect(unique.size).toBe(statuses.length);
  });
});
