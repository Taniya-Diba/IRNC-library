import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../hooks/useAuth.jsx';
import './Navbar.css';

export default function Navbar() {
  const { t, i18n } = useTranslation();
  const { user, logout, isAdmin, isMember } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/');
  }

  function switchLang(lng) {
    i18n.changeLanguage(lng);
  }

  const currentLang = i18n.language;

  return (
    <nav className="navbar glass-strong">
      <div className="navbar-inner container">
        {/* Brand */}
        <Link to="/" className="navbar-brand">
          <div className="navbar-icon" aria-hidden="true">📚</div>
          <span className="navbar-title">IRNC Library</span>
        </Link>

        {/* Center nav links (hidden on mobile) */}
        <div className="navbar-links">
          <NavLink to="/" end className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
            {t('nav.catalogue')}
          </NavLink>
          {isMember() && (
            <NavLink to="/profile" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
              {t('nav.myLoans')}
            </NavLink>
          )}
          {isAdmin() && (
            <>
              <NavLink to="/admin" end className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                {t('nav.dashboard')}
              </NavLink>
              <NavLink to="/admin/books" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                {t('nav.manageBooks')}
              </NavLink>
              <NavLink to="/admin/loans" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                {t('nav.loans')}
              </NavLink>
              <NavLink to="/admin/members" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                {t('nav.members')}
              </NavLink>
              <NavLink to="/admin/qr-generator" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                {t('nav.qrGenerator')}
              </NavLink>
            </>
          )}
        </div>

        {/* Right section */}
        <div className="navbar-right">
          {/* Language toggle */}
          <div className="lang-toggle">
            <button
              className={`lang-btn${currentLang === 'en' ? ' active' : ''}`}
              onClick={() => switchLang('en')}
            >
              EN
            </button>
            <button
              className={`lang-btn${currentLang === 'fa' ? ' active' : ''}`}
              onClick={() => switchLang('fa')}
            >
              فا
            </button>
          </div>

          {user ? (
            <div className="navbar-user">
              <span className="navbar-user-name">{user.full_name?.split(' ')[0] || user.email}</span>
              <button className="btn btn-secondary btn-sm" onClick={handleLogout}>
                {t('nav.signOut')}
              </button>
            </div>
          ) : (
            <Link to="/login" className="btn btn-primary btn-sm">
              {t('nav.signIn')}
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
