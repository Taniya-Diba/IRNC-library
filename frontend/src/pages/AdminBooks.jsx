import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { books as booksApi } from '../lib/api.js';
import { getCategoryColors } from '../lib/categoryColors.js';
import Modal from '../components/ui/Modal.jsx';
import FileUpload from '../components/ui/FileUpload.jsx';
import toast from 'react-hot-toast';
import './AdminBooks.css';

const CATEGORIES = [
  'Fiction', 'History', 'Technology', 'Science', 'Philosophy',
  'Psychology', 'Business', 'Biography', 'Art & Design', 'Religion',
];

function fmt(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

const EMPTY_FORM = {
  nfc_tag_id: '', title: '', author: '', translator: '',
  isbn: '', eisbn: '', category: 'Fiction', shelf_location: '', notes: '',
};

async function uploadFileDirect(endpoint, bookId, file, fieldName) {
  const token = localStorage.getItem('irnc_access_token');
  const fd = new FormData();
  fd.append(fieldName, file);
  const BASE = import.meta.env.VITE_API_URL || '';
  const res = await fetch(`${BASE}/api/uploads/${endpoint}/${bookId}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: fd,
  });
  if (!res.ok) {
    const d = await res.json().catch(() => ({}));
    throw new Error(d.error || 'Upload failed');
  }
  return res.json();
}

export default function AdminBooks() {
  const { t } = useTranslation();
  const [books, setBooks]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing]   = useState(null);
  const [form, setForm]         = useState(EMPTY_FORM);
  const [saving, setSaving]     = useState(false);
  const [locking, setLocking]   = useState({});

  // Pending files for ADD mode (immediateUpload=false)
  const [coverPending,     setCoverPending]     = useState(null);
  const [backCoverPending, setBackCoverPending] = useState(null);
  const [pdfPending,       setPdfPending]       = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await booksApi.list({ limit: 500 });
      setBooks(Array.isArray(d) ? d : d?.books || []);
    } catch {
      toast.error(t('errors.networkError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => { load(); }, [load]);

  function openAdd() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setCoverPending(null);
    setBackCoverPending(null);
    setPdfPending(null);
    setModalOpen(true);
  }

  function openEdit(book) {
    setEditing(book);
    setForm({
      nfc_tag_id:     book.nfc_tag_id     || '',
      title:          book.title          || '',
      author:         book.author         || '',
      translator:     book.translator     || '',
      isbn:           book.isbn           || '',
      eisbn:          book.eisbn          || '',
      category:       book.category       || 'Fiction',
      shelf_location: book.shelf_location || '',
      notes:          book.notes          || '',
    });
    setCoverPending(null);
    setBackCoverPending(null);
    setPdfPending(null);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditing(null);
  }

  const setField = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await booksApi.update(editing.id, form);
        // Files in EDIT mode are uploaded immediately by FileUpload itself
      } else {
        const book = await booksApi.create(form);
        const bookId = book?.id;
        if (bookId) {
          if (coverPending)     await uploadFileDirect('cover',      bookId, coverPending,     'cover_image').catch(() => {});
          if (backCoverPending) await uploadFileDirect('back-cover', bookId, backCoverPending, 'back_cover_image').catch(() => {});
          if (pdfPending)       await uploadFileDirect('pdf',        bookId, pdfPending,       'pdf').catch(() => {});
        }
      }
      toast.success(t('admin.saveBook'));
      closeModal();
      await load();
    } catch (err) {
      toast.error(err.message || t('errors.unknownError'));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(book) {
    if (book.status === 'out' || book.status === 'overdue') {
      toast.error(t('admin.cannotDelete'));
      return;
    }
    if (!window.confirm(t('admin.confirmDelete'))) return;
    try {
      await booksApi.remove(book.id);
      setBooks(bs => bs.filter(b => b.id !== book.id));
      toast.success(t('admin.delete'));
    } catch {
      toast.error(t('errors.unknownError'));
    }
  }

  async function handleLock(book) {
    setLocking(l => ({ ...l, [book.id]: true }));
    try {
      if (book.status === 'locked') {
        await booksApi.unlock(book.id);
      } else {
        await booksApi.lock(book.id);
      }
      await load();
    } catch {
      toast.error(t('errors.unknownError'));
    } finally {
      setLocking(l => ({ ...l, [book.id]: false }));
    }
  }

  const canLockUnlock = book =>
    book.status !== 'out' && book.status !== 'overdue';

  const filtered = books.filter(b =>
    !search ||
    b.title?.toLowerCase().includes(search.toLowerCase()) ||
    b.author?.toLowerCase().includes(search.toLowerCase()) ||
    b.nfc_tag_id?.toLowerCase().includes(search.toLowerCase())
  );

  const modalKey = editing ? `edit-${editing.id}` : 'add';

  return (
    <div className="page-content">
      <div className="container">
        <div className="admin-page-header">
          <h1>{t('admin.manageBooks')}</h1>
          <button className="btn btn-primary" onClick={openAdd}>{t('admin.addBook')}</button>
        </div>

        <div className="glass admin-search-bar">
          <input
            className="form-input admin-search-input"
            placeholder={t('admin.searchBooks')}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
            <div className="spinner" style={{ width: 36, height: 36 }} />
          </div>
        ) : (
          <div className="glass admin-section admin-books-table-wrap">
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>{t('admin.colQrTag')}</th>
                    <th>{t('admin.colTitle')}</th>
                    <th className="col-hide-mobile">{t('admin.colAuthor')}</th>
                    <th>{t('admin.colCategory')}</th>
                    <th className="col-hide-mobile">{t('admin.colShelf')}</th>
                    <th>{t('admin.colStatus')}</th>
                    <th>{t('admin.colAction')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(book => {
                    const colors = getCategoryColors(book.category);
                    const lockable = canLockUnlock(book);
                    return (
                      <tr key={book.id}>
                        <td>
                          <code className="admin-nfc-tag">{book.nfc_tag_id || '—'}</code>
                        </td>
                        <td className="admin-title-cell">
                          <div>{book.title}</div>
                          <div className="admin-title-author col-show-mobile">{book.author}</div>
                        </td>
                        <td className="col-hide-mobile">{book.author}</td>
                        <td>
                          <div className="admin-cat-dot-row">
                            <span
                              className="admin-cat-dot"
                              style={{ background: colors.from }}
                            />
                            <span className="col-hide-mobile">{book.category}</span>
                          </div>
                        </td>
                        <td className="col-hide-mobile">{book.shelf_location || '—'}</td>
                        <td>
                          <span className={`badge badge-${book.status}`}>
                            {t(`status.${book.status}`)}
                          </span>
                        </td>
                        <td>
                          <div className="admin-actions">
                            <button
                              className="btn btn-sm btn-secondary"
                              onClick={() => openEdit(book)}
                            >
                              {t('admin.edit')}
                            </button>
                            <button
                              className={`btn btn-sm ${book.status === 'locked' ? 'btn-secondary' : 'btn-lock'}`}
                              onClick={() => handleLock(book)}
                              disabled={locking[book.id] || !lockable}
                              title={!lockable ? t('admin.cannotDelete') : ''}
                            >
                              {locking[book.id]
                                ? <span className="spinner" />
                                : book.status === 'locked' ? t('admin.unlock') : t('admin.lock')
                              }
                            </button>
                            <button
                              className="btn btn-sm btn-danger"
                              onClick={() => handleDelete(book)}
                            >
                              {t('admin.delete')}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {filtered.length === 0 && (
                <div className="empty-state" style={{ padding: '32px 0' }}>
                  <p>{t('common.noResults')}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editing ? t('admin.editBookTitle') : t('admin.addBookTitle')}
        maxWidth={900}
      >
        <form key={modalKey} onSubmit={handleSave} className="admin-book-form">
          <div className="book-form-layout">
            {/* Left: text fields */}
            <div className="book-form-fields">
              <div className="admin-form-grid">
                <div className="form-group">
                  <label className="form-label">{t('admin.colQrTag')} *</label>
                  <input
                    className="form-input"
                    placeholder="SEED-001"
                    value={form.nfc_tag_id}
                    onChange={setField('nfc_tag_id')}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">{t('admin.colShelf')}</label>
                  <input
                    className="form-input"
                    placeholder="A1"
                    value={form.shelf_location}
                    onChange={setField('shelf_location')}
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">{t('admin.colTitle')} *</label>
                <input
                  className="form-input"
                  value={form.title}
                  onChange={setField('title')}
                  required
                />
              </div>
              <div className="admin-form-grid">
                <div className="form-group">
                  <label className="form-label">{t('admin.colAuthor')} *</label>
                  <input
                    className="form-input"
                    value={form.author}
                    onChange={setField('author')}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">
                    {t('admin.colTranslator')} <span className="form-optional">{t('common.optional')}</span>
                  </label>
                  <input
                    className="form-input"
                    value={form.translator}
                    onChange={setField('translator')}
                  />
                </div>
              </div>
              <div className="admin-form-grid">
                <div className="form-group">
                  <label className="form-label">
                    {t('admin.colIsbn')} <span className="form-optional">{t('common.optional')}</span>
                  </label>
                  <input className="form-input" value={form.isbn} onChange={setField('isbn')} />
                </div>
                <div className="form-group">
                  <label className="form-label">
                    {t('admin.colEisbn')} <span className="form-optional">{t('common.optional')}</span>
                  </label>
                  <input className="form-input" value={form.eisbn} onChange={setField('eisbn')} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">{t('admin.colCategory')}</label>
                <select className="form-select" value={form.category} onChange={setField('category')}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">
                  {t('admin.notesLabel')} <span className="form-optional">{t('common.optional')}</span>
                </label>
                <textarea
                  className="form-textarea"
                  rows={3}
                  value={form.notes}
                  onChange={setField('notes')}
                />
              </div>
            </div>

            {/* Right: file uploads */}
            <div className="book-form-files">
              <FileUpload
                key={`cover-${modalKey}`}
                label={t('admin.coverImage')}
                accept="image/jpeg,image/png,image/webp"
                maxSizeMB={5}
                isImage={true}
                bookId={editing?.id}
                uploadEndpoint="cover"
                currentUrl={editing?.cover_image_url || null}
                immediateUpload={!!editing}
                onPendingFile={setCoverPending}
              />
              <FileUpload
                key={`back-${modalKey}`}
                label={t('admin.backCover')}
                accept="image/jpeg,image/png,image/webp"
                maxSizeMB={5}
                isImage={true}
                bookId={editing?.id}
                uploadEndpoint="back-cover"
                currentUrl={editing?.back_cover_image_url || null}
                immediateUpload={!!editing}
                onPendingFile={setBackCoverPending}
              />
              <FileUpload
                key={`pdf-${modalKey}`}
                label={t('admin.pdfFile')}
                accept="application/pdf"
                maxSizeMB={50}
                isImage={false}
                bookId={editing?.id}
                uploadEndpoint="pdf"
                currentUrl={null}
                currentPath={editing?.pdf_path || null}
                immediateUpload={!!editing}
                onPendingFile={setPdfPending}
              />
            </div>
          </div>

          <div className="admin-modal-footer">
            <button type="button" className="btn btn-secondary" onClick={closeModal}>
              {t('common.cancel')}
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving
                ? <><span className="spinner" style={{ width: 14, height: 14, marginInlineEnd: 6 }} />{t('admin.saving')}</>
                : t('admin.saveBook')
              }
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
