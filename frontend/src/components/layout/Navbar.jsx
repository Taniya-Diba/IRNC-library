import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.jsx';
import './Navbar.css';

export default function Navbar() {
  const { admin, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/');
  }

  return (
    <header className="navbar">
      <div className="container navbar-inner">
        <Link to="/" className="navbar-brand">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
          </svg>
          <span>IRNC Library</span>
        </Link>

        <nav className="navbar-links">
          <NavLink to="/" end className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
            Catalogue
          </NavLink>
          {admin && (
            <>
              <NavLink to="/admin" end className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                Dashboard
              </NavLink>
              <NavLink to="/admin/books" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                Manage Books
              </NavLink>
              <NavLink to="/admin/loans" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                Loans
              </NavLink>
            </>
          )}
        </nav>

        <div className="navbar-actions">
          {admin ? (
            <button onClick={handleLogout} className="btn btn-secondary btn-sm">
              Sign out
            </button>
          ) : (
            <Link to="/admin/login" className="btn btn-secondary btn-sm">
              Admin
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
