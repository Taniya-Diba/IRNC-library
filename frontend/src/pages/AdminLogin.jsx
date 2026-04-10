import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';
import toast from 'react-hot-toast';
import './AdminLogin.css';

export default function AdminLogin() {
  const { admin, login } = useAuth();
  const navigate         = useNavigate();
  const [form, setForm]  = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);

  if (admin) return <Navigate to="/admin" replace />;

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      await login(form.email, form.password);
      toast.success('Welcome back!');
      navigate('/admin');
    } catch {
      toast.error('Invalid email or password');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page-content">
      <div className="login-wrap">
        <div className="login-card card">
          <div className="login-header">
            <div className="login-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
              </svg>
            </div>
            <h1>Admin sign in</h1>
            <p>IRNC Library management</p>
          </div>

          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label className="form-label" htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                className="form-input"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="you@example.com"
                required
                autoFocus
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                className="form-input"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                placeholder="••••••••"
                required
              />
            </div>
            <button type="submit" className="btn btn-primary btn-lg login-btn" disabled={loading}>
              {loading ? <><span className="spinner" style={{width:16,height:16}} /> Signing in…</> : 'Sign in'}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
