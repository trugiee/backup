import type { RefObject } from 'react';
import type { User } from '../types';

export interface BottomNavTab {
  id: string;
  label: string;
  icon: string;
}

export interface BottomNavMenuItem {
  label: string;
  icon: string;
  onClick: () => void;
  tone?: 'default' | 'accent' | 'danger';
}

interface BottomNavProps {
  tabs: BottomNavTab[];
  activeTab: string;
  onTabChange: (tab: string) => void;
  user: User;
  menuItems: BottomNavMenuItem[];
  menuOpen: boolean;
  onMenuOpenChange: (open: boolean) => void;
  /** Attached to the root so the parent can close the menu on outside clicks. */
  navRef: RefObject<HTMLDivElement | null>;
  /** Shows a dot on the Messages tab. */
  hasUnread?: boolean;
  /** Use the user's initial instead of the default avatar when there is no photo. */
  avatarInitial?: boolean;
}

const toneClass: Record<NonNullable<BottomNavMenuItem['tone']>, string> = {
  default: 'text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800',
  accent: 'text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30',
  danger: 'text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30',
};

/** Phone navigation: tab bar pinned to the bottom with an account menu. Hidden from `sm` up. */
export default function BottomNav({
  tabs,
  activeTab,
  onTabChange,
  user,
  menuItems,
  menuOpen,
  onMenuOpenChange,
  navRef,
  hasUnread = false,
  avatarInitial = false,
}: BottomNavProps) {
  const initial = (user.name || user.email || '?').charAt(0).toUpperCase();

  return (
    <nav
      ref={navRef}
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-zinc-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden dark:border-zinc-800 dark:bg-zinc-900/95"
    >
      <div className="mx-auto flex h-16 max-w-md items-stretch justify-around px-2">
        {tabs.map((tab) => {
          const active = activeTab === tab.id && !menuOpen;
          return (
            <button
              key={tab.id}
              onClick={() => { onTabChange(tab.id); onMenuOpenChange(false); }}
              aria-current={active ? 'page' : undefined}
              className="relative flex min-w-0 flex-1 flex-col items-center justify-center gap-1 transition-colors focus:outline-none focus-visible:bg-zinc-100 dark:focus-visible:bg-zinc-800"
            >
              <span
                className={`absolute top-0 h-0.5 w-8 rounded-full transition-all duration-200 ${
                  active ? 'bg-zinc-900 opacity-100 dark:bg-zinc-100' : 'bg-transparent opacity-0'
                }`}
              />
              <span
                className={`relative flex h-8 w-12 items-center justify-center rounded-full transition-colors ${
                  active ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900' : 'text-zinc-400 dark:text-zinc-500'
                }`}
              >
                <svg className="h-[18px] w-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75">
                  <path strokeLinecap="round" strokeLinejoin="round" d={tab.icon} />
                </svg>
                {tab.id === 'messages' && hasUnread && (
                  <span className="absolute right-2 top-1 h-2 w-2 rounded-full bg-blue-500 ring-2 ring-white dark:ring-zinc-900" />
                )}
              </span>
              <span
                className={`max-w-full truncate text-[11px] leading-none ${
                  active ? 'font-semibold text-zinc-900 dark:text-zinc-100' : 'font-medium text-zinc-400 dark:text-zinc-500'
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}

        <div className="relative flex min-w-0 flex-1">
          <button
            onClick={() => onMenuOpenChange(!menuOpen)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            className="relative flex w-full flex-col items-center justify-center gap-1 transition-colors focus:outline-none focus-visible:bg-zinc-100 dark:focus-visible:bg-zinc-800"
          >
            <span
              className={`absolute top-0 h-0.5 w-8 rounded-full transition-all duration-200 ${
                menuOpen ? 'bg-zinc-900 opacity-100 dark:bg-zinc-100' : 'bg-transparent opacity-0'
              }`}
            />
            <span className="flex h-8 w-12 items-center justify-center">
              <span
                className={`flex h-6 w-6 items-center justify-center overflow-hidden rounded-full bg-zinc-200 text-[10px] font-bold text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300 ${
                  menuOpen ? 'ring-2 ring-zinc-900 dark:ring-zinc-100' : 'ring-1 ring-zinc-200 dark:ring-zinc-700'
                }`}
              >
                {user.profilePicture ? (
                  <img src={user.profilePicture} alt="" className="h-full w-full object-cover" />
                ) : avatarInitial ? (
                  initial
                ) : (
                  <img src="/spiral.webp" alt="" className="h-full w-full object-cover" />
                )}
              </span>
            </span>
            <span
              className={`text-[11px] leading-none ${
                menuOpen ? 'font-semibold text-zinc-900 dark:text-zinc-100' : 'font-medium text-zinc-400 dark:text-zinc-500'
              }`}
            >
              Account
            </span>
          </button>

          {menuOpen && (
            <div
              role="menu"
              className="absolute bottom-full right-0 mb-2 flex w-56 flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white py-2 shadow-xl animate-in fade-in slide-in-from-bottom-2 duration-150 dark:border-zinc-700 dark:bg-zinc-900"
            >
              <div className="mb-1 border-b border-zinc-100 px-3 pb-2 dark:border-zinc-800">
                <p className="text-sm font-semibold leading-tight text-zinc-900 dark:text-zinc-100">{user.name || 'User'}</p>
                <p className="mt-0.5 truncate text-[11px] text-zinc-400 dark:text-zinc-500">{user.email}</p>
                <span className="mt-1.5 inline-block rounded bg-zinc-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                  {user.role}
                </span>
              </div>
              {menuItems.map((item) => (
                <button
                  key={item.label}
                  role="menuitem"
                  onClick={() => { item.onClick(); onMenuOpenChange(false); }}
                  className={`mx-1 flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-xs font-semibold transition-colors ${toneClass[item.tone ?? 'default']}`}
                >
                  <svg className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75">
                    <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                  </svg>
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
