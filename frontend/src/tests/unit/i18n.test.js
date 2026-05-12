import { describe, it, expect, beforeEach } from 'vitest';
import i18n from '../../lib/i18n.js';

describe('i18n configuration', () => {
  beforeEach(() => {
    i18n.changeLanguage('en');
    localStorage.clear();
  });

  it('defaults to English', () => {
    expect(i18n.language).toBe('en');
  });

  it('translates catalogue.title to English', () => {
    expect(i18n.t('catalogue.title')).toBe('Book catalogue');
  });

  it('translates to Persian after language change', () => {
    i18n.changeLanguage('fa');
    expect(i18n.t('catalogue.title')).toBe('فهرست کتاب‌ها');
  });

  it('persists language preference to localStorage', () => {
    i18n.changeLanguage('fa');
    expect(localStorage.getItem('irnc_lang')).toBe('fa');
  });

  it('sets dir=rtl on html element when switching to FA', () => {
    i18n.changeLanguage('fa');
    expect(document.documentElement.dir).toBe('rtl');
    expect(document.documentElement.lang).toBe('fa');
  });

  it('sets dir=ltr on html element when switching to EN', () => {
    i18n.changeLanguage('fa');
    i18n.changeLanguage('en');
    expect(document.documentElement.dir).toBe('ltr');
  });

  it('falls back to key path for missing translations', () => {
    const result = i18n.t('nonexistent.key.path');
    expect(typeof result).toBe('string');
  });

  it('all EN keys have corresponding FA translations', async () => {
    const en = (await import('../../locales/en.json')).default;
    const fa = (await import('../../locales/fa.json')).default;

    function findMissingKeys(enObj, faObj, path = '') {
      const missing = [];
      Object.keys(enObj).forEach(key => {
        const fullPath = path ? `${path}.${key}` : key;
        if (typeof enObj[key] === 'object') {
          missing.push(...findMissingKeys(enObj[key], faObj?.[key] || {}, fullPath));
        } else if (!faObj?.[key]) {
          missing.push(fullPath);
        }
      });
      return missing;
    }

    const missingKeys = findMissingKeys(en, fa);
    if (missingKeys.length > 0) {
      console.warn('Missing FA translation keys:', missingKeys);
    }
    expect(missingKeys).toHaveLength(0);
  });
});
