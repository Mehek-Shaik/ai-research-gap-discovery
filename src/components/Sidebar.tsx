import React from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  UploadCloud,
  BookOpen,
  FileSearch,
  Compass,
  GitCompare,
  Lightbulb,
  FileEdit,
  Layers,
  FileText,
  History,
  Settings,
  X,
  LogOut,
  Home
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/upload', label: 'Upload Papers', icon: UploadCloud },
    { to: '/library', label: 'Research Library', icon: BookOpen },
    { to: '/analyze', label: 'Analyze Papers', icon: FileSearch },
    { to: '/gaps', label: 'Research Gaps', icon: Compass },
    { to: '/compare', label: 'Paper Comparison', icon: GitCompare },
    { to: '/recommendations', label: 'Recommendations', icon: Lightbulb },
    { to: '/proposals', label: 'Proposal Workspace', icon: FileEdit },
    { to: '/landscape', label: 'Research Landscape', icon: Layers },
    { to: '/reports', label: 'Academic Reports', icon: FileText },
    { to: '/history', label: 'Analysis History', icon: History },
    { to: '/settings', label: 'Settings & Viva Info', icon: Settings },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getInitials = (name?: string): string => {
    if (!name) return 'AR';
    const parts = name.replace(/^Dr\.\s*/i, '').trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform duration-200 ease-in-out dark:border-slate-800 dark:bg-slate-900 md:static md:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-0 max-md:-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="flex h-16 items-center justify-between border-b border-slate-200 px-5 dark:border-slate-800">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white font-bold text-sm tracking-wider shadow-xs">
              RG
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap">
                ResearchGap AI
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Academic Discovery
              </span>
            </div>
          </Link>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-slate-800 dark:hover:text-slate-200 md:hidden"
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto px-3 py-4">
          <div className="mb-2 px-3 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
            Platform Navigation
          </div>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/dashboard'}
                  onClick={() => onClose()}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap ${
                      isActive
                        ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-slate-200'
                    }`
                  }
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}

            {/* Public Landing Link */}
            <div className="pt-2 mt-2 border-t border-slate-100 dark:border-slate-800">
              <Link
                to="/"
                onClick={() => onClose()}
                className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-slate-200 transition-colors"
              >
                <Home className="h-4 w-4 shrink-0" />
                <span>Public Landing Page</span>
              </Link>
            </div>
          </nav>
        </div>

        {/* User / Runtime Footer */}
        <div className="border-t border-slate-200 p-4 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-xs font-semibold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                {getInitials(user?.fullName)}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="truncate text-xs font-semibold text-slate-900 dark:text-white">
                  {user?.fullName || 'Dr. Alex Vance'}
                </span>
                <span className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                  {user?.role || 'Lead Researcher'}
                </span>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-red-600 dark:hover:bg-slate-800 dark:hover:text-red-400 transition-colors"
              title="Sign Out"
              aria-label="Sign out of research workspace"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
