import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import QRCode from 'qrcode';
import { books as booksApi } from '../lib/api.js';
import { getCategoryColors } from '../lib/categoryColors.js';
import toast from 'react-hot-toast';
import './AdminQRGenerator.css';

async function generateQR(nfcTagId) {
  const baseUrl = import.meta.env.VITE_LIBRARY_URL || window.location.origin;
  const url = `${baseUrl}/book?nfc=${encodeURIComponent(nfcTagId)}`;
  try {
    return await QRCode.toDataURL(url, {
      width: 180,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: { dark: '#1a1625', light: '#ffffff' },
    });
  } catch {
    return null;
  }
}

function downloadQR(dataUrl, nfcTagId, title) {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = `qr-${nfcTagId}-${title.replace(/\s+/g, '_').toLowerCase()}.png`;
  link.click();
}

function printQR(dataUrl, book) {
  const win = window.open('', '_blank');
  if (!win) return;
  win.document.write(`
    <html><head>
      <title>QR — ${book.title}</title>
      <style>
        body { font-family: sans-serif; text-align: center; padding: 20px; }
        img  { width: 180px; height: 180px; display: block; margin: 0 auto 10px; }
        p    { margin: 4px 0; font-size: 12px; }
        .tag { font-family: monospace; font-size: 11px; color: #666; }
      </style>
    </head><body>
      <img src="${dataUrl}" alt="QR code" />
      <p><strong>${book.title}</strong></p>
      <p>${book.author || ''}</p>
      <p class="tag">${book.nfc_tag_id || ''}</p>
      <script>window.onload = () => { window.print(); window.close(); }<\/script>
    </body></html>
  `);
  win.document.close();
}

export default function AdminQRGenerator() {
  const { t } = useTranslation();
  const [books, setBooks]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [qrMap, setQrMap]         = useState({});
  const [genCount, setGenCount]   = useState(0);
  const [generating, setGenerating] = useState(false);
  const [search, setSearch]       = useState('');
  const [category, setCategory]   = useState('');

  useEffect(() => {
    booksApi.list({ limit: 1000 })
      .then(d => setBooks(Array.isArray(d) ? d : d?.books || []))
      .catch(() => toast.error(t('errors.networkError')))
      .finally(() => setLoading(false));
  }, [t]);

  // Generate QR codes when books load
  useEffect(() => {
    if (!books.length) return;
    setGenerating(true);
    setQrMap({});
    setGenCount(0);

    let cancelled = false;
    const run = async () => {
      const map = {};
      for (let i = 0; i < books.length; i++) {
        if (cancelled) return;
        const book = books[i];
        if (book.nfc_tag_id) {
          map[book.nfc_tag_id] = await generateQR(book.nfc_tag_id);
        }
        setGenCount(i + 1);
        setQrMap({ ...map });
      }
      setGenerating(false);
    };
    run();
    return () => { cancelled = true; };
  }, [books]);

  const categories = useMemo(() => [...new Set(books.map(b => b.category).filter(Boolean))], [books]);

  const filtered = books.filter(b => {
    const matchSearch = !search ||
      b.title?.toLowerCase().includes(search.toLowerCase()) ||
      b.author?.toLowerCase().includes(search.toLowerCase()) ||
      b.nfc_tag_id?.toLowerCase().includes(search.toLowerCase());
    const matchCat = !category || b.category === category;
    return matchSearch && matchCat;
  });

  function handleDownloadAll() {
    const ready = Object.entries(qrMap);
    if (!ready.length) {
      toast.error(t('qr.noBooks'));
      return;
    }
    toast(t('qr.downloadHint'), { icon: 'ℹ️' });
  }

  return (
    <div className="page-content">
      <div className="container">
        {/* Header */}
        <div className="glass qr-header">
          <div className="qr-header-text">
            <h1>{t('qr.title')}</h1>
            <p className="qr-subtitle">{t('qr.subtitle')}</p>
          </div>
          <div className="qr-header-actions">
            <button
              className="btn btn-primary"
              disabled={generating || !books.length}
              onClick={() => {
                setQrMap({});
                setGenCount(0);
                setGenerating(true);
              }}
            >
              {t('qr.generateAll')}
            </button>
            <button
              className="btn btn-secondary"
              disabled={!Object.keys(qrMap).length}
              onClick={handleDownloadAll}
            >
              {t('qr.downloadAll')}
            </button>
          </div>
        </div>

        {/* Filter bar */}
        <div className="glass qr-filter-bar">
          <input
            className="form-input qr-search"
            placeholder={t('admin.searchBooks')}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <select
            className="form-select qr-cat-select"
            value={category}
            onChange={e => setCategory(e.target.value)}
          >
            <option value="">{t('catalogue.allCategories')}</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* Progress */}
        {generating && (
          <div className="glass qr-progress-card">
            <div className="spinner" style={{ width: 28, height: 28 }} />
            <span className="qr-progress-text">
              {t('qr.generating', { current: genCount, total: books.length })}
            </span>
            <div className="progress-bar-track" style={{ width: '100%', maxWidth: 300 }}>
              <div
                className="progress-bar-fill"
                style={{ width: books.length ? `${(genCount / books.length) * 100}%` : '0%' }}
              />
            </div>
          </div>
        )}

        {/* QR Grid */}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
            <div className="spinner" style={{ width: 40, height: 40 }} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state" style={{ padding: '48px 0' }}>
            <div className="empty-state-icon">📷</div>
            <p>{t('qr.noBooks')}</p>
          </div>
        ) : (
          <div className="qr-grid">
            {filtered.map(book => {
              const qrDataUrl = book.nfc_tag_id ? qrMap[book.nfc_tag_id] : null;
              const colors = getCategoryColors(book.category);
              return (
                <div key={book.id} className="qr-card glass">
                  {/* QR image */}
                  <div className="qr-image-wrap">
                    {qrDataUrl ? (
                      <img
                        src={qrDataUrl}
                        alt={`QR for ${book.title}`}
                        className="qr-img"
                      />
                    ) : (
                      <div className="qr-skeleton">
                        <div className="spinner" style={{ width: 24, height: 24, opacity: 0.4 }} />
                      </div>
                    )}
                  </div>

                  {/* Book info */}
                  <div className="qr-card-info">
                    <code className="qr-nfc-tag">{book.nfc_tag_id || '—'}</code>
                    <p className="qr-book-title">{book.title}</p>
                    <p className="qr-book-author">{book.author}</p>
                    <div className="qr-category-row">
                      <span
                        className="qr-cat-dot"
                        style={{ background: colors.from }}
                      />
                      <span className="qr-cat-name">{book.category}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="qr-card-actions">
                    <button
                      className="btn btn-sm btn-secondary"
                      disabled={!qrDataUrl}
                      onClick={() => downloadQR(qrDataUrl, book.nfc_tag_id, book.title)}
                    >
                      {t('qr.download')}
                    </button>
                    <button
                      className="btn btn-sm btn-secondary"
                      disabled={!qrDataUrl}
                      onClick={() => printQR(qrDataUrl, book)}
                    >
                      {t('qr.print')}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
