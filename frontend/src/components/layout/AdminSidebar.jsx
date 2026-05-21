import { NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../hooks/useAuth.jsx';
import './AdminSidebar.css';

function IconCatalogue() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth="1.8"
         strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 6h4v12H2zM10 6h4v12h-4zM18 6h4v12h-4z"/>
    </svg>
  );
}

function IconDashboard() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth="1.8"
         strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1"/>
      <rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="3" y="14" width="7" height="7" rx="1"/>
      <rect x="14" y="14" width="7" height="7" rx="1"/>
    </svg>
  );
}

function IconBooks() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth="1.8"
         strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
    </svg>
  );
}

function IconLoans() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth="1.8"
         strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9"/>
      <polyline points="12 7 12 12 15 15"/>
    </svg>
  );
}

function IconMembers() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth="1.8"
         strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  );
}

function IconQR() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth="1.8"
         strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="6" height="6" rx="1"/>
      <rect x="15" y="3" width="6" height="6" rx="1"/>
      <rect x="3" y="15" width="6" height="6" rx="1"/>
      <path d="M15 15h2v2h-2zM19 15h2M15 19h2M19 19h2v2h-2M19 17v2"/>
    </svg>
  );
}

function IconSignOut() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth="1.8"
         strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
      <polyline points="16 17 21 12 16 7"/>
      <line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  );
}

export default function AdminSidebar() {
  const { t, i18n } = useTranslation();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const currentLang = i18n.language;

  async function handleLogout() {
    await logout();
    navigate('/');
  }

  function switchLang(lng) {
    i18n.changeLanguage(lng);
  }

  const linkClass = ({ isActive }) =>
    `sidebar-nav-item${isActive ? ' active' : ''}`;

  return (
    <aside className="admin-sidebar">

      {/* Logo mark */}
      <div className="sidebar-logo">
        <img src="/images/IRNC-logo.png" alt="IRNC" className="sidebar-logo-img" />
      </div>

      {/* Nav panel */}
      <nav className="sidebar-nav-panel glass">
        <NavLink to="/" end className={linkClass}>
          <IconCatalogue />
          <span>{t('nav.catalogue')}</span>
        </NavLink>
        <NavLink to="/admin" end className={linkClass}>
          <IconDashboard />
          <span>{t('nav.dashboard')}</span>
        </NavLink>
        <NavLink to="/admin/books" className={linkClass}>
          <IconBooks />
          <span>{t('nav.manageBooks')}</span>
        </NavLink>
        <NavLink to="/admin/loans" className={linkClass}>
          <IconLoans />
          <span>{t('nav.loans')}</span>
        </NavLink>
        <NavLink to="/admin/members" className={linkClass}>
          <IconMembers />
          <span>{t('nav.members')}</span>
        </NavLink>
        <NavLink to="/admin/qr-generator" className={linkClass}>
          <IconQR />
          <span>{t('nav.qrGenerator')}</span>
        </NavLink>
      </nav>

      {/* Bottom controls */}
      <div className="sidebar-bottom">
        <div className="sidebar-lang-toggle">
          <button
            className={`sidebar-lang-btn${currentLang === 'en' ? ' active' : ''}`}
            onClick={() => switchLang('en')}
          >
            EN
          </button>
          <button
            className={`sidebar-lang-btn${currentLang === 'fa' ? ' active' : ''}`}
            onClick={() => switchLang('fa')}
          >
            فا
          </button>
        </div>
        <button className="sidebar-signout" onClick={handleLogout}>
          <IconSignOut />
          <span>{t('nav.signOut')}</span>
        </button>
      </div>

    </aside>
  );
}
