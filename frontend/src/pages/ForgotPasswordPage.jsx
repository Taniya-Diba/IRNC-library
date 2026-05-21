import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { auth as authApi } from '../lib/api.js';
import toast from 'react-hot-toast';
import './LoginPage.css';

export default function ForgotPasswordPage() {
  const { t } = useTranslation();
  const [email, setEmail]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [sent, setSent]         = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      await authApi.forgotPassword(email);
      setSent(true);
    } catch (err) {
      toast.error(err.message || t('errors.unknownError'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page page-content">
      <div className="glass-strong auth-card">
        <div className="auth-brand-icon" aria-hidden="true">🔑</div>
        <h1 className="auth-title">{t('auth.forgotPasswordTitle')}</h1>
        <p className="auth-subtitle">{t('auth.forgotPasswordSubtitle')}</p>

        {sent ? (
          <div style={{ textAlign: 'center', marginTop: 16 }}>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.6 }}>
              {t('auth.resetLinkSent')}
            </p>
            <Link to="/login" className="btn btn-secondary" style={{ marginTop: 20, display: 'inline-block' }}>
              {t('auth.loginLink')}
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label className="form-label">{t('auth.email')}</label>
              <input
                className="form-input"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <button type="submit" className="btn btn-primary auth-submit" disabled={loading}>
              {loading ? <><span className="spinner" />{t('auth.sending')}</> : t('auth.sendResetLink')}
            </button>
          </form>
        )}

        <p className="auth-switch">
          <Link to="/login">{t('auth.loginLink')}</Link>
        </p>
      </div>
    </div>
  );
}
