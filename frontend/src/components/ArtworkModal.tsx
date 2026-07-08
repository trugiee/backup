import { useState } from 'react';
import type { Artwork, User, ArtworkMedia } from '../types';
import ChatDrawer from './ChatDrawer';
import ExhibitorProfileView from './ExhibitorProfileView';
import { useToast } from './Toast';

interface ArtworkModalProps {
  artwork: Artwork;
  onClose: () => void;
  token?: string;
  user?: User;
  onSignIn?: () => void;
}

function getMediaItems(artwork: Artwork): ArtworkMedia[] {
  if (artwork.media && artwork.media.length > 0) return artwork.media;
  if (artwork.imageUrl) return [{ type: 'image', url: artwork.imageUrl }];
  return [];
}

export default function ArtworkModal({ artwork, onClose, token, user, onSignIn }: ArtworkModalProps) {
  const mediaItems = getMediaItems(artwork);
  const [mediaIndex, setMediaIndex] = useState(0);
  const [showDetails, setShowDetails] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const { toast } = useToast();

  const attrs = artwork.attributes || {};

  const specs = [
    { label: 'Type', value: artwork.type?.replace('_', ' ')?.replace(/\b\w/g, (c: string) => c.toUpperCase()) },
    { label: 'Year', value: artwork.yearCreated },
    { label: 'Style', value: artwork.style },
    { label: 'Medium', value: attrs.medium },
    { label: 'Canvas', value: attrs.canvasType },
    { label: 'Material', value: attrs.material },
    { label: 'Weight', value: attrs.weight ? `${attrs.weight} kg` : null },
    { label: 'Size', value: attrs.height && attrs.width && attrs.depth ? `${attrs.height} × ${attrs.width} × ${attrs.depth} cm` : attrs.height && attrs.width ? `${attrs.height} × ${attrs.width} cm` : null },
  ].filter(sp => sp.value);

  const canChat = !!(token && user && user.role !== 'admin');

  if (showChat && canChat && artwork.exhibitor?.id) {
    return (
      <ChatDrawer
        token={token!}
        user={user!}
        exhibitorId={artwork.exhibitor!.id}
        exhibitorName={artwork.exhibitor!.name}
        exhibitorAvatar={(artwork.exhibitor as any)?.profilePicture}
        artworkId={artwork.id}
        artworkType={artwork.type}
        artworkImageUrl={mediaItems[0]?.url || artwork.imageUrl}
        artworkTitle={artwork.title}
        onClose={() => setShowChat(false)}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-[100] bg-white dark:bg-zinc-900 flex flex-col">

      <div className="shrink-0 flex items-center justify-between px-4 sm:px-5 py-3 sm:py-4 border-b border-zinc-100 dark:border-zinc-800">
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 sm:gap-2 text-zinc-400 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
        >
          <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M15 19l-7-7 7-7" />
          </svg>
          <span className="text-[10px] sm:text-xs font-medium tracking-wide">Back</span>
        </button>

        <div className="text-center absolute left-1/2 -translate-x-1/2 pointer-events-none">
          <p className="text-[10px] sm:text-xs font-semibold text-zinc-800 dark:text-zinc-200 truncate max-w-[120px] sm:max-w-[180px]">{artwork.title}</p>
          <p className="text-[8px] sm:text-[10px] text-zinc-400 dark:text-zinc-500 truncate max-w-[120px] sm:max-w-[180px]">
            {artwork.exhibitor?.name || 'Unknown'}
            {artwork.contributors && artwork.contributors.length > 0 && (
              <> with {artwork.contributors.map(c => c.exhibitor?.name).filter(Boolean).join(', ')}</>
            )}
          </p>
        </div>

        {(canChat || onSignIn) && user?.id !== artwork.exhibitor?.id && (
          <button
            onClick={() => {
              if (!user) { onSignIn?.(); return; }
              if (!artwork.exhibitor?.id) {
                toast('This artwork has no exhibitor linked yet.', 'info');
                return;
              }
              setShowChat(true);
            }}
            className="flex items-center gap-1.5 text-xs font-semibold bg-blue-600 text-white px-3 py-1.5 rounded-full hover:bg-blue-700 active:scale-95 transition-all shadow-sm"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            Talk to Exhibitor
          </button>
        )}
      </div>

      <div
        className="relative flex-1 min-h-0 bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center overflow-hidden cursor-pointer"
        onClick={() => showDetails && setShowDetails(false)}
      >
        {mediaItems.length > 0 ? (
          <div className="relative w-full h-full flex items-center justify-center">
            {mediaItems[mediaIndex].type === 'video' ? (
              <video
                src={mediaItems[mediaIndex].url}
                controls
                className="w-full h-full object-contain p-4"
              />
            ) : (
              <img
                src={mediaItems[mediaIndex].url}
                alt={artwork.title}
                className="w-full h-full object-contain p-4"
              />
            )}
            {mediaItems.length > 1 && (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); setMediaIndex(i => (i - 1 + mediaItems.length) % mediaItems.length); }}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white dark:bg-zinc-900 dark:bg-zinc-900/80 hover:bg-white shadow flex items-center justify-center text-zinc-700 dark:text-zinc-300 transition-all z-10"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setMediaIndex(i => (i + 1) % mediaItems.length); }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white dark:bg-zinc-900 dark:bg-zinc-900/80 hover:bg-white shadow flex items-center justify-center text-zinc-700 dark:text-zinc-300 transition-all z-10"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
                  {mediaItems.map((_, i) => (
                    <button
                      key={i}
                      onClick={(e) => { e.stopPropagation(); setMediaIndex(i); }}
                      className={`w-1.5 h-1.5 rounded-full transition-all ${i === mediaIndex ? 'bg-zinc-900 w-3' : 'bg-zinc-400'}`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 text-zinc-300 dark:text-zinc-400">
            <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1"
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-xs">No media</span>
          </div>
        )}
      </div>

      <div className="shrink-0 border-t border-zinc-100 dark:border-zinc-800">

        <div
          className="overflow-hidden transition-all duration-400 ease-in-out"
          style={{ maxHeight: showDetails ? '50vh' : '0px' }}
        >
          <div className="px-6 pt-5 pb-4 overflow-y-auto" style={{ maxHeight: '50vh' }}>
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{artwork.title}</h2>
                <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5">
                  by {artwork.exhibitor?.name || 'Unknown Artist'}
                  {artwork.contributors && artwork.contributors.length > 0 && (
                    <> with {artwork.contributors.map(c => c.exhibitor?.name).filter(Boolean).join(', ')}</>
                  )}
                </p>
              </div>
              <div className="flex flex-col items-end gap-2 shrink-0">
                {artwork.price != null && (
                  <span className="text-sm font-black text-zinc-900 dark:text-zinc-100">
                    ₱{artwork.price.toLocaleString()}
                  </span>
                )}
              </div>
            </div>

            {artwork.description && (
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed mb-4 border-l-2 border-zinc-200 dark:border-zinc-700 pl-3">
                {artwork.description}
              </p>
            )}

            {specs.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {specs.map(({ label, value }) => (
                  <div key={label} className="border border-zinc-100 dark:border-zinc-800 rounded-xl px-3 py-2.5 bg-zinc-50 dark:bg-zinc-950">
                    <p className="text-[9px] uppercase tracking-widest text-zinc-400 dark:text-zinc-500 font-medium mb-1">{label}</p>
                    <p className="text-[11px] text-zinc-800 dark:text-zinc-200 font-semibold leading-tight">{String(value)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between px-4 sm:px-5 py-2.5 sm:py-3.5 gap-2 sm:gap-3">
          {artwork.price != null && !showDetails ? (
            <span className="text-xs sm:text-sm font-black text-zinc-900 dark:text-zinc-100">₱{artwork.price.toLocaleString()}</span>
          ) : (
            <span />
          )}

          <div className="flex items-center gap-1.5 sm:gap-2 ml-auto">
            {showDetails && artwork.exhibitor && (
              <button
                onClick={() => setShowProfile(true)}
                className="flex items-center gap-1.5 text-[10px] sm:text-xs font-semibold border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-full hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
              >
                <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span className="text-[10px] sm:text-xs">View Exhibitor Profile</span>
              </button>
            )}
            <button
              onClick={() => setShowDetails((v) => !v)}
              className="flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs font-semibold bg-black text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-full hover:bg-zinc-800 transition-colors"
            >
              {showDetails ? (
                <>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 15l-7-7-7 7" />
                  </svg>
                  Hide
                </>
              ) : (
                <>
                  Details
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 9l7 7 7-7" />
                  </svg>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {showProfile && artwork.exhibitor && (
        <ExhibitorProfileView
          exhibitorId={artwork.exhibitor.id}
          canChat={canChat && !!artwork.exhibitor.id && user?.id !== artwork.exhibitor.id}
          onMessage={() => setShowChat(true)}
          onClose={() => setShowProfile(false)}
        />
      )}
    </div>
  );
}
