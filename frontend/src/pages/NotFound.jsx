import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <main className="page-content">
      <div className="container">
        <div className="empty-state" style={{ paddingTop: 80 }}>
          <div className="empty-state-icon">404</div>
          <h3>Page not found</h3>
          <p>This page does not exist.</p>
          <Link to="/" className="btn btn-primary" style={{ marginTop: 20 }}>
            Back to catalogue
          </Link>
        </div>
      </div>
    </main>
  );
}
