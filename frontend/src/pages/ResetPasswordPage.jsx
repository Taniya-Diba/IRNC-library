import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { auth as authApi } from '../lib/api.js';
import toast from 'react-hot-toast';
import './LoginPage.css';
import './RegisterPage.css';

function getPasswordStrength(password) {
  if (!password || password.length < 8) return 'weak';
  if (password.length < 12)             return 'fair';
  return 'strong';
}

export default function ResetPasswordPage() {
  const { t } = useTranslation();
  const [accessToken, setAccessToken] = useState(null);
  const [tokenType, setTokenType]     = useState(null);
  const [form, setForm]               = useState({ password: '', confirm: '' });
  const [error, setError]             = useState('');
  const [loading, setLoading]         = useState(false);
  const [done, setDone]               = useState(false);

  useEffect(() => {
    const hash  = new URLSearchParams(window.location.hash.slice(1));
    const token = hash.get('access_token');
    const type  = hash.get('type');
    setAccessToken(token);
    setTokenType(type);
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (form.password.length < 8) {
      setError(t('auth.passwordHint'));
      return;
    }
    if (form.password.length > 72) {
      setError('Password must be 72 characters or fewer');
      return;
    }
    if (form.password !== form.confirm) {
      setError(t('auth.passwordsNoMatch'));
      return;
    }

    setLoading(true);
    try {
      await authApi.resetPassword(accessToken, form.password);
      setDone(true);
    } catch (err) {
      toast.error(err.message || t('errors.unknownError'));
    } finally {
      setLoading(false);
    }
  }

  const strength = getPasswordStrength(form.password);

  if (!accessToken || tokenType !== 'recovery') {
    return (
      <div className="auth-page page-content">
        <div className="glass-strong auth-card">
          <div className="auth-brand-icon" aria-hidden="true">⚠️</div>
          <h1 className="auth-title">{t('auth.invalidResetLink')}</h1>
          <p className="auth-subtitle" style={{ textAlign: 'center', marginTop: 8 }}>
            <Link to="/forgot-password" className="forgot-password-link">
              {t('auth.requestNewLink')}
            </Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page page-content">
      <div className="glass-strong auth-card">
        <div className="auth-brand-icon" aria-hidden="true">🔑</div>
        <h1 className="auth-title">{t('auth.forgotPasswordTitle')}</h1>

        {done ? (
          <div style={{ textAlign: 'center', marginTop: 16 }}>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.6 }}>
              {t('auth.passwordUpdated')}
            </p>
            <Link to="/login" className="btn btn-primary" style={{ marginTop: 20, display: 'inline-block' }}>
              {t('auth.loginBtn')}
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label className="form-label">{t('auth.newPassword')}</label>
              <input
                className="form-input"
                type="password"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                required
                autoComplete="new-password"
              />
              {form.password && (
                <div className="password-strength">
                  <div className={`strength-bar strength-${strength}`} />
                  <span className={`strength-label strength-label-${strength}`}>
                    {t(`auth.passwordStrength.${strength}`)}
                  </span>
                </div>
              )}
              <p className="form-hint">{t('auth.passwordHint')}</p>
            </div>

            <div className="form-group">
              <label className="form-label">{t('auth.confirmNewPassword')}</label>
              <input
                className="form-input"
                type="password"
                value={form.confirm}
                onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))}
                required
                autoComplete="new-password"
              />
            </div>

            {error && <p className="form-error">{error}</p>}

            <button type="submit" className="btn btn-primary auth-submit" disabled={loading}>
              {loading ? <><span className="spinner" />{t('auth.updating')}</> : t('auth.updatePassword')}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
