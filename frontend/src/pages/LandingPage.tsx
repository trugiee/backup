import { useState, useEffect } from 'react';
import type { Artwork } from '../types';
import { fetchPublicArtworks } from '../api';
import ArtworkGallery from '../components/ArtworkGallery';

export default function LandingPage({ onSignIn }: { onSignIn: () => void }) {
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [loading, setLoading] = useState(true);
  const [installPrompt, setInstallPrompt] = useState<Event | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    fetchPublicArtworks()
      .then((data) => setArtworks(Array.isArray(data.artworks) ? data.artworks : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;
    (installPrompt as any).prompt();
    const result = await (installPrompt as any).userChoice;
    if (result.outcome === 'accepted') {
      setInstallPrompt(null);
      setIsInstalled(true);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 font-sans">
      <div className="relative overflow-hidden bg-zinc-950 text-white">
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              'radial-gradient(ellipse at 70% 50%, #3f3f46 0%, transparent 70%), radial-gradient(ellipse at 20% 80%, #27272a 0%, transparent 60%)',
          }}
        />
        <img
          src="/logo-white.png"
          alt=""
          aria-hidden="true"
          className="absolute right-0 top-1/2 -translate-y-1/2 w-72 sm:w-96 md:w-[28rem] lg:w-[36rem] opacity-[0.04] pointer-events-none select-none object-contain"
        />
        <div className="relative px-4 sm:px-10 py-16 sm:py-32">
          <p className="text-zinc-400 text-[10px] sm:text-sm font-semibold tracking-widest uppercase mb-2 sm:mb-4">
            MUGNA GALLERY
          </p>
          <h1 className="text-3xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-none mb-4 sm:mb-6">
            Discover{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-zinc-300 to-zinc-500">
              Exquisite
            </span>
            <br />
            Works of Art
          </h1>
          <p className="text-zinc-400 text-sm sm:text-lg max-w-xl leading-relaxed mb-6 sm:mb-10">
            Browse our curated collection of original artworks from talented exhibitors.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={onSignIn}
              className="bg-white text-zinc-900 font-bold px-5 sm:px-7 py-2.5 sm:py-3.5 rounded-lg sm:rounded-xl hover:bg-zinc-100 transition-all duration-200 hover:-translate-y-0.5 shadow-lg text-sm sm:text-base"
            >
              Sign In
            </button>
            {!isInstalled && installPrompt && (
              <button
                onClick={handleInstall}
                className="border border-zinc-600 text-zinc-300 font-bold px-5 sm:px-7 py-2.5 sm:py-3.5 rounded-lg sm:rounded-xl hover:bg-zinc-800 hover:text-white transition-all duration-200 hover:-translate-y-0.5 text-sm sm:text-base"
              >
                Install App
              </button>
            )}
            <a
              href="/ggallery.apk"
              download="ggallery.apk"
              className="border border-zinc-600 text-zinc-300 font-bold px-5 sm:px-7 py-2.5 sm:py-3.5 rounded-lg sm:rounded-xl hover:bg-zinc-800 hover:text-white transition-all duration-200 hover:-translate-y-0.5 text-sm sm:text-base inline-block"
            >
              Download App
            </a>
          </div>
        </div>
      </div>

      <ArtworkGallery artworks={artworks} loading={loading} onSignIn={onSignIn} />

      <footer className="border-t border-zinc-200 bg-white mt-12 sm:mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-10 py-6 sm:py-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <img src="/logo.png" alt="Ggallery" className="h-7 w-auto object-contain opacity-60" />
          <p className="text-zinc-400 text-xs">
            &copy; {new Date().getFullYear()} Ggallery. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
