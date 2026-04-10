import { useState, useEffect } from 'react';
import { books as booksApi } from '../lib/api.js';
import Modal   from '../components/ui/Modal.jsx';
import toast   from 'react-hot-toast';
import './AdminBooks.css';

const GENRES = ['Fiction','History','Technology','Science','Philosophy','Psychology','Business','Biography','Other'];
const EMPTY_FORM = { nfc_tag_id:'', title:'', author:'', isbn:'', genre:'', shelf_location:'', cover_url:'', notes:'' };

function BookForm({ initial = EMPTY_FORM, onSave, onCancel, saving }) {
  const [form, setForm] = useState(initial);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.nfc_tag_id.trim()) { toast.error('NFC Tag ID is required'); return; }
    if (!form.title.trim())      { toast.error('Title is required'); return; }
    if (!form.author.trim())     { toast.error('Author is required'); return; }
    onSave(form);
  }

  return (
    <form onSubmit={handleSubmit} className="book-form">
      <div className="form-row-2">
        <div className="form-group">
          <label className="form-label">NFC Tag ID <span style={{color:'var(--color-danger)'}}>*</span></label>
          <input className="form-input" value={form.nfc_tag_id} onChange={e=>set('nfc_tag_id',e.target.value)} placeholder="LIB-0001" required />
        </div>
        <div className="form-group">
          <label className="form-label">Shelf location</label>
          <input className="form-input" value={form.shelf_location} onChange={e=>set('shelf_location',e.target.value)} placeholder="A1" />
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">Title <span style={{color:'var(--color-danger)'}}>*</span></label>
        <input className="form-input" value={form.title} onChange={e=>set('title',e.target.value)} placeholder="Book title" required />
      </div>
      <div className="form-group">
        <label className="form-label">Author <span style={{color:'var(--color-danger)'}}>*</span></label>
        <input className="form-input" value={form.author} onChange={e=>set('author',e.target.value)} placeholder="Author name" required />
      </div>
      <div className="form-row-2">
        <div className="form-group">
          <label className="form-label">ISBN</label>
          <input className="form-input" value={form.isbn} onChange={e=>set('isbn',e.target.value)} placeholder="978-0-000-00000-0" />
        </div>
        <div className="form-group">
          <label className="form-label">Genre</label>
          <select className="form-select" value={form.genre} onChange={e=>set('genre',e.target.value)}>
            <option value="">Select genre</option>
            {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">Cover image URL</label>
        <input className="form-input" value={form.cover_url} onChange={e=>set('cover_url',e.target.value)} placeholder="https://…" type="url" />
      </div>
      <div className="form-group">
        <label className="form-label">Notes</label>
        <textarea className="form-textarea" value={form.notes} onChange={e=>set('notes',e.target.value)} placeholder="Any notes about this book…" rows={2} />
      </div>
      <div className="form-actions">
        <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? <><span className="spinner" style={{width:14,height:14}} /> Saving…</> : 'Save book'}
        </button>
      </div>
    </form>
  );
}

export default function AdminBooks() {
  const [bookList, setBookList]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [showAdd, setShowAdd]     = useState(false);
  const [editBook, setEditBook]   = useState(null);
  const [saving, setSaving]       = useState(false);
  const [deleting, setDeleting]   = useState(null);

  async function load(q = '') {
    setLoading(true);
    try {
      const res = await booksApi.list({ search: q, limit: 200 });
      setBookList(res.data || []);
    } catch (err) {
      toast.error('Failed to load books');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleAdd(form) {
    setSaving(true);
    try {
      await booksApi.create(form);
      toast.success('Book added!');
      setShowAdd(false);
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleEdit(form) {
    setSaving(true);
    try {
      await booksApi.update(editBook.id, form);
      toast.success('Book updated!');
      setEditBook(null);
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(book) {
    if (!confirm(`Delete "${book.title}"? This cannot be undone.`)) return;
    setDeleting(book.id);
    try {
      await booksApi.remove(book.id);
      toast.success('Book deleted');
      setBookList(bl => bl.filter(b => b.id !== book.id));
    } catch (err) {
      toast.error(err.message);
    } finally {
      setDeleting(null);
    }
  }

  const filtered = bookList.filter(b =>
    !search ||
    b.title.toLowerCase().includes(search.toLowerCase()) ||
    b.author.toLowerCase().includes(search.toLowerCase()) ||
    b.nfc_tag_id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <main className="page-content">
      <div className="container">
        <div className="admin-books-header">
          <h1>Manage books</h1>
          <button className="btn btn-primary" onClick={() => setShowAdd(true)}>+ Add book</button>
        </div>

        <div className="admin-books-toolbar">
          <div className="search-input-wrap" style={{ flex: 1 }}>
            <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              type="search"
              className="form-input search-input"
              placeholder="Search books…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <span className="books-count">{filtered.length} book{filtered.length !== 1 ? 's' : ''}</span>
        </div>

        {loading ? (
          <div style={{ display:'flex', justifyContent:'center', paddingTop:60 }}><div className="spinner" /></div>
        ) : (
          <div className="table-wrap">
            <table className="admin-books-table">
              <thead>
                <tr>
                  <th>NFC tag</th>
                  <th>Title</th>
                  <th>Author</th>
                  <th>Genre</th>
                  <th>Shelf</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(book => (
                  <tr key={book.id}>
                    <td><code className="nfc-code">{book.nfc_tag_id}</code></td>
                    <td className="book-title-cell">{book.title}</td>
                    <td>{book.author}</td>
                    <td>{book.genre || '—'}</td>
                    <td>{book.shelf_location || '—'}</td>
                    <td><span className={`badge badge-${book.status}`}>{book.status === 'in' ? 'Available' : 'Out'}</span></td>
                    <td>
                      <div className="row-actions">
                        <button className="btn btn-secondary btn-sm" onClick={() => setEditBook(book)}>Edit</button>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => handleDelete(book)}
                          disabled={deleting === book.id}
                        >
                          {deleting === book.id ? <span className="spinner" style={{width:12,height:12}} /> : 'Delete'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={7} style={{textAlign:'center',padding:'40px',color:'var(--color-text-subtle)'}}>No books found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add new book" width={580}>
        <BookForm onSave={handleAdd} onCancel={() => setShowAdd(false)} saving={saving} />
      </Modal>

      {/* Edit modal */}
      <Modal open={!!editBook} onClose={() => setEditBook(null)} title="Edit book" width={580}>
        {editBook && (
          <BookForm initial={editBook} onSave={handleEdit} onCancel={() => setEditBook(null)} saving={saving} />
        )}
      </Modal>
    </main>
  );
}
