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

/**
 * Desktop navigation rail. It keeps a fixed 64px footprint in the page layout and
 * expands over the content on hover or keyboard focus, so the page never shifts.
 */
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
    <aside className={`hidden sm:block w-16 shrink-0 sticky top-0 h-screen z-40 ${className}`}>
      <div className="group absolute inset-y-0 left-0 flex w-16 flex-col border-r border-zinc-200 bg-white/95 py-3 backdrop-blur transition-[width,box-shadow] duration-200 hover:w-52 hover:shadow-xl focus-within:w-52 focus-within:shadow-xl dark:border-zinc-800 dark:bg-zinc-900/95">
        <div className="mb-5 flex h-9 items-center gap-3 px-5">
          {logo && <img src={logo} alt="Handuraw" className="h-6 w-auto shrink-0 object-contain dark:invert" />}
          <span className="whitespace-nowrap text-xs font-light uppercase tracking-[0.3em] text-zinc-900 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100 dark:text-zinc-100 font-display">
            Handuraw
          </span>
        </div>

        <nav aria-label="Main" className="flex flex-1 flex-col justify-center gap-1 px-2">
          {tabs.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                aria-label={tab.label}
                aria-current={active ? 'page' : undefined}
                className={`relative flex h-10 items-center gap-3 rounded-xl px-3.5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 ${
                  active
                    ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                    : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100'
                }`}
              >
                <span className="relative shrink-0">
                  <svg className="h-[18px] w-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75">
                    <path strokeLinecap="round" strokeLinejoin="round" d={tab.icon} />
                  </svg>
                  {tab.id === 'messages' && unreadCount > 0 && (
                    <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-blue-500 ring-2 ring-white dark:ring-zinc-900" />
                  )}
                </span>
                <span className="whitespace-nowrap text-xs font-semibold opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100">
                  {tab.label}
                </span>
              </button>
            );
          })}
        </nav>

        <div ref={menuRef} className="relative mt-auto border-t border-zinc-100 px-2 pt-3 dark:border-zinc-800">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-label="Account menu"
            className="flex h-11 w-full items-center gap-3 rounded-xl px-2.5 transition-colors hover:bg-zinc-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 dark:hover:bg-zinc-800"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-zinc-200 ring-1 ring-zinc-200 dark:bg-zinc-700 dark:ring-zinc-700">
              <img src={user?.profilePicture || '/spiral.webp'} alt="" className="h-full w-full object-cover" />
            </span>
            <span className="min-w-0 flex-1 overflow-hidden text-left opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100">
              <span className="block truncate text-xs font-semibold leading-tight text-zinc-800 dark:text-zinc-200">{user?.name || 'User'}</span>
              <span className="block truncate text-[10px] capitalize leading-tight text-zinc-400 dark:text-zinc-500">{user?.role}</span>
            </span>
          </button>

          {menuOpen && (
            <div
              role="menu"
              className="absolute bottom-0 left-full z-50 ml-3 flex w-56 flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white py-2 shadow-2xl animate-in fade-in slide-in-from-left-2 duration-150 dark:border-zinc-700 dark:bg-zinc-900"
            >
              <div className="mb-1 border-b border-zinc-100 px-3 pb-2 dark:border-zinc-800">
                <p className="text-xs font-semibold leading-tight text-zinc-900 dark:text-zinc-100">{user?.name || 'User'}</p>
                <p className="mt-0.5 truncate text-[10px] text-zinc-400 dark:text-zinc-500">{user?.email}</p>
                <span className="mt-1.5 inline-block rounded bg-zinc-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                  {user?.role}
                </span>
              </div>
              {isDualRole && onSwitchRole && (
                <button
                  role="menuitem"
                  onClick={() => { onSwitchRole(); setMenuOpen(false); }}
                  className="mx-1 flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-semibold text-amber-600 transition-colors hover:bg-amber-50 dark:hover:bg-amber-950/30"
                >
                  <svg className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                  Switch Role
                </button>
              )}
              <button
                role="menuitem"
                onClick={() => { onLogout(); setMenuOpen(false); }}
                className="mx-1 flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-semibold text-red-500 transition-colors hover:bg-red-50 dark:hover:bg-red-950/30"
              >
                <svg className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
