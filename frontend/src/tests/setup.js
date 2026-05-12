import '@testing-library/jest-dom';
import { vi } from 'vitest';
import i18n from '../lib/i18n.js';

// Ensure tests start in English
i18n.changeLanguage('en');

// Mock fetch globally
global.fetch = vi.fn();

// Mock window.matchMedia (used by some components)
window.matchMedia = window.matchMedia || function(q) {
  return {
    matches: false, media: q, onchange: null,
    addListener:      vi.fn(), removeListener:      vi.fn(),
    addEventListener: vi.fn(), removeEventListener: vi.fn(),
    dispatchEvent:    vi.fn()
  };
};

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn(() => ({
  observe: vi.fn(), unobserve: vi.fn(), disconnect: vi.fn()
}));

// Reset mocks and clear localStorage between every test
beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  fetch.mockReset();
});
