import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { useModelStore } from '../../stores/modelStore';
import { BarChart3, LogOut, Save, ChevronLeft } from 'lucide-react';

export default function Header() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { modelId, modelName, modelType, isDirty, lastSaved } = useModelStore();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="h-16 bg-white border-b border-gray-200 px-6 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-4">
        <Link to="/" className="flex items-center gap-2 text-brand-700 font-bold text-lg">
          <BarChart3 className="w-6 h-6" />
          FinModel AI
        </Link>
        {modelId && (
          <>
            <ChevronLeft className="w-4 h-4 text-gray-400" />
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">{modelName}</span>
              {modelType && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-brand-100 text-brand-700 font-medium uppercase">
                  {modelType}
                </span>
              )}
              {isDirty && (
                <span className="text-xs text-amber-600">Unsaved changes</span>
              )}
              {lastSaved && !isDirty && (
                <span className="text-xs text-green-600">Saved</span>
              )}
            </div>
          </>
        )}
      </div>
      <div className="flex items-center gap-4">
        {user && (
          <span className="text-sm text-gray-600">{user.name}</span>
        )}
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </div>
    </header>
  );
}
