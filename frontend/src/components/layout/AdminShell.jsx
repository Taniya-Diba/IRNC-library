import AdminSidebar from './AdminSidebar.jsx';
import './AdminShell.css';

export default function AdminShell({ children }) {
  return (
    <div className="admin-shell">
      <AdminSidebar />
      <main className="admin-shell-main">
        {children}
      </main>
    </div>
  );
}
