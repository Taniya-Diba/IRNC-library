import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth.jsx';
import Navbar        from './components/layout/Navbar.jsx';
import Footer        from './components/layout/Footer.jsx';
import CataloguePage from './pages/CataloguePage.jsx';
import BookPage      from './pages/BookPage.jsx';
import CheckoutPage  from './pages/CheckoutPage.jsx';
import AdminLogin    from './pages/AdminLogin.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import AdminBooks    from './pages/AdminBooks.jsx';
import AdminLoans    from './pages/AdminLoans.jsx';
import NotFound      from './pages/NotFound.jsx';

function ProtectedRoute({ children }) {
  const { admin, loading } = useAuth();
  if (loading) return <div className="page-content container" style={{display:'flex',justifyContent:'center',paddingTop:120}}><div className="spinner" /></div>;
  if (!admin) return <Navigate to="/admin/login" replace />;
  return children;
}

function AppRoutes() {
  return (
    <>
      <Navbar />
      <Routes>
        {/* Public */}
        <Route path="/"              element={<CataloguePage />} />
        <Route path="/book"          element={<BookPage />} />
        <Route path="/book/:id"      element={<BookPage />} />
        <Route path="/checkout"      element={<CheckoutPage />} />

        {/* Admin */}
        <Route path="/admin/login"   element={<AdminLogin />} />
        <Route path="/admin"         element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
        <Route path="/admin/books"   element={<ProtectedRoute><AdminBooks /></ProtectedRoute>} />
        <Route path="/admin/loans"   element={<ProtectedRoute><AdminLoans /></ProtectedRoute>} />

        <Route path="*"              element={<NotFound />} />
      </Routes>
      <Footer />
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
