import { useState, useEffect, useRef } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import type { User, Achievement, Report } from '../types';
import type { AdminStats } from '../api';
import { useToast } from '../components/Toast';
import { useConfirm } from '../components/ConfirmDialog';
import { fetchAdminStats, fetchPendingAchievements, verifyAchievement, fetchAdminUsers, fetchPendingExhibitorRequests, approveExhibitorRequest, rejectExhibitorRequest, createNotification, fetchAdminSettings, updateAdminSettings, fetchAdminReports, resolveReport } from '../api';
import Sidebar from '../components/Sidebar';
import ExhibitorProfileView from '../components/ExhibitorProfileView';
import CollectorProfileModal from '../components/CollectorProfileModal';
import SettingsModal from '../components/SettingsModal';

interface AdminDashboardProps {
  user: User;
  token: string;
  setUser: (u: User) => void;
  onLogout: () => void;
}

type AdminTab = 'overview' | 'management' | 'notifications' | 'settings' | 'reports';

export default function AdminDashboard({ user, token, setUser, onLogout }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mobileNavRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (mobileNavRef.current && !mobileNavRef.current.contains(e.target as Node)) setMobileMenuOpen(false);
    };
    if (mobileMenuOpen) {
      document.addEventListener('mousedown', handleClick);
      return () => document.removeEventListener('mousedown', handleClick);
    }
  }, [mobileMenuOpen]);

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [pendingAchievements, setPendingAchievements] = useState<Achievement[]>([]);
  const [pendingExhibitorRequests, setPendingExhibitorRequests] = useState<any[]>([]);
  const [users, setUsers] = useState<{ exhibitors: any[]; collectors: any[] }>({ exhibitors: [], collectors: [] });
  const [loading, setLoading] = useState(false);
  const [notifTitle, setNotifTitle] = useState('');
  const [notifMessage, setNotifMessage] = useState('');
  const [notifTarget, setNotifTarget] = useState<'all' | 'collectors' | 'exhibitors'>('all');
  const [sendingNotif, setSendingNotif] = useState(false);
  const [notifStatus, setNotifStatus] = useState('');
  const [settings, setSettings] = useState<{ paymentEnabled: boolean; achievementsEnabled: boolean; collectorRegistrationEnabled: boolean } | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const [viewingProfile, setViewingProfile] = useState<{ id: string; role: 'exhibitor' | 'collector' } | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [notifViewed, setNotifViewed] = useState(false);
  const [mgmtTab, setMgmtTab] = useState<'users' | 'requests'>('users');
  const [userSearch, setUserSearch] = useState('');
  const [reports, setReports] = useState<Report[]>([]);
  const { toast } = useToast();
  const { confirm } = useConfirm();

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'overview') {
        const s = await fetchAdminStats(token);
        setStats(s);
      } else if (activeTab === 'management') {
        const [a, requests, u] = await Promise.all([
          fetchPendingAchievements(token),
          fetchPendingExhibitorRequests(token),
          fetchAdminUsers(token),
        ]);
        setPendingAchievements(a);
        setPendingExhibitorRequests(requests);
        setUsers(u);
      } else if (activeTab === 'settings') {
        const s = await fetchAdminSettings(token);
        setSettings(s);
      } else if (activeTab === 'notifications') {
        // no data to fetch
      } else if (activeTab === 'reports') {
        const r = await fetchAdminReports(token);
        setReports(r);
      }
    } catch (err) {
      console.error('Failed to load admin data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeTab]);

  useEffect(() => {
    Promise.all([
      fetchPendingAchievements(token),
      fetchPendingExhibitorRequests(token),
    ]).then(([a, r]) => {
      setPendingAchievements(a);
      setPendingExhibitorRequests(r);
      setNotifViewed(false);
    }).catch(() => {});
  }, []);

  const pendingCount = pendingAchievements.length + pendingExhibitorRequests.length;

  const handleVerify = async (id: string) => {
    const ok = await confirm('Approve this achievement?');
    if (!ok) return;
    try {
      await verifyAchievement(token, id);
      loadData(); // refresh the list
    } catch (err) {
      console.error('Verification failed', err);
      toast('Verification failed', 'error');
    }
  };

  const handleApproveExhibitor = async (id: string) => {
    const ok = await confirm('Approve this exhibitor request?');
    if (!ok) return;
    try {
      await approveExhibitorRequest(token, id);
      loadData(); // refresh the list
    } catch (err) {
      console.error('Approval failed', err);
      toast('Approval failed', 'error');
    }
  };

  const handleSendNotification = async () => {
    if (!notifTitle.trim() || !notifMessage.trim()) return;
    setSendingNotif(true);
    setNotifStatus('');
    try {
      await createNotification(token, { title: notifTitle, message: notifMessage, target: notifTarget });
      setNotifTitle('');
      setNotifMessage('');
      setNotifTarget('all');
      setNotifStatus('Notification sent successfully!');
    } catch (err) {
      console.error('Failed to send notification', err);
      setNotifStatus('Failed to send notification');
    } finally {
      setSendingNotif(false);
    }
  };

  const viewUserProfile = async (id: string, role: 'exhibitor' | 'collector') => {
    setViewingProfile({ id, role });
  };

  const handleToggle = async (field: 'paymentEnabled' | 'achievementsEnabled' | 'collectorRegistrationEnabled') => {
    if (!settings) return;
    const current = settings[field];
    const labels: Record<string, string> = { paymentEnabled: 'listing payment', achievementsEnabled: 'achievement submissions', collectorRegistrationEnabled: 'collector registration' };
    const action = current ? 'disable' : 'enable';
    const ok = await confirm(`Are you sure you want to ${action} ${labels[field]}?`);
    if (!ok) return;
    setSavingSettings(true);
    try {
      const result = await updateAdminSettings(token, { [field]: !current });
      setSettings(result);
      toast(`${labels[field]} ${!current ? 'enabled' : 'disabled'}.`, 'success');
    } catch {
      toast('Failed to update settings.', 'error');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleRejectExhibitor = async (id: string) => {
    const ok = await confirm('Reject this exhibitor request?');
    if (!ok) return;
    try {
      await rejectExhibitorRequest(token, id);
      loadData(); // refresh the list
    } catch (err) {
      console.error('Rejection failed', err);
      toast('Rejection failed', 'error');
    }
  };

  const adminTabs = [
    { id: 'overview', label: 'Overview', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    { id: 'management', label: 'Users', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
    { id: 'notifications', label: 'Notifs', icon: 'M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0' },
    { id: 'reports', label: 'Reports', icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z' },
    { id: 'settings', label: 'Settings', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
  ];

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans pb-20 md:pb-0 lg:ml-16">
      <Sidebar
        tabs={adminTabs}
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab as any)}
        user={user}
        onLogout={onLogout}
      />


      <div className="max-w-7xl mx-auto px-6 sm:px-8 py-10">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center min-w-0">
              <div className="min-w-0">
                <h1 className="text-xl sm:text-3xl font-black tracking-tight text-zinc-900 dark:text-zinc-100 capitalize truncate">
                  {activeTab}
                </h1>
                <p className="text-zinc-500 dark:text-zinc-400 mt-0.5 sm:mt-1 text-xs sm:text-sm truncate">
                  {activeTab === 'overview' && 'Platform statistics and overview.'}
                  {activeTab === 'management' && 'User management — approvals and user lists.'}
                  {activeTab === 'notifications' && 'Send notifications to collectors and exhibitors.'}
                  {activeTab === 'settings' && 'Configure platform settings.'}
                  {activeTab === 'reports' && 'User-submitted reports and feedback.'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <div className="relative">
                <button onClick={() => { setShowNotifDropdown(!showNotifDropdown); setNotifViewed(true); }} className="relative p-2 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                  </svg>
                  {pendingCount > 0 && !notifViewed && (
                    <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full text-white text-[8px] font-bold flex items-center justify-center">
                      {pendingCount > 9 ? '9+' : pendingCount}
                    </span>
                  )}
                </button>
                {showNotifDropdown && (
                  <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-lg py-2 z-50">
                    <div className="px-3 pb-1.5 mb-1 border-b border-zinc-100 dark:border-zinc-800">
                      <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Pending Approvals</p>
                    </div>
                    {pendingCount === 0 ? (
                      <p className="px-3 py-3 text-xs text-zinc-400">Nothing needs approval.</p>
                    ) : (
                      <div className="max-h-60 overflow-y-auto space-y-0.5">
                        {pendingAchievements.map(a => (
                          <div key={a.id} className="flex items-center gap-2 px-3 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-800">
                            <div className="w-6 h-6 rounded bg-zinc-100 dark:bg-zinc-700 flex items-center justify-center text-[8px] text-zinc-400 overflow-hidden shrink-0">
                              {a.proofImageUrl ? <img src={a.proofImageUrl} alt="" className="w-full h-full object-cover" /> : '📄'}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-medium text-zinc-900 dark:text-zinc-100 truncate">{a.title}</p>
                              <p className="text-[10px] text-zinc-400 truncate">{a.exhibitor?.name} · Achievement</p>
                            </div>
                          </div>
                        ))}
                        {pendingExhibitorRequests.map(r => (
                          <div key={r.id} className="flex items-center gap-2 px-3 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-800">
                            <div className="w-6 h-6 rounded-full bg-zinc-100 dark:bg-zinc-700 flex items-center justify-center text-[8px] text-zinc-400 overflow-hidden shrink-0">
                              {r.profilePicture ? <img src={r.profilePicture} alt="" className="w-full h-full object-cover" /> : '👤'}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-medium text-zinc-900 dark:text-zinc-100 truncate">{r.name}</p>
                              <p className="text-[10px] text-zinc-400 truncate">Exhibitor upgrade request</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="border-t border-zinc-100 dark:border-zinc-800 mt-1 pt-1 px-2">
                      <button onClick={() => { setActiveTab('management'); setMgmtTab('requests'); setShowNotifDropdown(false); }} className="w-full text-left px-2 py-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-lg transition-colors">
                        View all →
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <button onClick={() => setShowSettings(true)} className="p-2 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-10 h-10 border-4 border-zinc-200 dark:border-zinc-700 border-t-zinc-900 rounded-full animate-spin" />
          </div>
        ) : (  
          <div className="contents">
            {activeTab === 'overview' && stats && (
              <div className="space-y-10">
                <div className="flex gap-10">
                  <div>
                    <p className="text-xs text-zinc-400 dark:text-zinc-500 font-semibold">Total Users</p>
                    <p className="text-3xl font-black text-zinc-900 dark:text-zinc-100 mt-0.5">{stats.users.total}</p>
                    <p className="text-xs text-zinc-400 mt-1">{stats.users.exhibitors} exhibitors · {stats.users.collectors} collectors</p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-400 dark:text-zinc-500 font-semibold">Total Artworks</p>
                    <p className="text-3xl font-black text-zinc-900 dark:text-zinc-100 mt-0.5">{stats.artworks.total}</p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-400 dark:text-zinc-500 font-semibold">Total Sales</p>
                    <p className="text-3xl font-black text-zinc-900 dark:text-zinc-100 mt-0.5">₱{stats.sales.totalValue.toLocaleString()}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-10 gap-y-8">
                  <div>
                    <p className="text-xs text-zinc-400 dark:text-zinc-500 font-semibold mb-3">Artworks by Status</p>
                    <ResponsiveContainer width="100%" height={240}>
                      <PieChart>
                        <Pie data={stats.artworks.byStatus.map(s => ({ name: s.status, value: s._count }))} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" stroke="none">
                          {stats.artworks.byStatus.map((_, i) => (
                            <Cell key={i} fill={['#18181b', '#52525b', '#a1a1aa', '#d4d4d4'][i % 4]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <div>
                    <p className="text-xs text-zinc-400 dark:text-zinc-500 font-semibold mb-3">Artworks by Type</p>
                    <ResponsiveContainer width="100%" height={240}>
                      <BarChart data={stats.artworks.byType.map(t => ({ name: t.type.replace(/_/g, ' '), count: t._count }))}>
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={50} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip />
                        <Bar dataKey="count" fill="#18181b" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div>
                    <p className="text-xs text-zinc-400 dark:text-zinc-500 font-semibold mb-3">Sales Over Time</p>
                    <ResponsiveContainer width="100%" height={240}>
                      <LineChart data={stats.sales.byMonth}>
                        <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip formatter={(v) => [`₱${Number(v).toLocaleString()}`, 'Sales']} />
                        <Line type="monotone" dataKey="sales" stroke="#18181b" strokeWidth={1.5} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  <div>
                    <p className="text-xs text-zinc-400 dark:text-zinc-500 font-semibold mb-3">User Registrations</p>
                    <ResponsiveContainer width="100%" height={240}>
                      <BarChart data={stats.usersByMonth}>
                        <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip />
                        <Bar dataKey="exhibitors" fill="#18181b" stackId="a" />
                        <Bar dataKey="collectors" fill="#a1a1aa" stackId="a" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'management' && (
              <div>
                <div className="flex gap-6 border-b border-zinc-200 dark:border-zinc-800 mb-6">
                  <button onClick={() => setMgmtTab('users')} className={`pb-2 text-sm font-semibold border-b-2 transition-all ${mgmtTab === 'users' ? 'border-zinc-900 dark:border-zinc-100 text-zinc-900 dark:text-zinc-100' : 'border-transparent text-zinc-400 dark:text-zinc-500 hover:text-zinc-600'}`}>
                    Users
                  </button>
                  <button onClick={() => setMgmtTab('requests')} className={`pb-2 text-sm font-semibold border-b-2 transition-all ${mgmtTab === 'requests' ? 'border-zinc-900 dark:border-zinc-100 text-zinc-900 dark:text-zinc-100' : 'border-transparent text-zinc-400 dark:text-zinc-500 hover:text-zinc-600'}`}>
                    Requests
                    {(pendingAchievements.length > 0 || pendingExhibitorRequests.length > 0) && (
                      <span className="ml-1.5 text-xs text-zinc-400 dark:text-zinc-500">({pendingAchievements.length + pendingExhibitorRequests.length})</span>
                    )}
                  </button>
                </div>

                {mgmtTab === 'users' && (
                  <div>
                    <div className="relative mb-6">
                      <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 dark:text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                      <input type="text" value={userSearch} onChange={e => setUserSearch(e.target.value)} placeholder="Search users..." className="w-full bg-transparent border border-zinc-200 dark:border-zinc-700 rounded-lg pl-10 pr-4 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-500 transition-colors" />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div>
                        <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 mb-3">{users.exhibitors.length} Exhibitors</h2>
                        <div className="space-y-1">
                          {users.exhibitors.filter(e => !userSearch || e.name.toLowerCase().includes(userSearch.toLowerCase()) || e.email.toLowerCase().includes(userSearch.toLowerCase())).map(e => (
                            <div key={e.id} onClick={() => viewUserProfile(e.id, 'exhibitor')} className="px-3 py-2.5 flex items-center justify-between hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-lg cursor-pointer transition-colors">
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">{e.name}</p>
                                <p className="text-xs text-zinc-400 dark:text-zinc-500 truncate">{e.email}</p>
                              </div>
                              <p className="text-xs text-zinc-400 dark:text-zinc-500 ml-4 shrink-0">{e._count.artworks} artworks</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 mb-3">{users.collectors.length} Collectors</h2>
                        <div className="space-y-1">
                          {users.collectors.filter(c => !userSearch || c.name.toLowerCase().includes(userSearch.toLowerCase()) || c.email.toLowerCase().includes(userSearch.toLowerCase())).map(c => (
                            <div key={c.id} onClick={() => viewUserProfile(c.id, 'collector')} className="px-3 py-2.5 flex items-center justify-between hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-lg cursor-pointer transition-colors">
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">{c.name}</p>
                                <p className="text-xs text-zinc-400 dark:text-zinc-500 truncate">{c.email}</p>
                              </div>
                              <p className="text-xs text-zinc-400 dark:text-zinc-500 ml-4 shrink-0">{c._count.soldArtworks} purchases</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {mgmtTab === 'requests' && (
                  <div className="space-y-8">
                    <div>
                      <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 mb-3">Achievement Approvals</h2>
                      {pendingAchievements.length === 0 ? (
                        <p className="text-sm text-zinc-400 dark:text-zinc-500">No pending achievements.</p>
                      ) : (
                        <div className="space-y-2">
                          {pendingAchievements.map(a => (
                            <div key={a.id} className="flex items-start gap-4 px-3 py-3 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-lg transition-colors">
                              <div className="w-16 h-12 shrink-0 rounded bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center overflow-hidden text-xs text-zinc-400 dark:text-zinc-500">
                                {a.proofImageUrl ? <img src={a.proofImageUrl} alt="" className="w-full h-full object-cover" /> : 'No img'}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">{a.title}</p>
                                  <span className="text-[10px] text-amber-600 dark:text-amber-400 shrink-0">Pending</span>
                                </div>
                                <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">{a.exhibitor?.name}{a.year ? ` · ${a.year}` : ''}</p>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                {a.proofLink && <a href={a.proofLink} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline">Link</a>}
                                <button onClick={() => handleVerify(a.id)} className="text-xs font-medium text-zinc-900 dark:text-zinc-100 bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 px-3 py-1.5 rounded-md transition-colors">Approve</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div>
                      <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 mb-3">Exhibitor Upgrade Requests</h2>
                      {pendingExhibitorRequests.length === 0 ? (
                        <p className="text-sm text-zinc-400 dark:text-zinc-500">No upgrade requests.</p>
                      ) : (
                        <div className="space-y-2">
                          {pendingExhibitorRequests.map(r => (
                            <div key={r.id} className="flex items-center justify-between px-3 py-3 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-lg transition-colors">
                              <div className="flex items-center gap-3 min-w-0 flex-1">
                                <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-700 overflow-hidden shrink-0">
                                  <img src={r.profilePicture || '/spiral.webp'} alt="" className="w-full h-full object-cover" />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">{r.name}</p>
                                  <p className="text-xs text-zinc-400 dark:text-zinc-500">{r.email}{r.phone ? ` · ${r.phone}` : ''}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0 ml-4">
                                <button onClick={() => handleRejectExhibitor(r.id)} className="text-xs text-red-600 hover:text-red-700 font-medium px-3 py-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors">Reject</button>
                                <button onClick={() => handleApproveExhibitor(r.id)} className="text-xs font-medium text-zinc-900 dark:text-zinc-100 bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 px-3 py-1.5 rounded-md transition-colors">Approve</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="max-w-lg">
                <div className="space-y-6">
                  <div className="flex items-center justify-between py-3 border-b border-zinc-100 dark:border-zinc-800">
                    <div>
                      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Listing Payment</p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{settings?.paymentEnabled ? 'Exhibitors must pay a listing fee.' : 'Artworks are published for free.'}</p>
                    </div>
                    <button onClick={() => handleToggle('paymentEnabled')} disabled={savingSettings || !settings} className={`shrink-0 relative inline-flex h-6 w-10 cursor-pointer rounded-full border-2 border-transparent transition-colors ${settings?.paymentEnabled ? 'bg-zinc-900' : 'bg-zinc-300 dark:bg-zinc-600'} disabled:opacity-50`}>
                      <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition-transform ${settings?.paymentEnabled ? 'translate-x-4' : 'translate-x-0'}`} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between py-3 border-b border-zinc-100 dark:border-zinc-800">
                    <div>
                      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Achievement Submissions</p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{settings?.achievementsEnabled ? 'Exhibitors can submit achievements.' : 'Achievement submissions are disabled.'}</p>
                    </div>
                    <button onClick={() => handleToggle('achievementsEnabled')} disabled={savingSettings || !settings} className={`shrink-0 relative inline-flex h-6 w-10 cursor-pointer rounded-full border-2 border-transparent transition-colors ${settings?.achievementsEnabled ? 'bg-zinc-900' : 'bg-zinc-300 dark:bg-zinc-600'} disabled:opacity-50`}>
                      <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition-transform ${settings?.achievementsEnabled ? 'translate-x-4' : 'translate-x-0'}`} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between py-3 border-b border-zinc-100 dark:border-zinc-800">
                    <div>
                      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Collector Registration</p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{settings?.collectorRegistrationEnabled ? 'New collectors can sign up.' : 'Collector registration is closed.'}</p>
                    </div>
                    <button onClick={() => handleToggle('collectorRegistrationEnabled')} disabled={savingSettings || !settings} className={`shrink-0 relative inline-flex h-6 w-10 cursor-pointer rounded-full border-2 border-transparent transition-colors ${settings?.collectorRegistrationEnabled ? 'bg-zinc-900' : 'bg-zinc-300 dark:bg-zinc-600'} disabled:opacity-50`}>
                      <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition-transform ${settings?.collectorRegistrationEnabled ? 'translate-x-4' : 'translate-x-0'}`} />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="max-w-2xl">
                <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-700 p-8 shadow-sm">
                  <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-6">Send a Notification</h2>
                  
                  <div className="space-y-5">
                    <div>
                      <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">Title</label>
                      <input
                        type="text"
                        value={notifTitle}
                        onChange={e => setNotifTitle(e.target.value)}
                        placeholder="e.g. New Feature Announcement"
                        className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-3 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-900/20 focus:border-zinc-400 dark:focus:border-zinc-500 transition-all"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">Message</label>
                      <textarea
                        value={notifMessage}
                        onChange={e => setNotifMessage(e.target.value)}
                        placeholder="Write your notification message..."
                        rows={4}
                        className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-3 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-900/20 focus:border-zinc-400 dark:focus:border-zinc-500 transition-all resize-none"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">Send To</label>
                      <div className="flex gap-2 p-1 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-700 w-fit">
                        {(['all', 'collectors', 'exhibitors'] as const).map(t => (
                          <button
                            key={t}
                            onClick={() => setNotifTarget(t)}
                            className={`px-4 py-2 rounded-lg text-sm font-semibold capitalize transition-all ${ notifTarget === t ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-sm dark:shadow-zinc-900/30 border border-zinc-200 dark:border-zinc-700' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100' }`}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>

                    {notifStatus && (
                      <div className={`text-sm font-semibold ${notifStatus.includes('successfully') ? 'text-emerald-600' : 'text-red-600'}`}>
                        {notifStatus}
                      </div>
                    )}

                    <button
                      onClick={handleSendNotification}
                      disabled={sendingNotif || !notifTitle.trim() || !notifMessage.trim()}
                      className="w-full bg-zinc-900 text-white font-bold py-3.5 rounded-xl hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md shadow-zinc-900/20"
                    >
                      {sendingNotif ? (
                        <span className="flex items-center justify-center gap-2">
                          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Sending...
                        </span>
                      ) : (
                        'Send Notification'
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'reports' && (
            <div className="space-y-3">
              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="w-8 h-8 border-2 border-zinc-300 border-t-zinc-800 rounded-full animate-spin" />
                </div>
              ) : reports.length === 0 ? (
                <div className="text-center py-20 text-zinc-400">
                  <p className="text-lg font-semibold">No reports yet</p>
                  <p className="text-sm mt-1">User-submitted reports will appear here.</p>
                </div>
              ) : (
                reports.map(r => (
                  <div key={r.id} className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 sm:p-5">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="min-w-0">
                        <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">{r.subject}</h3>
                        <p className="text-xs text-zinc-500 mt-0.5">
                          From {r.userRole} &middot; {new Date(r.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <span className={`shrink-0 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${r.status === 'pending' ? 'bg-amber-50 text-amber-600 border border-amber-200' : 'bg-emerald-50 text-emerald-600 border border-emerald-200'}`}>
                        {r.status}
                      </span>
                    </div>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400 whitespace-pre-wrap">{r.message}</p>
                    {r.status === 'pending' && (
                      <button
                        onClick={async () => {
                          try {
                            await resolveReport(token, r.id);
                            setReports(prev => prev.map(x => x.id === r.id ? { ...x, status: 'resolved', resolvedAt: new Date().toISOString() } : x));
                          } catch { toast('Failed to resolve report', 'error'); }
                        }}
                        className="mt-3 text-xs font-semibold text-emerald-600 hover:text-emerald-700 transition-colors"
                      >
                        Mark as Resolved
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
            </div>
          )}
        </div>

      {/* Mobile bottom nav */}
      <nav ref={mobileNavRef} className="sm:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 z-50 px-1 pb-safe">
        <div className="flex items-center justify-between h-14 max-w-md mx-auto">
          {([
            { tab: 'overview' as AdminTab, label: 'Overview', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
            { tab: 'management' as AdminTab, label: 'Users', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
            { tab: 'notifications' as AdminTab, label: 'Notifs', icon: 'M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0' },
            { tab: 'reports' as AdminTab, label: 'Reports', icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z' },
            { tab: 'settings' as AdminTab, label: 'Settings', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
          ]).map(({ tab, label, icon }) => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); setMobileMenuOpen(false); }}
              className={`flex flex-col items-center gap-0.5 px-2 py-1 transition-all ${ activeTab === tab ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-400 dark:text-zinc-500' }`}
            >
              <div className={`p-1.5 rounded-lg ${activeTab === tab ? 'bg-zinc-100 dark:bg-zinc-800' : ''}`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
                </svg>
              </div>
              <span className="text-[10px] font-medium">{label}</span>
            </button>
          ))}
          <div className="relative">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className={`flex flex-col items-center gap-0.5 px-2 py-1 transition-all ${ mobileMenuOpen ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-400 dark:text-zinc-500' }`}
            >
              <div className={`p-1.5 rounded-lg ${mobileMenuOpen ? 'bg-zinc-100 dark:bg-zinc-800' : ''}`}>
                <div className="w-5 h-5 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-zinc-500 text-[9px] font-bold overflow-hidden">
                  {(user.name || user.email).charAt(0).toUpperCase()}
                </div>
              </div>
              <span className="text-[10px] font-medium">Account</span>
            </button>
            {mobileMenuOpen && (
              <div className="absolute bottom-full mb-2 right-0 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-lg py-2 w-44 flex flex-col overflow-hidden">
                <div className="px-3 pb-2 mb-1 border-b border-zinc-100 dark:border-zinc-800">
                  <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 leading-tight">{user.name || 'User'}</p>
                  <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5 truncate">{user.email}</p>
                  <span className="inline-block mt-1.5 text-[9px] font-bold text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded uppercase tracking-wider">{user.role}</span>
                </div>
                <button
                  onClick={() => { setActiveTab('overview'); setMobileMenuOpen(false); }}
                  className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors mx-1 rounded-lg"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Profile
                </button>
                <button
                  onClick={() => { setActiveTab('settings'); setMobileMenuOpen(false); }}
                  className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors mx-1 rounded-lg"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Settings
                </button>
                <div className="border-t border-zinc-100 dark:border-zinc-800 mx-1 my-1" />
                <button
                  onClick={() => { onLogout(); setMobileMenuOpen(false); }}
                  className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors mx-1 rounded-lg"
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

      {viewingProfile?.role === 'exhibitor' && (
        <ExhibitorProfileView
          exhibitorId={viewingProfile.id}
          onClose={() => setViewingProfile(null)}
        />
      )}

      {viewingProfile?.role === 'collector' && (
        <CollectorProfileModal
          collector={users.collectors.find(c => c.id === viewingProfile.id)!}
          onClose={() => setViewingProfile(null)}
        />
      )}

      {showSettings && (
        <SettingsModal user={user} token={token} setUser={setUser} onClose={() => setShowSettings(false)} />
      )}
    </div>
  );
}
