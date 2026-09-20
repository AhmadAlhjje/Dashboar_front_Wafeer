import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { Layout } from './components/Layout';
import { ToastProvider } from './components/ui';
import { AuditPage } from './pages/AuditPage';
import { LoginPage } from './pages/LoginPage';
import { OfficePage } from './pages/OfficePage';
import { OfficesPage } from './pages/OfficesPage';
import { OverviewPage } from './pages/OverviewPage';
import { OwnersPage } from './pages/OwnersPage';
import { SettingsPage } from './pages/SettingsPage';

/** حارس المصادقة: بلا مالك ⇒ صفحة الدخول. */
function RequireOwner() {
  const { owner, loading } = useAuth();
  if (loading) return <p className="muted center">جارٍ التحقق من الجلسة…</p>;
  return owner ? <Outlet /> : <Navigate to="/login" replace />;
}

export function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<RequireOwner />}>
            <Route element={<Layout />}>
              <Route index element={<OverviewPage />} />
              <Route path="offices" element={<OfficesPage />} />
              <Route path="offices/:id" element={<OfficePage />} />
              <Route path="owners" element={<OwnersPage />} />
              <Route path="audit" element={<AuditPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </ToastProvider>
  );
}
