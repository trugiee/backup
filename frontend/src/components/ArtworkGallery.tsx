import { useState } from 'react';
import type { Artwork, User } from '../types';
import ArtworkCard from './ArtworkCard';
import ArtworkModal from './ArtworkModal';
import FilterBar from './FilterBar';

interface ArtworkGalleryProps {
  artworks: Artwork[];
  loading: boolean;
  token?: string;
  user?: User;
  onSignIn?: () => void;
}

export default function ArtworkGallery({ artworks, loading, token, user, onSignIn }: ArtworkGalleryProps) {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [selected, setSelected] = useState<Artwork | null>(null);

  const types = [...new Set(artworks.map(a => a.type))];
  const filterItems = [
    { value: 'all', label: 'All', count: artworks.length },
    ...types.map(t => ({ value: t, label: t.replace('_', ' '), count: artworks.filter(a => a.type === t).length }))
  ];

  const displayed = artworks
    .filter(a => filterType === 'all' || a.type === filterType)
    .filter(a => !search || a.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <>
      <div className="sticky top-0 z-30 bg-white backdrop-blur-md border-b border-zinc-100">
        <div className="px-4 sm:px-10 py-3 sm:py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
          <div className="w-full overflow-x-auto whitespace-nowrap scrollbar-none">
            <FilterBar items={filterItems} selected={filterType} onChange={setFilterType} />
          </div>
          <input
            type="text"
            placeholder="Search artworks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:w-64 bg-zinc-50 border border-zinc-200 rounded-lg sm:rounded-xl px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm text-zinc-800 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/20 focus:border-zinc-400 transition-all"
          />
        </div>
      </div>

      <main className="max-w-full mx-auto px-4 sm:px-10 py-8 sm:py-12">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-40 text-zinc-400">
            <div className="w-10 h-10 border-2 border-zinc-300 border-t-zinc-800 rounded-full animate-spin mb-4" />
            <p className="text-sm">Loading artworks...</p>
          </div>
        ) : displayed.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-40 text-zinc-400">
            <div className="w-16 h-16 rounded-full bg-zinc-100 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-zinc-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            </div>
            <p className="text-lg font-semibold text-zinc-700">No artworks found</p>
            <p className="text-sm mt-1">Try a different filter or search term.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 sm:gap-6">
            {displayed.map(artwork => (
              <ArtworkCard
                key={artwork.id}
                artwork={artwork}
                onClick={() => setSelected(artwork)}
              />
            ))}
          </div>
        )}
      </main>

      {selected && (
        <ArtworkModal
          artwork={selected}
          onClose={() => setSelected(null)}
          token={token}
          user={user}
          onSignIn={onSignIn}
        />
      )}
    </>
  );
}
