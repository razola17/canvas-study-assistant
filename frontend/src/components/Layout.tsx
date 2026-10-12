import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { BookOpen, LogOut, GraduationCap } from 'lucide-react';
import { canvasApi } from '../api';
import toast from 'react-hot-toast';

interface LayoutProps {
  onDisconnect: () => void;
}

export default function Layout({ onDisconnect }: LayoutProps) {
  const navigate = useNavigate();

  const handleDisconnect = async () => {
    try {
      await canvasApi.disconnect();
      onDisconnect();
      navigate('/setup');
      toast.success('Déconnecté de Canvas');
    } catch {
      toast.error('Erreur lors de la déconnexion');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Navbar */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-bold text-gray-900">Canvas Study</span>
            </div>

            {/* Navigation */}
            <div className="flex items-center gap-6">
              <NavLink
                to="/courses"
                className={({ isActive }) =>
                  `flex items-center gap-2 text-sm font-medium transition-colors ${
                    isActive ? 'text-blue-600' : 'text-gray-600 hover:text-gray-900'
                  }`
                }
              >
                <BookOpen className="w-4 h-4" />
                Mes Cours
              </NavLink>
            </div>

            {/* Actions */}
            <button
              onClick={handleDisconnect}
              className="flex items-center gap-2 text-sm text-gray-500 hover:text-red-600 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Déconnecter
            </button>
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-100 py-4 text-center text-sm text-gray-400">
        Canvas Study Assistant — Propulsé par Google Gemini AI
      </footer>
    </div>
  );
}
