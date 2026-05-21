import { useState, useRef, useEffect } from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../hooks/useAuth.jsx';
import './Navbar.css';

export default function Navbar() {
  const { t, i18n } = useTranslation();
  const { user, logout, isAdmin, isMember } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // Close menu on route change
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  async function handleLogout() {
    await logout();
    navigate('/');
  }

  function switchLang(lng) {
    i18n.changeLanguage(lng);
  }

  const currentLang = i18n.language;

  const navLinkClass = ({ isActive }) => isActive ? 'nav-link active' : 'nav-link';

  const links = (
    <>
      <NavLink to="/" end className={navLinkClass} onClick={() => setMenuOpen(false)}>
        {t('nav.catalogue')}
      </NavLink>
      {isMember() && (
        <NavLink to="/profile" className={navLinkClass} onClick={() => setMenuOpen(false)}>
          {t('nav.myLoans')}
        </NavLink>
      )}
      {isAdmin() && (
        <>
          <NavLink to="/admin" end className={navLinkClass} onClick={() => setMenuOpen(false)}>
            {t('nav.dashboard')}
          </NavLink>
          <NavLink to="/admin/books" className={navLinkClass} onClick={() => setMenuOpen(false)}>
            {t('nav.manageBooks')}
          </NavLink>
          <NavLink to="/admin/loans" className={navLinkClass} onClick={() => setMenuOpen(false)}>
            {t('nav.loans')}
          </NavLink>
          <NavLink to="/admin/members" className={navLinkClass} onClick={() => setMenuOpen(false)}>
            {t('nav.members')}
          </NavLink>
          <NavLink to="/admin/qr-generator" className={navLinkClass} onClick={() => setMenuOpen(false)}>
            {t('nav.qrGenerator')}
          </NavLink>
        </>
      )}
    </>
  );

  const isAdminPage = location.pathname.startsWith('/admin') &&
                      location.pathname !== '/admin/login';

  return (
    <nav
      className={`navbar glass-strong${isAdminPage ? ' navbar-admin-hidden' : ''}`}
      ref={menuRef}
    >
      <div className="navbar-inner container">
        {/* Brand */}
        <Link to="/" className="navbar-brand">
          <img src="/images/IRNC-logo.png" alt="IRNC Logo" className="navbar-icon" />
          <span className="navbar-title">IRNC Library</span>
        </Link>

        {/* Center nav links — desktop only */}
        <div className="navbar-links">
          {links}
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

          {/* Hamburger — mobile only */}
          <button
            className={`burger${menuOpen ? ' open' : ''}`}
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(prev => !prev)}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      <div className={`mobile-menu${menuOpen ? ' open' : ''}`}>
        {links}
      </div>
    </nav>
  );
}
