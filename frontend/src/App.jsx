import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth.jsx';
import Navbar from './components/layout/Navbar.jsx';

import CataloguePage    from './pages/CataloguePage.jsx';
import BookPage         from './pages/BookPage.jsx';
import CheckoutPage     from './pages/CheckoutPage.jsx';
import LoginPage        from './pages/LoginPage.jsx';
import RegisterPage     from './pages/RegisterPage.jsx';
import UserProfilePage  from './pages/UserProfilePage.jsx';
import AdminDashboard   from './pages/AdminDashboard.jsx';
import AdminBooks       from './pages/AdminBooks.jsx';
import AdminLoans       from './pages/AdminLoans.jsx';
import AdminMembers       from './pages/AdminMembers.jsx';
import AdminQRGenerator  from './pages/AdminQRGenerator.jsx';
import NotFound           from './pages/NotFound.jsx';

function LoadingScreen() {
  return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="spinner" style={{ width: 32, height: 32 }} />
    </div>
  );
}

function AdminRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user || user.role !== 'admin') return <Navigate to="/admin/login" replace />;
  return children;
}

function MemberRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  return children;
}

function AdminLoginRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (user?.role === 'admin') return <Navigate to="/admin" replace />;
  return <Navigate to="/login" replace />;
}

function AppRoutes() {
  return (
    <>
      <Navbar />
      <Routes>
        {/* Public */}
        <Route path="/"           element={<CataloguePage />} />
        <Route path="/book/:id"   element={<BookPage />} />
        <Route path="/book"       element={<BookPage />} />
        <Route path="/checkout"   element={<CheckoutPage />} />

        {/* Auth */}
        <Route path="/login"      element={<LoginPage />} />
        <Route path="/register"   element={<RegisterPage />} />

        {/* Member */}
        <Route path="/profile"    element={<MemberRoute><UserProfilePage /></MemberRoute>} />

        {/* Admin */}
        <Route path="/admin/login"   element={<AdminLoginRedirect />} />
        <Route path="/admin"         element={<AdminRoute><AdminDashboard /></AdminRoute>} />
        <Route path="/admin/books"   element={<AdminRoute><AdminBooks /></AdminRoute>} />
        <Route path="/admin/loans"   element={<AdminRoute><AdminLoans /></AdminRoute>} />
        <Route path="/admin/members"       element={<AdminRoute><AdminMembers /></AdminRoute>} />
        <Route path="/admin/qr-generator" element={<AdminRoute><AdminQRGenerator /></AdminRoute>} />

        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
