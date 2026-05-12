// Runs FIRST (before setup.js) so that browser globals exist
// when i18n.js calls localStorage.getItem() at module-load time.

const _store = {};
const localStorageMock = {
  getItem:    (k)    => _store[k] ?? null,
  setItem:    (k, v) => { _store[k] = String(v); },
  removeItem: (k)    => { delete _store[k]; },
  clear:      ()     => { Object.keys(_store).forEach(k => delete _store[k]); },
  get length() { return Object.keys(_store).length; },
  key:        (i)    => Object.keys(_store)[i] ?? null,
};

try {
  Object.defineProperty(globalThis, 'localStorage', {
    value:      localStorageMock,
    writable:   true,
    configurable: true,
  });
} catch {
  globalThis.localStorage = localStorageMock;
}
