import { useState, useRef, useEffect } from 'react';
import toast from 'react-hot-toast';
import './FileUpload.css';

export default function FileUpload({
  accept = 'image/jpeg,image/png,image/webp',
  maxSizeMB = 5,
  label,
  hint,
  currentUrl,
  currentPath,
  onUpload,
  onRemove,
  bookId,
  uploadEndpoint,
  disabled = false,
  isImage = true,
  immediateUpload = true,
  onPendingFile,
}) {
  const [uiState, setUiState] = useState('empty'); // 'empty' | 'uploading' | 'file'
  const [fileUrl, setFileUrl] = useState(null);
  const [fileName, setFileName] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [progress, setProgress] = useState(0);
  const inputRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    if (currentUrl) {
      setFileUrl(currentUrl);
      setFileName(null);
      setUiState('file');
    } else if (currentPath) {
      setFileUrl(null);
      setFileName(currentPath.split('/').pop() || 'file');
      setUiState('file');
    }
  }, [currentUrl, currentPath]);

  function validate(file) {
    const types = accept.split(',').map(t => t.trim());
    const typeOk = types.some(t => {
      if (t.endsWith('/*')) return file.type.startsWith(t.slice(0, -2));
      return file.type === t;
    });
    if (!typeOk) { toast.error('File type not allowed'); return false; }
    if (file.size > maxSizeMB * 1024 * 1024) {
      toast.error(`File too large (max ${maxSizeMB} MB)`);
      return false;
    }
    return true;
  }

  function startFakeProgress() {
    setProgress(0);
    let p = 0;
    timerRef.current = setInterval(() => {
      p = Math.min(p + Math.random() * 12, 90);
      setProgress(p);
    }, 150);
  }

  async function processFile(file) {
    if (!validate(file)) return;

    if (!immediateUpload) {
      const url = URL.createObjectURL(file);
      setFileUrl(url);
      setFileName(file.name);
      setUiState('file');
      onPendingFile?.(file);
      return;
    }

    if (!bookId) {
      toast.error('Save the book record first before uploading files.');
      return;
    }

    setUiState('uploading');
    startFakeProgress();

    try {
      const token = localStorage.getItem('irnc_access_token');
      const fd = new FormData();
      const field =
        uploadEndpoint === 'cover'      ? 'cover_image' :
        uploadEndpoint === 'back-cover' ? 'back_cover_image' : 'pdf';
      fd.append(field, file);

      const BASE = import.meta.env.VITE_API_URL || '';
      const res = await fetch(`${BASE}/api/uploads/${uploadEndpoint}/${bookId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });

      clearInterval(timerRef.current);

      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || 'Upload failed');
      }

      const d = await res.json();
      const url  = d.cover_image_url || d.back_cover_image_url || d.pdf_url || null;
      const path = d.cover_image_path || d.back_cover_image_path || d.pdf_path || null;

      setFileUrl(url);
      setFileName(file.name);
      setProgress(100);
      setUiState('file');
      onUpload?.({ path, url });
    } catch (err) {
      clearInterval(timerRef.current);
      setUiState('empty');
      toast.error(err.message || 'Upload failed');
    }
  }

  async function removeFile() {
    if (!bookId || !immediateUpload) {
      setFileUrl(null);
      setFileName(null);
      setUiState('empty');
      onPendingFile?.(null);
      onRemove?.();
      return;
    }

    try {
      const token = localStorage.getItem('irnc_access_token');
      const BASE = import.meta.env.VITE_API_URL || '';
      const res = await fetch(`${BASE}/api/uploads/${uploadEndpoint}/${bookId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || 'Remove failed');
      }
      setFileUrl(null);
      setFileName(null);
      setUiState('empty');
      onRemove?.();
    } catch (err) {
      toast.error(err.message || 'Could not remove file');
    }
  }

  const onDragOver  = e => { e.preventDefault(); setDragOver(true); };
  const onDragLeave = () => setDragOver(false);
  const onDrop      = e => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) processFile(f);
  };
  const onChange = e => {
    const f = e.target.files[0];
    if (f) processFile(f);
    e.target.value = '';
  };

  /* ── Uploading state ── */
  if (uiState === 'uploading') {
    return (
      <div className="file-upload">
        {label && <span className="file-upload-label">{label}</span>}
        <div className="upload-progress">
          <div className="spinner" style={{ width: 28, height: 28 }} />
          <span className="upload-progress-text">Uploading…</span>
          <div className="progress-bar-track">
            <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
          </div>
        </div>
        {hint && <span className="file-upload-hint">{hint}</span>}
      </div>
    );
  }

  /* ── File exists state ── */
  if (uiState === 'file') {
    const displayName = fileName || (fileUrl ? fileUrl.split('/').pop() : 'file');
    return (
      <div className="file-upload">
        {label && <span className="file-upload-label">{label}</span>}
        <div className="file-preview">
          {isImage && fileUrl ? (
            <img className="file-preview-img" src={fileUrl} alt={label || 'Preview'} />
          ) : (
            <div className="file-preview-pdf">
              <div className="pdf-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20 2H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-8.5 7.5c0 .83-.67 1.5-1.5 1.5H9v2H7.5V7H10c.83 0 1.5.67 1.5 1.5v1zm5 2c0 .83-.67 1.5-1.5 1.5h-2.5V7H15c.83 0 1.5.67 1.5 1.5v3zm4-3H19v1h1.5V11H19v2h-1.5V7h3v1.5z"/>
                </svg>
              </div>
              <div className="pdf-info">
                <div className="pdf-name">{displayName}</div>
                <div className="pdf-size">PDF document</div>
              </div>
            </div>
          )}
          <div className="file-preview-overlay">
            <button
              type="button"
              className="btn btn-sm btn-secondary"
              disabled={disabled}
              onClick={() => inputRef.current?.click()}
            >
              Replace
            </button>
            <button
              type="button"
              className="btn btn-sm btn-danger"
              disabled={disabled}
              onClick={removeFile}
            >
              Remove
            </button>
          </div>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          style={{ display: 'none' }}
          onChange={onChange}
          disabled={disabled}
        />
        {hint && <span className="file-upload-hint">{hint}</span>}
      </div>
    );
  }

  /* ── Empty / drop zone state ── */
  return (
    <div className="file-upload">
      {label && <span className="file-upload-label">{label}</span>}
      <div
        className={`drop-zone${dragOver ? ' drag-over' : ''}`}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => !disabled && inputRef.current?.click()}
      >
        <div className="drop-zone-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="16 16 12 12 8 16" />
            <line x1="12" y1="12" x2="12" y2="21" />
            <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
          </svg>
        </div>
        <div className="drop-zone-text">Drop file here or click to browse</div>
        <div className="drop-zone-sub">
          Accepts {isImage ? 'JPG, PNG, WEBP' : 'PDF'} · Max {maxSizeMB}MB
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        style={{ display: 'none' }}
        onChange={onChange}
        disabled={disabled}
      />
      {hint && <span className="file-upload-hint">{hint}</span>}
    </div>
  );
}
