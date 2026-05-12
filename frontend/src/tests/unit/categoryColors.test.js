import { describe, it, expect } from 'vitest';
import { getCategoryGradient, getCategoryColors } from '../../lib/categoryColors.js';

describe('getCategoryGradient', () => {
  it('returns a CSS gradient string', () => {
    const gradient = getCategoryGradient('Fiction');
    expect(gradient).toMatch(/^linear-gradient/);
    expect(gradient).toContain('#6C47FF');
  });

  it('returns indigo gradient for Fiction', () => {
    const gradient = getCategoryGradient('Fiction');
    expect(gradient).toContain('#6C47FF');
    expect(gradient).toContain('#A78BFA');
  });

  it('returns sky blue gradient for History', () => {
    const gradient = getCategoryGradient('History');
    expect(gradient).toContain('#0ea5e9');
  });

  it('returns cyan gradient for Technology', () => {
    const gradient = getCategoryGradient('Technology');
    expect(gradient).toContain('#06b6d4');
  });

  it('returns amber gradient for Philosophy', () => {
    const gradient = getCategoryGradient('Philosophy');
    expect(gradient).toContain('#f59e0b');
  });

  it('returns default gray gradient for unknown category', () => {
    const gradient = getCategoryGradient('Unknown Category XYZ');
    expect(gradient).toContain('#64748b');
  });

  it('returns default gray gradient for null', () => {
    const gradient = getCategoryGradient(null);
    expect(gradient).toContain('#64748b');
  });

  it('returns default gray gradient for undefined', () => {
    const gradient = getCategoryGradient(undefined);
    expect(gradient).toContain('#64748b');
  });

  it('returns default gray gradient for empty string', () => {
    const gradient = getCategoryGradient('');
    expect(gradient).toContain('#64748b');
  });

  it('covers all 10 named categories with distinct gradients', () => {
    const categories = [
      'Fiction', 'History', 'Technology', 'Science',
      'Philosophy', 'Psychology', 'Business', 'Biography',
      'Art & Design', 'Religion'
    ];
    const gradients = categories.map(c => getCategoryGradient(c));
    const unique = new Set(gradients);
    expect(unique.size).toBe(10);
  });
});

describe('getCategoryColors', () => {
  it('returns object with from and to properties', () => {
    const colors = getCategoryColors('Fiction');
    expect(colors).toHaveProperty('from');
    expect(colors).toHaveProperty('to');
  });

  it('from and to are valid hex colors', () => {
    const colors = getCategoryColors('Science');
    expect(colors.from).toMatch(/^#[0-9a-fA-F]{6}$/);
    expect(colors.to).toMatch(/^#[0-9a-fA-F]{6}$/);
  });
});
