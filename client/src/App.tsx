import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import Toast from './components/ui/Toast';

const Login = lazy(() => import('./features/auth/Login'));
const Register = lazy(() => import('./features/auth/Register'));
const Dashboard = lazy(() => import('./features/dashboard/Dashboard'));
const DCFModelPage = lazy(() => import('./features/dcf/DCFModelPage'));
const SharedModelPage = lazy(() => import('./features/sharing/SharedModelPage'));

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token);
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function PageLoader() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#64748b' }}>
      Loading...
    </div>
  );
}

export default function App() {
  return (
    <>
      <Toast />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/share/:token" element={<SharedModelPage />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/model/:id"
            element={
              <ProtectedRoute>
                <DCFModelPage />
              </ProtectedRoute>
            }
          />
        </Routes>
      </Suspense>
    </>
  );
}
