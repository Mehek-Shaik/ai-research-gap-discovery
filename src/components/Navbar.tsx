import React from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { Menu, Sun, Moon, UploadCloud, Database, Cpu, LogOut, User as UserIcon } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';

interface NavbarProps {
  onToggleSidebar: () => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onToggleSidebar,
  isDarkMode,
  onToggleDarkMode
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const getPageTitle = (pathname: string): string => {
    switch (pathname) {
      case '/':
      case '/dashboard': return 'Research Overview';
      case '/upload': return 'Upload Research Papers';
      case '/library': return 'My Research Library';
      case '/analyze': return 'Deep Paper Analysis';
      case '/gaps': return 'Research Gap Discovery';
      case '/compare': return 'Cross-Paper Comparison';
      case '/recommendations': return 'Future Research Directions';
      case '/proposals': return 'Research Proposal Workspace';
      case '/landscape': return 'Research Topic Landscape';
      case '/reports': return 'Academic Reports & Exports';
      case '/history': return 'Analysis Audit History';
      case '/settings': return 'System Settings & Viva Guide';
      default: return 'Research Platform';
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur-xs dark:border-slate-800 dark:bg-slate-900/90 sm:px-6">
      {/* Zone 1: Mobile Toggle + Breadcrumb */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="rounded-md p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 md:hidden"
          aria-label="Open sidebar navigation"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2 text-sm">
          <span className="hidden font-medium text-slate-400 dark:text-slate-500 sm:inline">
            Workspace /
          </span>
          <h1 className="font-semibold text-slate-900 dark:text-white truncate">
            {getPageTitle(location.pathname)}
          </h1>
        </div>
      </div>

      {/* Zone 2: System Indicators (Subtle text metadata) */}
      <div className="hidden lg:flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
        <span className="flex items-center gap-1.5">
          <Database className="h-3.5 w-3.5 text-emerald-500" />
          <span>SQLite ACID Engine</span>
        </span>
        <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">·</span>
        <span className="flex items-center gap-1.5">
          <Cpu className="h-3.5 w-3.5 text-indigo-500" />
          <span>Gemini Intelligence</span>
        </span>
      </div>

      {/* Zone 3: Actions (Theme Toggle, Upload CTA & User Profile) */}
      <div className="flex items-center gap-2.5">
        <button
          onClick={onToggleDarkMode}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>

        {location.pathname !== '/upload' && (
          <Link
            to="/upload"
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-medium text-white shadow-xs transition-colors hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 whitespace-nowrap"
          >
            <UploadCloud className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Upload Paper</span>
          </Link>
        )}

        {/* User Quick Info & Signout */}
        {user && (
          <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-800">
            <span className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate max-w-[120px]">
              {user.fullName}
            </span>
            <button
              onClick={handleLogout}
              className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-red-600 dark:hover:bg-slate-800 dark:hover:text-red-400 transition-colors"
              title="Sign Out"
              aria-label="Sign out of research workspace"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
