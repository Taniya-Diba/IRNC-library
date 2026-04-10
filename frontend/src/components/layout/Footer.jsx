import { Link } from 'react-router-dom';
import './Footer.css';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-inner">
        <span className="footer-brand">IRNC Library</span>
        <span className="footer-sep">·</span>
        <a href="https://irnc.net" target="_blank" rel="noopener noreferrer" className="footer-link">
          irnc.net
        </a>
        <span className="footer-sep">·</span>
        <Link to="/admin/login" className="footer-link">Admin</Link>
      </div>
    </footer>
  );
}
