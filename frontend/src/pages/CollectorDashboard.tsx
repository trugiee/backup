import { useState, useEffect, useRef } from 'react';
import type { Artwork, SoldArtwork, User, Notification } from '../types';
import { useToast } from '../components/Toast';
import { 
  fetchArtworks, 
  fetchMySoldArtworks,
  updateCollector,
  uploadImage,
  upgradeToExhibitor,
  fetchMyConversations,
  fetchNotifications
} from '../api';
import ArtworkModal from '../components/ArtworkModal';
import ChatDrawer from '../components/ChatDrawer';
import Sidebar from '../components/Sidebar';
import SettingsModal from '../components/SettingsModal';
import ArtworkGallery from '../components/ArtworkGallery';
import { io } from 'socket.io-client';

interface CollectorDashboardProps {
  user: User;
  token: string;
  setUser: (u: User) => void;
  onLogout: () => void;
}

type DashboardTab = 'browse' | 'profile' | 'messages' | 'notifications';

export default function CollectorDashboard({ user, token, setUser, onLogout }: CollectorDashboardProps) {
  const [dashboardTab, setDashboardTab] = useState<DashboardTab>('browse');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showDashboardMenu, setShowDashboardMenu] = useState(false);
  const dashboardLabelRef = useRef<HTMLDivElement>(null);
  const mobileNavRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (mobileNavRef.current && !mobileNavRef.current.contains(e.target as Node)) setMobileMenuOpen(false);
      if (dashboardLabelRef.current && !dashboardLabelRef.current.contains(e.target as Node)) setShowDashboardMenu(false);
    };
    if (mobileMenuOpen || showDashboardMenu) {
      document.addEventListener('mousedown', handleClick);
      return () => document.removeEventListener('mousedown', handleClick);
    }
  }, [mobileMenuOpen, showDashboardMenu]);

  // Data
  const [dataLoading, setDataLoading] = useState(false);
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [soldArtworks, setSoldArtworks] = useState<SoldArtwork[]>([]);
  
  // Modal
  const [selectedArtwork, setSelectedArtwork] = useState<Artwork | null>(null);
  const [viewingProfilePic, setViewingProfilePic] = useState(false);
  
  // Profile Edits
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [bioInput, setBioInput] = useState(user.bio || '');
  const [savingBio, setSavingBio] = useState(false);
  const [uploadingProfilePic, setUploadingProfilePic] = useState(false);
  const { toast } = useToast();
  
  // Exhibitor Prompt
  const [showExhibitorPrompt, setShowExhibitorPrompt] = useState(false);
  const [showExhibitorForm, setShowExhibitorForm] = useState(false);
  const [upgradePhone, setUpgradePhone] = useState((user as any).phone || '');
  const [upgradeAddress, setUpgradeAddress] = useState((user as any).address || '');
  const [isUpgrading, setIsUpgrading] = useState(false);

  // Messages
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeThread, setActiveThread] = useState<any | null>(null);

  // Notifications
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadNotifs, setUnreadNotifs] = useState<string[]>([]);
  const [showSettings, setShowSettings] = useState(false);

  const markNotifRead = (id: string) => {
    const updated = [...unreadNotifs.filter(n => n !== id)];
    setUnreadNotifs(updated);
    localStorage.setItem(`notifRead_${user.id}`, JSON.stringify(
      notifications.filter(n => !updated.includes(n.id)).map(n => n.id)
    ));
  };

  const loadConversations = async () => {
    try {
      const data = await fetchMyConversations(token);
      setConversations(data);
    } catch {}
  };

  const fetchAllData = async () => {
    setDataLoading(true);
    try {
      const [aData, saData] = await Promise.all([
        fetchArtworks(token),
        fetchMySoldArtworks(token)
      ]);
      setArtworks(Array.isArray(aData) ? aData : []);
      setSoldArtworks(Array.isArray(saData) ? saData : []);
    } catch (err) {
      console.error('Failed to fetch data', err);
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
    loadConversations();
    
    const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:3001');
    socket.emit('join', user.id);
    
    socket.on('newMessage', () => {
      // Refresh conversation list on new message
      loadConversations();
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    const fetchNotifs = user.isDualRole
      ? Promise.all([fetchNotifications(token, 'exhibitor'), fetchNotifications(token, 'collector')])
          .then(([a, b]) => {
            const seen = new Set<string>();
            return [...a, ...b].filter(n => { if (seen.has(n.id)) return false; seen.add(n.id); return true; });
          })
      : fetchNotifications(token, 'collector');

    fetchNotifs
      .then(data => {
        const list = Array.isArray(data) ? data : [];
        setNotifications(list);
        const stored = localStorage.getItem(`notifRead_${user.id}`);
        const readIds: string[] = stored ? JSON.parse(stored) : [];
        setUnreadNotifs(list.filter(n => !readIds.includes(n.id)).map(n => n.id));
      })
      .catch(() => {});
  }, []);

  const handleProfilePicUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingProfilePic(true);
    try {
      const { imageUrl } = await uploadImage(token, file);
      await updateCollector(token, user.id, { profilePicture: imageUrl });
      setUser({ ...user, profilePicture: imageUrl });
    } catch (err) {
      console.error('Failed to upload profile picture', err);
      toast('Failed to upload profile picture', 'error');
    } finally {
      setUploadingProfilePic(false);
    }
  };

  const collectorTabs = [
    { id: 'browse', label: 'Gallery', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    { id: 'messages', label: 'Messages', icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z' },
    { id: 'profile', label: 'Profile', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
  ];

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 pb-20 md:pb-0 lg:ml-16">
      <Sidebar
        tabs={collectorTabs}
        activeTab={dashboardTab}
        onTabChange={(tab) => { if (tab === 'messages') loadConversations(); setDashboardTab(tab as any); }}
        user={user}
        onLogout={onLogout}
        unreadCount={unreadNotifs.length}
        isDualRole={!!user.isDualRole}
        onSwitchRole={() => setUser({ ...user, role: 'exhibitor' })}
      />

      {dashboardTab !== 'browse' && (
      <div className="px-4 sm:px-6 pt-4 sm:pt-6 pb-0 flex items-center justify-between">
        <div ref={dashboardLabelRef} className="relative">
          <button
            onClick={() => setShowDashboardMenu(!showDashboardMenu)}
            className="inline-flex items-center gap-2 px-3 py-1.5 bg-zinc-900 text-white text-xs font-bold rounded-full uppercase tracking-wider hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            Collector Dashboard
            <svg className={`w-3 h-3 transition-transform duration-200 ${showDashboardMenu ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {showDashboardMenu && (
            <div className="absolute top-full mt-1.5 left-0 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-2xl shadow-xl py-2 w-48 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150 z-50">
              <div className="px-3 pb-2 mb-1 border-b border-zinc-100 dark:border-zinc-800">
                <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 leading-tight">{user.name || 'User'}</p>
                <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5 break-all">{user.email}</p>
                <span className="inline-block mt-1.5 text-[9px] font-bold text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded uppercase tracking-wider">{user.role}</span>
              </div>
              <button
                onClick={() => { setDashboardTab('profile'); setShowDashboardMenu(false); }}
                className="flex items-center gap-2.5 w-full px-3 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Profile
              </button>
              {user.isDualRole ? (
                <button
                  onClick={() => { setUser({ ...user, role: 'exhibitor' }); setShowDashboardMenu(false); }}
                  className="flex items-center gap-2.5 w-full px-3 py-2 text-xs font-semibold text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                  Switch Role
                </button>
              ) : (
                <button
                  onClick={() => { user.isPendingExhibitor ? toast('Your exhibitor request is pending admin approval.', 'info') : setShowExhibitorPrompt(true); setShowDashboardMenu(false); }}
                  className="flex items-center gap-2.5 w-full px-3 py-2 text-xs font-semibold text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Upgrade Account
                </button>
              )}
              <div className="mt-1 pt-1 border-t border-zinc-100 dark:border-zinc-800 mx-1">
                <button
                  onClick={() => { onLogout(); setShowDashboardMenu(false); }}
                  className="flex items-center gap-2.5 w-full px-3 py-2 text-xs font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors rounded-lg"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSettings(true)}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600 hover:shadow-sm dark:shadow-zinc-900/30 transition-all"
          >
            <svg className="w-4 h-4 text-zinc-600 dark:text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
          <button
            onClick={() => { setDashboardTab('notifications'); setMobileMenuOpen(false); }}
            className="relative w-9 h-9 flex items-center justify-center rounded-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600 hover:shadow-sm dark:shadow-zinc-900/30 transition-all"
          >
            <svg className="w-4 h-4 text-zinc-600 dark:text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
            </svg>
            {unreadNotifs.length > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center ring-2 ring-white">
                {unreadNotifs.length > 9 ? '9+' : unreadNotifs.length}
              </span>
            )}
          </button>
        </div>
      </div>
      )}
      {dashboardTab === 'browse' && (
        <>
          <div className="relative overflow-hidden bg-zinc-950 text-white">
            <div
              className="absolute inset-0 opacity-20"
              style={{ backgroundImage: 'radial-gradient(ellipse at 70% 50%, #3f3f46 0%, transparent 70%), radial-gradient(ellipse at 20% 80%, #27272a 0%, transparent 60%)' }}
            />
            <img src="/logo-white.png" alt="" aria-hidden="true" className="absolute right-0 top-1/2 -translate-y-1/2 w-72 sm:w-96 md:w-[28rem] lg:w-[36rem] opacity-[0.04] pointer-events-none select-none object-contain" />
            <div className="relative px-4 sm:px-10 py-6 sm:py-10">
              <p className="text-zinc-400 text-[9px] sm:text-xs font-semibold tracking-widest uppercase mb-1 sm:mb-2">
                The Gallery
              </p>
              <h1 className="text-xl sm:text-3xl font-black tracking-tight leading-none mb-2 sm:mb-3">
                Discover{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-zinc-300 to-zinc-500">
                  Exquisite
                </span>
                <br />
                Works of Art
              </h1>
              <p className="text-zinc-400 text-xs sm:text-sm max-w-xl leading-relaxed mb-3">
                Browse our curated collection of original artworks from talented exhibitors.
              </p>
            </div>
          </div>
          <ArtworkGallery artworks={artworks} loading={dataLoading} token={token} user={user} />
        </>
      )}

      {dashboardTab === 'profile' && (
        <div className="max-w-3xl mx-auto px-3 sm:px-6 py-4 sm:py-10">
          <div className="flex flex-col items-center gap-4 sm:gap-8 mb-6">
            <div className="relative group shrink-0">
              <div
                className={`w-20 sm:w-24 h-20 sm:h-24 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-zinc-500 dark:text-zinc-400 text-2xl sm:text-3xl font-bold overflow-hidden ${user.profilePicture ? 'cursor-pointer hover:opacity-90 transition-opacity' : ''}`}
                onClick={() => user.profilePicture && setViewingProfilePic(true)}
              >
                {user.profilePicture ? (
                  <img src={user.profilePicture} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <img src="/spiral.webp" alt="" className="w-full h-full object-cover" />
                )}
              </div>
              <label className="absolute -bottom-1 -right-1 w-7 h-7 bg-zinc-900 rounded-full border-2 border-white flex items-center justify-center cursor-pointer hover:bg-zinc-700 transition-colors shadow-sm">
                <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                <input type="file" accept="image/*" className="hidden" onChange={handleProfilePicUpload} disabled={uploadingProfilePic} />
              </label>
              {uploadingProfilePic && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-full z-10">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0 w-full text-center">
              <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-100">{user.name || 'Collector'}</h1>
              <div className="flex items-center justify-center gap-2 mt-0.5 flex-wrap">
                <p className="text-sm text-zinc-500 dark:text-zinc-400">{user.email}</p>
                <span className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full uppercase tracking-wider">{user.role}</span>
              </div>

              <div className="flex items-center justify-center gap-8 sm:gap-8 my-4 sm:my-5">
                <div className="text-center">
                  <p className="text-lg font-bold text-zinc-900 dark:text-zinc-100">{soldArtworks.length}</p>
                  <p className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Collected</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-zinc-900 dark:text-zinc-100">{artworks.length}</p>
                  <p className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Available</p>
                </div>
              </div>

              {isEditingBio ? (
                <div className="max-w-md mx-auto">
                  <textarea
                    value={bioInput}
                    onChange={(e) => setBioInput(e.target.value)}
                    placeholder="Share your passion for art..."
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 rounded-xl p-3 text-sm text-zinc-800 dark:text-zinc-100 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-500 resize-none min-h-[80px]"
                  />
                  <div className="flex items-center gap-3 justify-end mt-2">
                    <button onClick={() => setIsEditingBio(false)} className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 px-3 py-1.5" disabled={savingBio}>Cancel</button>
                    <button onClick={async () => {
                      setSavingBio(true);
                      try {
                        await updateCollector(token, user.id, { bio: bioInput });
                        setUser({ ...user, bio: bioInput });
                        setIsEditingBio(false);
                      } catch { toast('Failed to update bio', 'error'); }
                      finally { setSavingBio(false); }
                    }} className="text-xs font-bold bg-zinc-900 text-white px-4 py-1.5 rounded-lg hover:bg-zinc-800 disabled:opacity-50" disabled={savingBio}>
                      {savingBio ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-zinc-600 dark:text-zinc-400 max-w-md mx-auto leading-relaxed">
                  {user.bio || <span className="text-zinc-400 dark:text-zinc-500 italic">No bio yet.</span>}
                  {!isEditingBio && (
                    <button onClick={() => { setBioInput(user.bio || ''); setIsEditingBio(true); }} className="ml-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400 hover:text-zinc-900">Edit</button>
                  )}
                </p>
              )}

              <div className="flex items-center justify-center gap-3 mt-4">
                {user.isDualRole ? (
                  <button onClick={() => setUser({ ...user, role: 'exhibitor' })} className="text-xs font-semibold bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 px-4 py-2 rounded-lg hover:bg-amber-200 transition-colors">
                    Switch to Exhibitor Dashboard
                  </button>
                ) : (
                  <button onClick={() => user.isPendingExhibitor ? toast('Your exhibitor request is pending admin approval.', 'info') : setShowExhibitorPrompt(true)} className="text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 px-4 py-2 rounded-lg hover:bg-zinc-200 transition-colors">
                    Switch to Exhibitor
                  </button>
                )}
              </div>
            </div>
          </div>

          {soldArtworks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-3">
                <svg className="w-6 h-6 text-zinc-300 dark:text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
              </div>
              <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">No collection yet</p>
              <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">Artworks you purchase will appear here.</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-1 sm:gap-2">
              {soldArtworks.map((sa) => (
                <div key={sa.id} className="aspect-square bg-zinc-100 dark:bg-zinc-800 rounded-md overflow-hidden">
                  {sa.artwork.imageUrl ? (
                    <img src={sa.artwork.imageUrl} alt={sa.artwork.title || ''} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-300 dark:text-zinc-600 text-xs">{sa.artwork.title?.charAt(0) || '?'}</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {dashboardTab === 'notifications' && (
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 sm:py-32 text-zinc-400 dark:text-zinc-500">
              <svg className="w-16 h-16 mb-4 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
              </svg>
              <p className="text-lg font-semibold text-zinc-700 dark:text-zinc-300">No notifications</p>
              <p className="text-sm mt-1">You're all caught up!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.map(n => {
                const isUnread = unreadNotifs.includes(n.id);
                return (
                  <div
                    key={n.id}
                    onClick={() => markNotifRead(n.id)}
                    className={`flex items-start gap-4 p-5 rounded-2xl border transition-all duration-200 hover:shadow-md cursor-pointer ${ isUnread ? 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 shadow-sm dark:shadow-zinc-900/30' : 'bg-white dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800 opacity-70' }`}
                  >
                    <div className={`mt-0.5 w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${ isUnread ? 'bg-zinc-900' : 'bg-zinc-100 dark:bg-zinc-800' }`}>
                      <svg className={`w-5 h-5 ${isUnread ? 'text-white' : 'text-zinc-400 dark:text-zinc-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm leading-relaxed ${isUnread ? 'text-zinc-800 dark:text-zinc-200 font-medium' : 'text-zinc-500 dark:text-zinc-500'}`}>
                        <strong>{n.title}</strong>: {n.message}
                      </p>
                      <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1.5">
                        {new Date(n.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    {isUnread && (
                      <div className="w-2.5 h-2.5 rounded-full bg-blue-500 mt-2 shrink-0 animate-pulse" />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {dashboardTab === 'messages' && (
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
          {activeThread ? (
            <ChatDrawer
              token={token}
              user={user}
              exhibitorId={activeThread.exhibitor.id}
              exhibitorName={activeThread.exhibitor.name}
              exhibitorAvatar={activeThread.exhibitor.profilePicture}
              onClose={() => setActiveThread(null)}
            />
          ) : (
            /* ── Inbox list ── */
            conversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-28 text-center gap-3">
                <div className="w-14 h-14 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                  <svg className="w-6 h-6 text-zinc-400 dark:text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">No messages yet</p>
                <p className="text-xs text-zinc-400 dark:text-zinc-500 max-w-[220px]">
                  Browse the gallery, click an artwork and tap <strong>Talk to Exhibitor</strong> to start a conversation.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <h2 className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-4">Your Conversations</h2>
                {conversations.map((thread: any) => (
                  <button
                    key={thread.exhibitor.id}
                    onClick={() => setActiveThread(thread)}
                    className="w-full flex items-center gap-4 p-4 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl hover:border-zinc-200 dark:hover:border-zinc-700 hover:shadow-sm dark:shadow-zinc-900/30 transition-all text-left"
                  >
                    <div className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-700 dark:text-zinc-300 text-sm font-bold shrink-0 overflow-hidden">
                      {thread.exhibitor.profilePicture ? (
                        <img src={thread.exhibitor.profilePicture} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <img src="/spiral.webp" alt="" className="w-full h-full object-cover" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">{thread.exhibitor.name}</p>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate mt-0.5">{thread.lastMessage?.content}</p>
                    </div>
                    <svg className="w-4 h-4 text-zinc-300 dark:text-zinc-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                ))}
              </div>
            )
          )}
        </div>
      )}

      {selectedArtwork && (
        <ArtworkModal
          artwork={selectedArtwork}
          onClose={() => setSelectedArtwork(null)}
          token={token}
          user={user}
        />
      )}

      {viewingProfilePic && user.profilePicture && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
          onClick={() => setViewingProfilePic(false)}
        >
          <button 
            className="absolute top-6 right-6 text-white/50 hover:text-white transition-colors"
            onClick={() => setViewingProfilePic(false)}
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
          <img 
            src={user.profilePicture} 
            alt="Profile Full" 
            className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl" 
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {showSettings && (
        <SettingsModal user={user} token={token} setUser={setUser} onClose={() => setShowSettings(false)} />
      )}

      {showExhibitorPrompt && !showExhibitorForm && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-zinc-950/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center border border-zinc-100 dark:border-zinc-800 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-zinc-900 dark:text-zinc-100" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
            </div>
            <h2 className="text-2xl font-black text-zinc-900 dark:text-zinc-100 mb-2 tracking-tight">Upgrade Account</h2>
            <p className="text-zinc-500 dark:text-zinc-400 mb-8 font-medium">Do you want to be an exhibitor?</p>
            <div className="flex items-center gap-3 w-full">
              <button 
                onClick={() => setShowExhibitorPrompt(false)}
                className="flex-1 px-4 py-3 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-bold hover:bg-zinc-200 transition-colors"
              >
                No
              </button>
              <button 
                onClick={() => setShowExhibitorForm(true)}
                className="flex-1 px-4 py-3 rounded-xl bg-zinc-900 text-white font-bold hover:bg-black shadow-lg shadow-zinc-900/20 transition-all"
              >
                Yes
              </button>
            </div>
          </div>
        </div>
      )}

      {showExhibitorForm && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-zinc-950/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl p-8 max-w-sm w-full shadow-2xl border border-zinc-100 dark:border-zinc-800 animate-in fade-in zoom-in-95 duration-200">
            <h2 className="text-2xl font-black text-zinc-900 dark:text-zinc-100 mb-2 tracking-tight">Complete Upgrade</h2>
            <p className="text-zinc-500 dark:text-zinc-400 mb-6 font-medium text-sm">Please provide any missing details to become an exhibitor.</p>
            
            <div className="space-y-4 mb-8">
              <div>
                <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">Phone (Optional)</label>
                <input
                  type="text"
                  value={upgradePhone}
                  onChange={e => setUpgradePhone(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 rounded-lg p-3 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 transition-all"
                  placeholder="Your phone number"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">Address (Optional)</label>
                <textarea
                  value={upgradeAddress}
                  onChange={e => setUpgradeAddress(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 rounded-lg p-3 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 transition-all resize-none"
                  placeholder="Your address"
                  rows={2}
                />
              </div>
            </div>

            <div className="flex items-center gap-3 w-full">
              <button 
                onClick={() => {
                  setShowExhibitorForm(false);
                  setShowExhibitorPrompt(false);
                }}
                disabled={isUpgrading}
                className="flex-1 px-4 py-3 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-bold hover:bg-zinc-200 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button 
                onClick={async () => {
                  setIsUpgrading(true);
                  try {
                    const { user: updatedUser } = await upgradeToExhibitor(token, {
                      phone: upgradePhone,
                      address: upgradeAddress
                    });
                    setUser(updatedUser);
                    setShowExhibitorForm(false);
                    setShowExhibitorPrompt(false);
                    setIsUpgrading(false);
                    toast('Your request to become an exhibitor has been submitted for admin approval.', 'success');
                  } catch (err) {
                    console.error('Upgrade failed', err);
                    toast('Upgrade failed. Please try again.', 'error');
                    setIsUpgrading(false);
                  }
                }}
                disabled={isUpgrading}
                className="flex-1 px-4 py-3 rounded-xl bg-zinc-900 text-white font-bold hover:bg-black shadow-lg shadow-zinc-900/20 transition-all disabled:opacity-50"
              >
                {isUpgrading ? 'Upgrading...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile bottom nav */}
      <nav ref={mobileNavRef} className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-700 z-50 px-2 pb-safe">
        <div className="flex items-center justify-around h-16">
          {([
            { tab: 'browse' as DashboardTab, label: 'Gallery', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
            { tab: 'messages' as DashboardTab, label: 'Messages', icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z' },
          ]).map(({ tab, label, icon }) => (
            <button
              key={tab}
              onClick={() => { if (tab === 'messages') loadConversations(); setDashboardTab(tab); setMobileMenuOpen(false); }}
              className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition-all ${ dashboardTab === tab ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-400 dark:text-zinc-400' }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
              </svg>
              <span className="text-[10px] font-medium">{label}</span>
            </button>
          ))}

          <div className="relative">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition-all ${ mobileMenuOpen ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-400 dark:text-zinc-400' }`}
            >
              <div className="w-5 h-5 rounded-full bg-zinc-300 flex items-center justify-center text-zinc-600 dark:text-zinc-400 text-[9px] font-bold overflow-hidden">
                {user.profilePicture ? (
                  <img src={user.profilePicture} alt="" className="w-full h-full object-cover" />
                ) : (
                  <img src="/spiral.webp" alt="" className="w-full h-full object-cover" />
                )}
              </div>
              <span className="text-[10px] font-medium">Account</span>
            </button>
            {mobileMenuOpen && (
              <div className="absolute bottom-full mb-1 right-0 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-2xl shadow-xl py-2 w-48 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-150">
                <div className="px-3 pb-2 mb-1 border-b border-zinc-100 dark:border-zinc-800">
                  <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 leading-tight">{user.name || 'User'}</p>
                  <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5">{user.email}</p>
                  <span className="inline-block mt-1.5 text-[9px] font-bold text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded uppercase tracking-wider">{user.role}</span>
                </div>
                <button
                  onClick={() => { setDashboardTab('profile'); setMobileMenuOpen(false); }}
                  className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors mx-1 rounded-lg"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Profile
                </button>
                {user.isDualRole ? (
                  <button
                    onClick={() => { setUser({ ...user, role: 'exhibitor' }); setMobileMenuOpen(false); }}
                    className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors mx-1 rounded-lg"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                    Switch Role
                  </button>
                ) : (
                  <button
                    onClick={() => { setMobileMenuOpen(false); setShowExhibitorPrompt(true); }}
                    className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors mx-1 rounded-lg"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Upgrade Account
                  </button>
                )}
                <button
                  onClick={() => { onLogout(); setMobileMenuOpen(false); }}
                  className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors mx-1 rounded-lg"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>
    </div>
  );
}
