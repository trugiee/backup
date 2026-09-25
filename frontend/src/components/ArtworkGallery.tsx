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
  hasMore?: boolean;
  loadingMore?: boolean;
  onLoadMore?: () => void;
  dashboard?: boolean;
}

function SkeletonCard() {
  return (
    <div
      className="rounded-lg overflow-hidden border border-zinc-100 dark:border-zinc-800 flex flex-col"
      style={{ aspectRatio: '5/7' }}
    >
      <div className="flex-1 bg-zinc-100 dark:bg-zinc-800 animate-pulse" style={{ flex: '9' }} />
      <div className="px-2.5 py-3 space-y-1.5" style={{ flex: '1' }}>
        <div className="h-2.5 w-3/4 rounded bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
        <div className="h-2 w-1/2 rounded bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
      </div>
    </div>
  );
}

export default function ArtworkGallery({ artworks, loading, token, user, onSignIn, hasMore, loadingMore, onLoadMore, dashboard = false }: ArtworkGalleryProps) {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [selected, setSelected] = useState<Artwork | null>(null);
  const contentPadding = dashboard ? 'px-1' : 'px-4';

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
        <div className={`${contentPadding} py-3 sm:py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 w-full`}>
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

      <main className={`w-full ${contentPadding} py-8 sm:py-12`}>
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 sm:gap-6" aria-hidden="true">
            {Array.from({ length: 10 }).map((_, i) => <SkeletonCard key={i} />)}
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

        {!loading && hasMore && (
          <div className="flex justify-center mt-10">
            <button
              onClick={onLoadMore}
              disabled={loadingMore}
              className="flex items-center gap-2 text-sm font-semibold bg-zinc-900 text-white px-6 py-2.5 rounded-xl hover:bg-zinc-800 active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loadingMore && (
                <div className="w-4 h-4 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin" />
              )}
              {loadingMore ? 'Loading...' : 'Load More'}
            </button>
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