import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth.jsx';
import toast from 'react-hot-toast';
import './LoginPage.css';

export default function LoginPage() {
  const { t } = useTranslation();
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  // Already logged in
  if (user) {
    const dest = user.role === 'admin' ? '/admin' : (location.state?.from?.pathname || location.state?.from || '/');
    navigate(dest, { replace: true });
    return null;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const u = await login(email, password);
      const dest = u.role === 'admin'
        ? '/admin'
        : (location.state?.from?.pathname || location.state?.from || '/');
      navigate(dest, { replace: true });
    } catch (err) {
      setError(t('errors.invalidCredentials'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page page-content">
      <div className="glass-strong auth-card">
        {/* Brand icon */}
        <div className="auth-brand-icon" aria-hidden="true">📚</div>
        <h1 className="auth-title">{t('auth.loginTitle')}</h1>
        <p className="auth-subtitle">{t('auth.loginSubtitle')}</p>

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
          <div className="form-group">
            <label className="form-label">{t('auth.password')}</label>
            <input
              className="form-input"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          {error && <p className="form-error auth-error">{error}</p>}

          <button type="submit" className="btn btn-primary auth-submit" disabled={loading}>
            {loading ? <><span className="spinner" />{t('auth.loggingIn')}</> : t('auth.loginBtn')}
          </button>
        </form>

        <p className="auth-switch">
          {t('auth.noAccount')}{' '}
          <Link to="/register" state={location.state}>{t('auth.registerLink')}</Link>
        </p>
      </div>
    </div>
  );
}
