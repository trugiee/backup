import { useState, useEffect, useRef } from 'react';
import type { User } from '../types';

interface SidebarTab {
  id: string;
  label: string;
  icon: string;
}

interface SidebarProps {
  tabs: SidebarTab[];
  activeTab: string;
  onTabChange: (tab: string) => void;
  onLogout: () => void;
  logo?: string;
  unreadCount?: number;
  onSwitchRole?: () => void;
  isDualRole?: boolean;
  className?: string;
  user?: User;
}

export default function Sidebar({
  tabs,
  activeTab,
  onTabChange,
  onLogout,
  logo = '/logo-icon.png',
  unreadCount = 0,
  onSwitchRole,
  isDualRole,
  className = '',
  user,
}: SidebarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) {
      document.addEventListener('mousedown', handleClick);
      return () => document.removeEventListener('mousedown', handleClick);
    }
  }, [menuOpen]);

  return (
    <aside className={`hidden lg:flex flex-col w-16 hover:w-[120px] bg-white dark:bg-zinc-900 border-r border-zinc-100 dark:border-zinc-800 fixed inset-y-0 left-0 z-40 py-3 group transition-all duration-200 ${className}`}>
      <div className="flex items-center gap-2.5 px-4 h-8 mb-4">
        {logo && <img src={logo} alt="Ggallery" className="h-5 w-auto object-contain shrink-0" />}
      </div>

      <nav className="flex-1 flex flex-col gap-0.5 px-2">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`relative flex items-center gap-3 px-3 py-2 rounded-xl transition-all ${ activeTab === tab.id ? 'bg-zinc-900 text-white' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800' }`}
          >
            <div className="relative shrink-0">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d={tab.icon} />
              </svg>
              {tab.id === 'messages' && unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-1.5 h-1.5 bg-blue-500 rounded-full" />
              )}
            </div>
            <span className="text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">{tab.label}</span>
          </button>
        ))}
      </nav>

      <div ref={menuRef} className="relative mt-auto pt-3 border-t border-zinc-100 dark:border-zinc-800 px-2">
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all"
        >
          <div className="w-7 h-7 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-zinc-500 dark:text-zinc-400 text-[10px] font-bold overflow-hidden ring-1 ring-zinc-200 dark:ring-zinc-700 shrink-0">
            {user?.profilePicture ? (
              <img src={user.profilePicture} alt="" className="w-full h-full object-cover" />
            ) : (
              <img src="/spiral.webp" alt="" className="w-full h-full object-cover" />
            )}
          </div>
          <div className="text-left min-w-0 flex-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap overflow-hidden">
            <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 truncate leading-tight">{user?.name || 'User'}</p>
          </div>
        </button>

        {menuOpen && (
          <div className="absolute bottom-full mb-2 left-2 right-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-2xl shadow-xl py-2 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-150">
            <div className="px-3 pb-2 mb-1 border-b border-zinc-100 dark:border-zinc-800">
              <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 leading-tight">{user?.name || 'User'}</p>
              <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5">{user?.email}</p>
              <span className="inline-block mt-1.5 text-[9px] font-bold text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded uppercase tracking-wider">{user?.role}</span>
            </div>
            {isDualRole && onSwitchRole && (
              <button
                onClick={() => { onSwitchRole(); setMenuOpen(false); }}
                className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors mx-1 rounded-lg"
              >
                <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
                Switch Role
              </button>
            )}
            <button
              onClick={() => { onLogout(); setMenuOpen(false); }}
              className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors mx-1 rounded-lg"
            >
              <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Logout
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
