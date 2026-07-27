import { useState, useEffect, useRef } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import type { Artwork, User, Achievement, Message, Notification } from '../types';
import { fetchMyArtworks, deleteArtwork, updateArtwork, fetchMyAchievements, deleteAchievement, uploadImage, updateExhibitor, fetchInbox, replyMessage, fetchNotifications, fetchExhibitorStats } from '../api';
import type { ExhibitorStats } from '../api';
import { useToast } from '../components/Toast';
import { useConfirm } from '../components/ConfirmDialog';
import ArtworkCard from '../components/ArtworkCard';
import ArtworkModal from '../components/ArtworkModal';
import AddArtworkForm from '../components/AddArtworkForm';
import EditArtworkForm from '../components/EditArtworkForm';
import AchievementForm from '../components/AchievementForm';
import ExhibitorProfileView from '../components/ExhibitorProfileView';
import { TrashIcon, EditIcon } from '../components/Icons';
import ChatThreadView from '../components/ChatThreadView';
import CollectorProfileModal from '../components/CollectorProfileModal';
import FilterBar from '../components/FilterBar';
import Sidebar from '../components/Sidebar';
import SettingsModal from '../components/SettingsModal';
import { io } from 'socket.io-client';

interface ExhibitorDashboardProps {
  token: string;
  user: User;
  setUser: (user: User) => void;
  onLogout: () => void;
}

export default function ExhibitorDashboard({
  token,
  user,
  setUser,
  onLogout,
}: ExhibitorDashboardProps) {
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingProfilePic, setUploadingProfilePic] = useState(false);
  const { toast } = useToast();
  const { confirm } = useConfirm();
  const [selectedArtwork, setSelectedArtwork] = useState<Artwork | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showAchievementForm, setShowAchievementForm] = useState(false);
  const [editArtwork, setEditArtwork] = useState<Artwork | null>(null);
  const [dashboardTab, setDashboardTab] = useState<
    'manage' | 'statistics' | 'profile' | 'notifications' | 'messages'
  >('manage');
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [bioInput, setBioInput] = useState(user.bio || '');
  const [savingBio, setSavingBio] = useState(false);
  const [viewingProfilePic, setViewingProfilePic] = useState(false);
  const [showPublicProfile, setShowPublicProfile] = useState(false);
  const [viewingCollectorProfile, setViewingCollectorProfile] = useState<any | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showDashboardMenu, setShowDashboardMenu] = useState(false);
  const dashboardLabelRef = useRef<HTMLDivElement>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadNotifs, setUnreadNotifs] = useState<string[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const unreadCount = unreadNotifs.length;

  const [stats, setStats] = useState<ExhibitorStats | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const types = [...new Set(artworks.map(a => a.type))];

  const markNotifRead = (id: string) => {
    const updated = [...unreadNotifs.filter(n => n !== id)];
    setUnreadNotifs(updated);
    localStorage.setItem(`notifRead_${user.id}`, JSON.stringify(
      notifications.filter(n => !updated.includes(n.id)).map(n => n.id)
    ));
  };

  const [inbox, setInbox] = useState<any[]>([]);
  const [activeThread, setActiveThread] = useState<{ collector: any; messages: Message[] } | null>(null);

  const loadInbox = async () => {
    try {
      const data = await fetchInbox(token);
      setInbox(data);
      setActiveThread((prev: any) => {
        if (!prev) return prev;
        const thread = data.find((t: any) => t.collector.id === prev.collector.id);
        if (thread) {
          const sorted = [...(thread.messages || [])].sort(
            (a: Message, b: Message) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
          return { collector: prev.collector, messages: sorted };
        }
        return prev;
      });
    } catch {}
  };

  const openThread = async (collector: any) => {
    const thread = inbox.find((t: any) => t.collector.id === collector.id);
    if (thread) {
      const sorted = [...(thread.messages || [])].sort(
        (a: Message, b: Message) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
      setActiveThread({ collector, messages: sorted });
    } else {
      setActiveThread({ collector, messages: [] });
    }
  };

  const handleReply = async (content: string) => {
    if (!activeThread) return;
    const msg = await replyMessage(token, {
      collectorId: activeThread.collector.id,
      content,
    });
    setActiveThread((prev) =>
      prev ? { ...prev, messages: [...prev.messages, msg] } : prev
    );
  };

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [aData, achData, sData] = await Promise.all([
        fetchMyArtworks(token),
        fetchMyAchievements(token),
        fetchExhibitorStats(token).catch(() => null),
      ]);
      setArtworks(Array.isArray(aData) ? aData : []);
      setAchievements(Array.isArray(achData) ? achData : []);
      setStats(sData);
    } catch {
      setArtworks([]);
      setAchievements([]);
    } finally {
      setLoading(false);
    }
  };

  const handleProfilePicUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    setUploadingProfilePic(true);
    try {
      const uploadData = await uploadImage(token, e.target.files[0]);
      await updateExhibitor(token, user.id, { profilePicture: uploadData.imageUrl });
      setUser({ ...user, profilePicture: uploadData.imageUrl });
    } catch (err) {
      console.error('Failed to upload profile picture', err);
      toast('Failed to upload profile picture', 'error');
    } finally {
      setUploadingProfilePic(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    loadInbox();
    
    const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:3001');
    socket.emit('join', user.id);
    
    socket.on('newMessage', (msg: Message) => {
      // Reload inbox to update the unread count and latest message preview
      loadInbox();
      
      // If the user has a thread open with this specific collector, append the new message instantly
      setActiveThread((prev) => {
        if (!prev) return prev;
        if (prev.collector.id === msg.collectorId) {
           if (prev.messages.find((m: Message) => m.id === msg.id)) return prev;
           return { ...prev, messages: [...prev.messages, msg] };
        }
        return prev;
      });
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
      : fetchNotifications(token, 'exhibitor');

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

  const handleDeleteArtwork = async (id: string) => {
    const ok = await confirm('Delete this artwork?');
    if (!ok) return;
    try {
      await deleteArtwork(token, id);
      fetchDashboardData();
    } catch {}
  };

  const handleMarkAsSold = async (id: string) => {
    const ok = await confirm('Mark this artwork as sold?');
    if (!ok) return;
    try {
      await updateArtwork(token, id, { status: 'Sold' });
      fetchDashboardData();
    } catch {}
  };

  const handleDeleteAchievement = async (id: string) => {
    const ok = await confirm('Delete this achievement?');
    if (!ok) return;
    try {
      await deleteAchievement(token, id);
      fetchDashboardData();
    } catch {}
  };

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

  const filteredArtworks = artworks.filter(a => a.status === 'Available' && (filterType === 'all' || a.type === filterType));

  const exhibitorTabs = [
    { id: 'manage', label: 'Manage', icon: 'M4 6h16M4 12h16M4 18h16' },
    { id: 'statistics', label: 'Statistics', icon: 'M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z' },
    { id: 'messages', label: 'Messages', icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z' },
    { id: 'profile', label: 'Profile', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
  ];

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans pb-20 sm:pb-0 lg:ml-16">
      <Sidebar
        tabs={exhibitorTabs}
        activeTab={dashboardTab}
        onTabChange={(tab) => { if (tab === 'messages') loadInbox(); setDashboardTab(tab as any); }}
        user={user}
        onLogout={onLogout}
        unreadCount={unreadCount}
        isDualRole={!!user.isDualRole}
        onSwitchRole={() => setUser({ ...user, role: 'collector' })}
      />

      <div className="px-4 sm:px-6 pt-4 sm:pt-6 pb-0 flex items-center justify-between">
        <div ref={dashboardLabelRef} className="relative">
          <button
            onClick={() => setShowDashboardMenu(!showDashboardMenu)}
            className="inline-flex items-center gap-2 px-3 py-1.5 bg-zinc-900 text-white text-xs font-bold rounded-full uppercase tracking-wider hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Exhibitor Dashboard
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
              {user.isDualRole && (
                <button
                  onClick={() => { setUser({ ...user, role: 'collector' }); setShowDashboardMenu(false); }}
                  className="flex items-center gap-2.5 w-full px-3 py-2 text-xs font-semibold text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                  Switch Role
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
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center ring-2 ring-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {dashboardTab === 'manage' && (
        <>
          <div className="max-w-full mx-auto px-4 sm:px-6 pt-6 sm:pt-8 pb-2 sm:pb-4 flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight mb-1 sm:mb-2">My Artworks</h1>
              <p className="text-zinc-500 dark:text-zinc-400 text-sm sm:text-lg">Manage your artwork collection.</p>
            </div>
            <button
              onClick={() => setShowForm(true)}
              className="bg-black text-white font-semibold px-3 py-1.5 rounded-lg hover:bg-zinc-800 transition-all text-xs shrink-0 mt-1"
            >
              + Add Artwork
            </button>
          </div>
          <div className="max-w-full mx-auto px-4 sm:px-6 pb-2 sm:pb-4">
            <FilterBar
              items={[
                { value: 'all', label: 'All', count: artworks.length },
                ...types.map(t => ({ value: t, label: t.replace('_', ' '), count: artworks.filter(a => a.type === t).length }))
              ]}
              selected={filterType}
              onChange={setFilterType}
            />
          </div>

          <div className="max-w-full mx-auto px-4 sm:px-6 pb-24 sm:pb-12">
            {loading ? (
              <div className="flex items-center justify-center py-16 sm:py-32">
                <div className="w-10 h-10 border-4 border-black border-t-transparent rounded-full animate-spin" />
              </div>
            ) : filteredArtworks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 sm:py-32 text-zinc-500 dark:text-zinc-400">
                <div className="w-16 h-16 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-zinc-300 dark:text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                </div>
                <p className="text-xl font-semibold mb-1 text-zinc-800 dark:text-zinc-200">
                  No artworks yet
                </p>
                <p className="text-sm">Click "Add Artwork" to showcase your work.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-4">
                {filteredArtworks.map(a => (
                  <div key={a.id} className="group relative">
                    <ArtworkCard artwork={a} onClick={() => setSelectedArtwork(a)} />
                    <div className="flex gap-2 mt-1.5">
                      {a.status !== 'Sold' && a.status !== 'Deleted' && (
                        <button
                          onClick={() => handleMarkAsSold(a.id)}
                          className="w-6 h-6 flex items-center justify-center rounded-md bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-900 transition-colors"
                          title="Mark as sold"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </button>
                      )}
                      <button
                        onClick={() => setEditArtwork(a)}
                        className="text-zinc-500 dark:text-zinc-400 hover:text-zinc-900"
                      >
                        <EditIcon className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteArtwork(a.id)}
                        className="text-red-400 hover:text-red-600"
                      >
                        <TrashIcon className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {dashboardTab === 'statistics' && (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight mb-6">Statistics</h1>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
            {[
              { label: 'Total Artworks', value: stats?.total ?? artworks.length, color: 'text-zinc-900' },
              { label: 'Available', value: artworks.filter(a => a.status === 'Available').length, color: 'text-emerald-600' },
              { label: 'Sold', value: stats?.sales.count ?? artworks.filter(a => a.status === 'Sold').length, color: 'text-blue-600' },
              { label: 'Total Sales', value: stats ? `₱${stats.sales.total.toLocaleString()}` : '—', color: 'text-zinc-900' },
              { label: 'Avg. Price', value: stats?.sales.count ? `₱${Math.round(stats.sales.averagePrice).toLocaleString()}` : '—', color: 'text-zinc-900' },
              { label: 'Achievements', value: stats?.achievements ?? achievements.length, color: 'text-amber-600' },
            ].map(s => (
              <div key={s.label} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-5">
                <p className="text-[11px] font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">{s.label}</p>
                <p className={`text-xl sm:text-2xl font-black mt-1 ${s.color}`}>{s.value}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5">
              <h2 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 mb-3 uppercase tracking-wider">By Status</h2>
              {artworks.length === 0 ? (
                <p className="text-sm text-zinc-400">No artworks yet.</p>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie
                      data={(stats?.byStatus ?? []).map(s => ({ name: s.status, value: s._count }))}
                      cx="50%" cy="50%" innerRadius={55} outerRadius={90}
                      dataKey="value" stroke="none"
                    >
                      {(stats?.byStatus ?? []).map((_, i) => (
                        <Cell key={i} fill={['#18181b', '#10b981', '#3b82f6', '#a1a1aa'][i % 4]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5">
              <h2 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 mb-3 uppercase tracking-wider">By Type</h2>
              {(stats?.byType ?? []).length === 0 ? (
                <p className="text-sm text-zinc-400">No artworks yet.</p>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={(stats?.byType ?? []).map(t => ({ name: t.type.replace(/_/g, ' '), count: t._count }))}>
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={50} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#18181b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5">
              <h2 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 mb-3 uppercase tracking-wider">Artworks Created</h2>
              {(stats?.artworksByMonth ?? []).length === 0 || (stats?.artworksByMonth ?? []).every(m => m.count === 0) ? (
                <p className="text-sm text-zinc-400">No data yet.</p>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={stats?.artworksByMonth ?? []}>
                    <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#18181b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5">
              <h2 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 mb-3 uppercase tracking-wider">Sales Over Time</h2>
              {(stats?.sales.byMonth ?? []).length === 0 || (stats?.sales.byMonth ?? []).every(m => m.sales === 0) ? (
                <p className="text-sm text-zinc-400">No sales yet.</p>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={stats?.sales.byMonth ?? []}>
                    <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(v) => [`₱${Number(v).toLocaleString()}`, 'Sales']} />
                    <Line type="monotone" dataKey="sales" stroke="#18181b" strokeWidth={1.5} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5">
            <h2 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 mb-3 uppercase tracking-wider">Type Breakdown</h2>
            {types.length === 0 ? (
              <p className="text-sm text-zinc-400">No artworks yet.</p>
            ) : (
              <div className="space-y-2.5">
                {types.map(t => {
                  const total = artworks.filter(a => a.type === t).length;
                  const available = artworks.filter(a => a.type === t && a.status === 'Available').length;
                  const sold = artworks.filter(a => a.type === t && a.status === 'Sold').length;
                  return (
                    <div key={t}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="font-medium text-zinc-700 dark:text-zinc-300 capitalize">{t.replace(/_/g, ' ')}</span>
                        <span className="text-zinc-400 text-xs">{total}</span>
                      </div>
                      <div className="w-full h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden flex">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all"
                          style={{ width: `${total ? (available / total) * 100 : 0}%` }}
                        />
                        <div
                          className="h-full bg-blue-500 rounded-full transition-all"
                          style={{ width: `${total ? (sold / total) * 100 : 0}%` }}
                        />
                      </div>
                      <div className="flex gap-4 mt-0.5">
                        <span className="text-[10px] text-emerald-600">Available: {available}</span>
                        <span className="text-[10px] text-blue-600">Sold: {sold}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {dashboardTab === 'profile' && (
        <>
          <ExhibitorProfileView
            initialData={{
              exhibitor: {
                name: user.name || '',
                email: user.email,
                bio: user.bio,
                profilePicture: user.profilePicture,
                role: user.role,
              },
              artworks,
              achievements,
            }}
            isOwner
            onViewProfilePic={() => setViewingProfilePic(true)}
            onUpdateProfilePic={handleProfilePicUpload}
            isUploadingPic={uploadingProfilePic}
            isEditingBio={isEditingBio}
            bioInput={bioInput}
            onBioInputChange={setBioInput}
            onStartEditBio={() => { setBioInput(user.bio || ''); setIsEditingBio(true); }}
            onSaveBio={async () => {
              setSavingBio(true);
              try {
                await updateExhibitor(token, user.id, { bio: bioInput });
                setUser({ ...user, bio: bioInput });
                setIsEditingBio(false);
              } catch (err) {
                console.error('Failed to update bio', err);
                toast('Failed to update bio', 'error');
              } finally {
                setSavingBio(false);
              }
            }}
            onCancelBio={() => setIsEditingBio(false)}
            savingBio={savingBio}
            onAddAchievement={() => setShowAchievementForm(true)}
            onDeleteAchievement={handleDeleteAchievement}
          />
          {user.isDualRole && (
            <div className="flex items-center justify-center gap-3 mt-4">
              <button onClick={() => setUser({ ...user, role: 'collector' })} className="text-xs font-semibold bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 px-4 py-2 rounded-lg hover:bg-amber-200 transition-colors">
                Switch to Collector Dashboard
              </button>
            </div>
          )}
        </>
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
                    <div className={`mt-0.5 w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isUnread ? 'bg-zinc-900' : 'bg-zinc-100 dark:bg-zinc-800'}`}>
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
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          {activeThread ? (
            <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl overflow-hidden flex flex-col h-[calc(100vh-180px)] sm:h-[70vh]">
              <div className="flex items-center gap-3 px-5 py-4 border-b border-zinc-100 dark:border-zinc-800 shrink-0">
                <button
                  onClick={() => setActiveThread(null)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>

                <div 
                  className="w-9 h-9 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden flex items-center justify-center text-zinc-700 dark:text-zinc-300 text-sm font-bold shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => setViewingCollectorProfile(activeThread.collector)}
                  title="View Profile"
                >
                  {activeThread.collector.profilePicture ? (
                    <img src={activeThread.collector.profilePicture} alt={activeThread.collector.name} className="w-full h-full object-cover" />
                  ) : (
                    <img src="/spiral.webp" alt="" className="w-full h-full object-cover" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">{activeThread.collector.name}</p>
                  <p className="text-[10px] text-zinc-400 dark:text-zinc-500">Collector</p>
                </div>
              </div>

              <ChatThreadView
                messages={activeThread.messages}
                currentRole="exhibitor"
                onSendMessage={handleReply}
                placeholder="Reply…"
                emptyStateHeader="No messages yet"
              />
            </div>
          ) : (
            inbox.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center gap-3">
                <div className="w-14 h-14 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                  <svg className="w-6 h-6 text-zinc-400 dark:text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">No messages yet</p>
                <p className="text-xs text-zinc-400 dark:text-zinc-500">Collectors who message you about your artworks will appear here.</p>
              </div>
            ) : (
              <div className="space-y-2">
                <h2 className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-4">Inbox</h2>
                {inbox.map((thread) => (
                  <button
                    key={thread.collector.id}
                    onClick={() => openThread(thread.collector)}
                    className="w-full flex items-center gap-4 p-4 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl hover:border-zinc-200 dark:hover:border-zinc-700 hover:shadow-sm dark:shadow-zinc-900/30 transition-all text-left"
                  >
                    <div className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-700 dark:text-zinc-300 text-sm font-bold shrink-0 overflow-hidden">
                      {thread.collector.profilePicture ? (
                        <img src={thread.collector.profilePicture} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <img src="/spiral.webp" alt="" className="w-full h-full object-cover" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">{thread.collector.name}</p>
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
        />
      )}

      {showForm && (
        <AddArtworkForm
          token={token}
          onClose={() => setShowForm(false)}
          onCreated={fetchDashboardData}
        />
      )}

      {editArtwork && (
        <EditArtworkForm
          artwork={editArtwork}
          token={token}
          onClose={() => setEditArtwork(null)}
          onUpdated={fetchDashboardData}
        />
      )}

      {showAchievementForm && (
        <AchievementForm
          token={token}
          onClose={() => setShowAchievementForm(false)}
          onCreated={fetchDashboardData}
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

      {showPublicProfile && (
        <ExhibitorProfileView
          exhibitorId={user.id}
          canChat={false}
          onClose={() => setShowPublicProfile(false)}
        />
      )}

      {viewingCollectorProfile && (
        <CollectorProfileModal 
          collector={viewingCollectorProfile} 
          onClose={() => setViewingCollectorProfile(null)} 
        />
      )}

      <nav ref={mobileNavRef} className="sm:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-700 z-50 px-2 pb-safe">
        <div className="flex items-center justify-around h-16">
          {([
            { tab: 'manage' as const, label: 'Manage', icon: 'M4 6h16M4 12h16M4 18h16' },
            { tab: 'statistics' as const, label: 'Stats', icon: 'M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z' },
            { tab: 'messages' as const, label: 'Messages', icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z' },
          ]).map(({ tab, label, icon }) => (
            <button
              key={tab}
              onClick={() => { if (tab === 'messages') loadInbox(); setDashboardTab(tab); setMobileMenuOpen(false); }}
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
                {user.isDualRole && (
                  <button
                    onClick={() => { setUser({ ...user, role: 'collector' }); setMobileMenuOpen(false); }}
                    className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors mx-1 rounded-lg"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                    Switch Role
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

      <style>{`
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
}
