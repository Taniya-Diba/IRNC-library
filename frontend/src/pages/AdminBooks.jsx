import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { books as booksApi } from '../lib/api.js';
import { getCategoryGradient } from '../lib/categoryColors.js';
import Modal from '../components/ui/Modal.jsx';
import toast from 'react-hot-toast';
import './AdminBooks.css';

const CATEGORIES = ['Fiction','History','Technology','Science','Philosophy','Psychology','Business','Biography','Art & Design','Religion'];

function fmt(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

const EMPTY_FORM = {
  nfc_tag_id: '', title: '', author: '', translator: '',
  isbn: '', eisbn: '', category: 'Fiction', shelf_location: '', notes: ''
};

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
  const [coverFile, setCoverFile]     = useState(null);
  const [backCoverFile, setBackCoverFile] = useState(null);
  const [pdfFile, setPdfFile]   = useState(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const d = await booksApi.list({ limit: 200 });
      setBooks(Array.isArray(d) ? d : d?.books || []);
    } catch {
      toast.error(t('errors.networkError'));
    } finally {
      setLoading(false);
    }
  }

  function openAdd() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setCoverFile(null); setBackCoverFile(null); setPdfFile(null);
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
    setCoverFile(null); setBackCoverFile(null); setPdfFile(null);
    setModalOpen(true);
  }

  function setField(k) { return e => setForm(f => ({ ...f, [k]: e.target.value })); }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      let book;
      if (editing) {
        book = await booksApi.update(editing.id, form);
      } else {
        book = await booksApi.create(form);
      }
      const bookId = book?.id || editing?.id;
      if (bookId) {
        if (coverFile)     await booksApi.uploadCover(bookId, coverFile).catch(() => {});
        if (backCoverFile) await booksApi.uploadBackCover(bookId, backCoverFile).catch(() => {});
        if (pdfFile)       await booksApi.uploadPdf(bookId, pdfFile).catch(() => {});
      }
      toast.success(t('admin.saveBook'));
      setModalOpen(false);
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

  const filtered = books.filter(b =>
    !search || b.title?.toLowerCase().includes(search.toLowerCase()) ||
    b.author?.toLowerCase().includes(search.toLowerCase()) ||
    b.nfc_tag_id?.toLowerCase().includes(search.toLowerCase())
  );

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
                    <th>{t('admin.colAuthor')}</th>
                    <th>{t('admin.colCategory')}</th>
                    <th>{t('admin.colShelf')}</th>
                    <th>{t('admin.colStatus')}</th>
                    <th>{t('admin.colAction')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(book => (
                    <tr key={book.id}>
                      <td><code className="admin-nfc-tag">{book.nfc_tag_id || '—'}</code></td>
                      <td className="admin-title-cell">{book.title}</td>
                      <td>{book.author}</td>
                      <td>
                        <span
                          className="admin-cat-pill"
                          style={{ background: getCategoryGradient(book.category) }}
                        >
                          {book.category}
                        </span>
                      </td>
                      <td>{book.shelf_location || '—'}</td>
                      <td><span className={`badge badge-${book.status}`}>{t(`status.${book.status}`)}</span></td>
                      <td>
                        <div className="admin-actions">
                          <button className="btn btn-sm btn-secondary" onClick={() => openEdit(book)}>
                            {t('admin.edit')}
                          </button>
                          <button
                            className="btn btn-sm btn-secondary"
                            onClick={() => handleLock(book)}
                            disabled={
                              locking[book.id] ||
                              book.status === 'out' ||
                              book.status === 'overdue'
                            }
                            title={
                              (book.status === 'out' || book.status === 'overdue')
                                ? t('admin.cannotDelete') : ''
                            }
                          >
                            {locking[book.id]
                              ? <span className="spinner" />
                              : book.status === 'locked' ? t('admin.unlock') : t('admin.lock')
                            }
                          </button>
                          <button className="btn btn-sm btn-danger" onClick={() => handleDelete(book)}>
                            {t('admin.delete')}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
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

      {/* Add/Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? t('admin.editBookTitle') : t('admin.addBookTitle')}
        maxWidth={600}
      >
        <form onSubmit={handleSave} className="admin-book-form">
          <div className="admin-form-grid">
            <div className="form-group">
              <label className="form-label">{t('admin.colQrTag')}</label>
              <input className="form-input" value={form.nfc_tag_id} onChange={setField('nfc_tag_id')} />
            </div>
            <div className="form-group">
              <label className="form-label">{t('admin.colShelf')}</label>
              <input className="form-input" value={form.shelf_location} onChange={setField('shelf_location')} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">{t('admin.colTitle')} *</label>
            <input className="form-input" value={form.title} onChange={setField('title')} required />
          </div>
          <div className="admin-form-grid">
            <div className="form-group">
              <label className="form-label">{t('admin.colAuthor')} *</label>
              <input className="form-input" value={form.author} onChange={setField('author')} required />
            </div>
            <div className="form-group">
              <label className="form-label">{t('admin.colTranslator')}</label>
              <input className="form-input" value={form.translator} onChange={setField('translator')} />
            </div>
          </div>
          <div className="admin-form-grid">
            <div className="form-group">
              <label className="form-label">{t('admin.colIsbn')}</label>
              <input className="form-input" value={form.isbn} onChange={setField('isbn')} />
            </div>
            <div className="form-group">
              <label className="form-label">{t('admin.colEisbn')}</label>
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
            <label className="form-label">{t('admin.notesLabel')}</label>
            <textarea className="form-textarea" value={form.notes} onChange={setField('notes')} />
          </div>
          <div className="admin-form-grid">
            <div className="form-group">
              <label className="form-label">{t('admin.coverImage')}</label>
              <input type="file" accept="image/*" onChange={e => setCoverFile(e.target.files[0])} />
            </div>
            <div className="form-group">
              <label className="form-label">{t('admin.backCover')}</label>
              <input type="file" accept="image/*" onChange={e => setBackCoverFile(e.target.files[0])} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">{t('admin.pdfFile')}</label>
            <input type="file" accept="application/pdf" onChange={e => setPdfFile(e.target.files[0])} />
          </div>
          <div className="admin-modal-footer">
            <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>
              {t('common.cancel')}
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? <><span className="spinner" />{t('admin.saving')}</> : t('admin.saveBook')}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
