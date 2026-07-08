import { useState, useEffect } from 'react';
import type { Artwork, User } from '../types';
import { fetchArtworks } from '../api';
import ArtworkCard from '../components/ArtworkCard';
import ArtworkModal from '../components/ArtworkModal';
import EmptyState from '../components/EmptyState';
import FilterBar from '../components/FilterBar';

interface GalleryPageProps {
  user: User;
  token: string;
  onLogout: () => void;
}

export default function GalleryPage({ user, token, onLogout }: GalleryPageProps) {
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [selectedArtwork, setSelectedArtwork] = useState<Artwork | null>(null);

  const types = [...new Set(artworks.map(a => a.type))];
  const [filterType, setFilterType] = useState('all');

  const fetchAll = async () => {
    setDataLoading(true);
    try {
      const data = await fetchArtworks(token);
      setArtworks(Array.isArray(data) ? data : []);
    } catch {
      setArtworks([]);
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const displayed = artworks.filter(a => filterType === 'all' || a.type === filterType);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      <nav className="border-b border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-10 sm:h-12 flex items-center justify-center relative">
          <img
            src="/logo-icon.png"
            alt="Ggallery Logo"
            className="h-6 sm:h-8 w-auto object-contain"
          />
          <div className="absolute right-4 sm:right-6 flex items-center gap-2 sm:gap-3">
            <span className="text-[10px] sm:text-xs text-zinc-400 dark:text-zinc-500 max-w-[120px] sm:max-w-none truncate">{user?.email}</span>
            <button
              onClick={onLogout}
              className="text-xs px-2.5 py-1 rounded-md bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-zinc-600 dark:text-zinc-400 transition-all duration-200"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-full mx-auto px-4 sm:px-6 pt-8 sm:pt-12 pb-4 sm:pb-6">
        <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight mb-1 sm:mb-2">Gallery Collection</h1>
        <p className="text-zinc-500 dark:text-zinc-400 text-sm sm:text-lg">Browse all artworks.</p>
      </div>

      <div className="max-w-full mx-auto px-4 sm:px-6 mb-6 sm:mb-8">
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
        {dataLoading ? (
          <div className="flex items-center justify-center py-16 sm:py-32">
            <div className="w-10 h-10 border-4 border-black border-t-transparent rounded-full animate-spin" />
          </div>
        ) : displayed.length === 0 ? (
          <EmptyState label="artworks" />
        ) : (
           <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-6">
            {displayed.map(a => (
              <ArtworkCard key={a.id} artwork={a} onClick={() => setSelectedArtwork(a)} />
            ))}
          </div>
        )}
      </div>

      {selectedArtwork && (
        <ArtworkModal
          artwork={selectedArtwork}
          onClose={() => setSelectedArtwork(null)}
          token={token}
          user={user}
        />
      )}
    </div>
  );
}
