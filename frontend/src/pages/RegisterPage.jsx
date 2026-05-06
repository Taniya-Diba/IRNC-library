import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth.jsx';
import toast from 'react-hot-toast';
import './LoginPage.css';
import './RegisterPage.css';

export default function RegisterPage() {
  const { t } = useTranslation();
  const { register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({
    full_name: '', email: '', password: '', confirmPassword: '', phone: '', membership_id: ''
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  function set(field) {
    return e => setForm(f => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const newErrors = {};
    if (form.password.length < 8) newErrors.password = t('errors.unknownError');
    if (form.password !== form.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
    if (Object.keys(newErrors).length) { setErrors(newErrors); return; }
    setErrors({});
    setLoading(true);
    try {
      const u = await register({
        full_name: form.full_name,
        email: form.email,
        password: form.password,
        phone: form.phone,
        membership_id: form.membership_id,
      });
      const dest = location.state?.from?.pathname || location.state?.from || '/';
      navigate(dest, { replace: true });
    } catch (err) {
      const msg = err.message || '';
      if (msg.toLowerCase().includes('membership') || msg.toLowerCase().includes('already registered')) {
        setErrors({ membership_id: t('errors.membershipTaken') });
      } else if (msg.toLowerCase().includes('email') || msg.toLowerCase().includes('already exists')) {
        setErrors({ email: t('errors.emailTaken') });
      } else {
        toast.error(msg || t('errors.unknownError'));
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page page-content">
      <div className="glass-strong auth-card auth-register-wide">
        <div className="auth-brand-icon" aria-hidden="true">📚</div>
        <h1 className="auth-title">{t('auth.registerTitle')}</h1>
        <p className="auth-subtitle">{t('auth.registerSubtitle')}</p>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label className="form-label">{t('auth.fullName')}</label>
            <input className="form-input" placeholder={t('auth.fullNamePlaceholder')} value={form.full_name} onChange={set('full_name')} required />
          </div>
          <div className="form-group">
            <label className="form-label">{t('auth.email')}</label>
            <input className="form-input" type="email" value={form.email} onChange={set('email')} required autoComplete="email" />
            {errors.email && <p className="form-error">{errors.email}</p>}
          </div>
          <div className="form-group">
            <label className="form-label">{t('auth.password')}</label>
            <input className="form-input" type="password" value={form.password} onChange={set('password')} required minLength={8} autoComplete="new-password" />
            {errors.password && <p className="form-error">{errors.password}</p>}
          </div>
          <div className="form-group">
            <label className="form-label">{t('auth.confirmPassword')}</label>
            <input className="form-input" type="password" value={form.confirmPassword} onChange={set('confirmPassword')} required autoComplete="new-password" />
            {errors.confirmPassword && <p className="form-error">{errors.confirmPassword}</p>}
          </div>
          <div className="form-group">
            <label className="form-label">{t('auth.phone')}</label>
            <input className="form-input" type="tel" placeholder={t('auth.phonePlaceholder')} value={form.phone} onChange={set('phone')} required />
          </div>
          <div className="form-group">
            <label className="form-label">{t('auth.membershipId')}</label>
            <input className="form-input" placeholder={t('auth.membershipPlaceholder')} value={form.membership_id} onChange={set('membership_id')} required />
            <p className="form-hint">{t('auth.membershipHint')}</p>
            {errors.membership_id && <p className="form-error">{errors.membership_id}</p>}
          </div>

          <button type="submit" className="btn btn-primary auth-submit" disabled={loading}>
            {loading ? <><span className="spinner" />{t('auth.registering')}</> : t('auth.registerBtn')}
          </button>
        </form>

        <p className="auth-switch">
          {t('auth.haveAccount')}{' '}
          <Link to="/login" state={location.state}>{t('auth.loginLink')}</Link>
        </p>
      </div>
    </div>
  );
}
