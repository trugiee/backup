import { useState, useEffect, useRef } from 'react';
import type { View, User } from './types';
import { useTheme } from './theme';
import { confirmAndCreateArtwork } from './api';
import LandingPage from './pages/LandingPage';
import AuthPage from './pages/AuthPage';
import GalleryPage from './pages/GalleryPage';
import ExhibitorDashboard from './pages/ExhibitorDashboard';
import CollectorDashboard from './pages/CollectorDashboard';
import AdminDashboard from './pages/AdminDashboard';
import SplashScreen from './components/SplashScreen';
import AiAssistantButton from './components/AiAssistantButton';
import { useToast } from './components/Toast';

export default function App() {
  const { theme, setTheme } = useTheme();
  const [view, setView] = useState<View>(() => {
    const savedView = localStorage.getItem('ggallery_view');
    if (savedView === 'gallery') return 'gallery';
    return 'landing';
  });
  const [token, setToken] = useState(() => localStorage.getItem('ggallery_token') || '');
  const [user, setUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('ggallery_user');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });
  const [splashDone, setSplashDone] = useState(false);
  const processingPayment = useRef(false);
  const { toast } = useToast();

  useEffect(() => {
    const isPublic = view === 'landing' || view === 'login';
    document.documentElement.classList.toggle('dark', !isPublic && theme === 'dark');
  }, [view, theme]);

  async function processPendingPayment(paymentId: string) {
    if (processingPayment.current) return;
    processingPayment.current = true;
    const savedData = localStorage.getItem('ggallery_pending_artwork');
    if (!savedData) { processingPayment.current = false; return; }
    const artworkData = JSON.parse(savedData);
    try {
      const res = await confirmAndCreateArtwork(token, paymentId, artworkData);
      if (res.artwork) toast('Payment successful! Your artwork is now live.', 'success');
      localStorage.removeItem('ggallery_pending_artwork');
      localStorage.removeItem('ggallery_pending_payment_id');
    } catch (err: any) {
      console.error('confirmAndCreateArtwork error:', err);
      toast('Payment confirmed but artwork creation failed: ' + (err.message || 'Unknown error') + '. Your draft is saved.', 'error');
    } finally {
      processingPayment.current = false;
    }
  }

  useEffect(() => {
    if (!token) return;

    const params = new URLSearchParams(window.location.search);
    const listingStatus = params.get('listing');
    const urlPaymentId = params.get('payment_id');

    if (listingStatus === 'success' && urlPaymentId) {
      localStorage.setItem('ggallery_pending_payment_id', urlPaymentId);
      processPendingPayment(urlPaymentId);
      window.history.replaceState({}, '', window.location.pathname);
    } else if (listingStatus === 'cancelled') {
      toast('Listing payment was cancelled. Your artwork is saved as draft.', 'info');
      window.history.replaceState({}, '', window.location.pathname);
    } else {
      const savedPaymentId = localStorage.getItem('ggallery_pending_payment_id');
      if (savedPaymentId) {
        processPendingPayment(savedPaymentId);
      }
    }
  }, [token]);

  const handleAuth = (jwt: string, u: User) => {
    setToken(jwt);
    setUser(u);
    setView('gallery');
    localStorage.setItem('ggallery_token', jwt);
    localStorage.setItem('ggallery_user', JSON.stringify(u));
    localStorage.setItem('ggallery_view', 'gallery');
    if (u.theme) setTheme(u.theme as 'light' | 'dark');
  };

  const handleLogout = () => {
    setToken('');
    setUser(null);
    setView('login');
    localStorage.removeItem('ggallery_token');
    localStorage.removeItem('ggallery_user');
    localStorage.removeItem('ggallery_view');
  };

  if (!splashDone) {
    return <SplashScreen onComplete={() => setSplashDone(true)} />;
  }

  if (view === 'landing') {
    return <><LandingPage onSignIn={() => setView('login')} /><AiAssistantButton onSignIn={() => setView('login')} /></>;
  }

  if (view === 'gallery' && user?.role === 'exhibitor' && token) {
    return <ExhibitorDashboard token={token} user={user} setUser={setUser} onLogout={handleLogout} />;
  }

  if (view === 'gallery' && user?.role === 'collector' && token) {
    return <><CollectorDashboard token={token} user={user} setUser={setUser} onLogout={handleLogout} /><AiAssistantButton token={token} /></>;
  }

  if (view === 'gallery' && user?.role === 'admin' && token) {
    return <AdminDashboard token={token} user={user} setUser={setUser} onLogout={handleLogout} />;
  }

  if (view === 'gallery' && user && token) {
    return <><GalleryPage user={user} token={token} onLogout={handleLogout} /><AiAssistantButton token={token} /></>;
  }

  return <AuthPage onAuth={handleAuth} />;
}
