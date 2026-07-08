import type { Artwork, ArtworkMedia } from '../types';

function getThumbnail(artwork: Artwork): ArtworkMedia | null {
  if (artwork.media && artwork.media.length > 0) return artwork.media[0];
  if (artwork.imageUrl) return { type: 'image', url: artwork.imageUrl };
  return null;
}

export default function ArtworkCard({ artwork, onClick }: { artwork: Artwork; onClick: () => void }) {
  const thumb = getThumbnail(artwork);

  return (
    <div
      onClick={onClick}
      className="group cursor-pointer bg-white dark:bg-zinc-900 rounded-lg overflow-hidden border border-zinc-100 dark:border-zinc-800 hover:border-zinc-200 dark:hover:border-zinc-700 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 flex flex-col"
      style={{ aspectRatio: '5/7' }}
    >
      <div className="relative overflow-hidden bg-zinc-50 dark:bg-zinc-950 min-h-0" style={{ flex: '9' }}>
        {thumb ? (
          thumb.type === 'video' ? (
            <div className="relative w-full h-full">
              <img
                src={thumb.url}
                alt={artwork.title}
                className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500 ease-out"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                <div className="w-10 h-10 rounded-full bg-white dark:bg-zinc-900 dark:bg-zinc-900/90 flex items-center justify-center shadow-lg">
                  <svg className="w-5 h-5 text-zinc-900 dark:text-zinc-100 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
              </div>
            </div>
          ) : (
            <img
              src={thumb.url}
              alt={artwork.title}
              className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500 ease-out"
            />
          )
        ) : (
          <div className="w-full h-full flex items-center justify-center text-zinc-300 dark:text-zinc-400">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}
      </div>

      <div className="px-2.5 flex items-center min-h-0" style={{ flex: '1' }}>
        <div className="min-w-0 leading-none">
          <p className="text-[11px] font-semibold text-zinc-900 dark:text-zinc-100 truncate">{artwork.title}</p>
          <p className="text-[9px] text-zinc-400 dark:text-zinc-500 truncate mt-0.5">
            {artwork.exhibitor?.name || 'Unknown'}
            {artwork.contributors && artwork.contributors.length > 0 && (
              <span className="text-zinc-300 dark:text-zinc-400"> +{artwork.contributors.length}</span>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
