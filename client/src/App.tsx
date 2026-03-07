import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import Layout from './components/layout/Layout';
import Dashboard from './components/dashboard/Dashboard';
import ModelView from './components/models/ModelView';
import LoginPage from './components/auth/LoginPage';
import RegisterPage from './components/auth/RegisterPage';

const DEMO_MODE = true;

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (!isAuthenticated && !DEMO_MODE) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  // Auto-login in demo mode
  useEffect(() => {
    if (DEMO_MODE && !useAuthStore.getState().isAuthenticated) {
      useAuthStore.getState().login(
        'demo-token',
        'demo-refresh',
        { id: 'demo-user', email: 'analyst@finmodel.ai', name: 'Demo Analyst' },
      );
    }
  }, []);

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="model/:modelId" element={<ModelView />} />
      </Route>
    </Routes>
  );
}
