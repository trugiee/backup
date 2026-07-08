import { useState, useEffect } from 'react';
import { fetchExhibitorProfile } from '../api';
import type { ArtworkMedia } from '../types';
import ArtworkCard from './ArtworkCard';
import ArtworkModal from './ArtworkModal';

interface Exhibitor {
  name: string;
  email?: string | null;
  bio?: string | null;
  profilePicture?: string | null;
  role?: string;
}

interface Achievement {
  id: string;
  title: string;
  description?: string | null;
  year?: number | null;
  isVerified?: boolean;
  proofImageUrl?: string | null;
  proofLink?: string | null;
}

interface Artwork {
  id: string;
  title: string;
  type: string;
  createdAt: string;
  status: string;
  imageUrl?: string;
  media?: ArtworkMedia[];
  exhibitor?: { id: string; name: string } | null;
  contributors?: { exhibitorId: string }[];
  price?: number;
  description?: string;
  yearCreated?: number;
  style?: string;
  attributes?: Record<string, any>;
}

interface ExhibitorProfileViewProps {
  exhibitorId?: string;
  initialData?: {
    exhibitor: Exhibitor;
    artworks: Artwork[];
    achievements: Achievement[];
  };

  onClose?: () => void;
  canChat?: boolean;
  onMessage?: () => void;

  isOwner?: boolean;
  onUpdateProfilePic?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isUploadingPic?: boolean;
  onViewProfilePic?: () => void;

  isEditingBio?: boolean;
  bioInput?: string;
  onBioInputChange?: (val: string) => void;
  onStartEditBio?: () => void;
  onSaveBio?: () => Promise<void>;
  onCancelBio?: () => void;
  savingBio?: boolean;

  onAddAchievement?: () => void;
  onDeleteAchievement?: (id: string) => void;
}

export default function ExhibitorProfileView({
  exhibitorId,
  initialData,
  onClose,
  canChat = false,
  onMessage,
  isOwner = false,
  onUpdateProfilePic,
  isUploadingPic,
  onViewProfilePic,
  isEditingBio,
  bioInput,
  onBioInputChange,
  onStartEditBio,
  onSaveBio,
  onCancelBio,
  savingBio,
  onAddAchievement,
  onDeleteAchievement,
}: ExhibitorProfileViewProps) {
  const [fetched, setFetched] = useState<typeof initialData | null>(initialData || null);
  const [loading, setLoading] = useState(!initialData && !!exhibitorId);
  const [selectedArtwork, setSelectedArtwork] = useState<any>(null);

  useEffect(() => {
    if (!exhibitorId || initialData) return;
    setLoading(true);
    fetchExhibitorProfile(exhibitorId)
      .then(setFetched)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [exhibitorId]);

  useEffect(() => {
    if (initialData) setFetched(initialData);
  }, [initialData]);

  const data = fetched;
  const totalAvailable = data
    ? data.artworks.filter((a) => a.status === 'Available').length
    : 0;

  const isOverlay = !!onClose;

  const content = (
    <>
      {isOverlay && (
        <div className="shrink-0 flex items-center gap-3 px-5 py-4 bg-white dark:bg-zinc-900 border-b border-zinc-100 dark:border-zinc-800">
          <button
            onClick={onClose}
            className="flex items-center gap-2 text-zinc-400 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M15 19l-7-7 7-7" />
            </svg>
            <span className="text-xs font-medium">Back</span>
          </button>
          <div className="flex-1" />
          {canChat && onMessage && (
            <button
              onClick={() => { onClose?.(); onMessage(); }}
              className="flex items-center gap-1.5 text-xs font-semibold bg-blue-600 text-white px-4 py-2 rounded-full hover:bg-blue-700 active:scale-95 transition-all"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              Send Message
            </button>
          )}
        </div>
      )}

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-zinc-200 dark:border-zinc-700 border-t-zinc-600 rounded-full animate-spin" />
        </div>
      ) : !data ? (
        <div className="flex-1 flex items-center justify-center text-zinc-400 dark:text-zinc-500 text-sm">
          Profile not found.
        </div>
      ) : (
        <div className={isOverlay ? 'flex-1 overflow-y-auto' : ''}>
          <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-10">

            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 sm:gap-8 mb-6 sm:mb-8">
              <div className="relative shrink-0">
                <div
                  className={`w-20 sm:w-24 h-20 sm:h-24 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-zinc-500 dark:text-zinc-400 text-2xl sm:text-3xl font-bold overflow-hidden ${isOwner && data.exhibitor.profilePicture ? 'cursor-pointer hover:opacity-90 transition-opacity' : ''}`}
                  onClick={() => isOwner && onViewProfilePic?.()}
                >
                  {data.exhibitor.profilePicture ? (
                    <img src={data.exhibitor.profilePicture} alt={data.exhibitor.name} className="w-full h-full object-cover" />
                  ) : (
                    <img src="/spiral.webp" alt="" className="w-full h-full object-cover" />
                  )}
                </div>
                {isOwner && onUpdateProfilePic && (
                  <label className="absolute -bottom-1 -right-1 w-7 h-7 bg-zinc-900 rounded-full border-2 border-white flex items-center justify-center cursor-pointer hover:bg-zinc-700 transition-colors shadow-sm">
                    <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <input type="file" accept="image/*" className="hidden" onChange={onUpdateProfilePic} disabled={isUploadingPic} />
                  </label>
                )}
                {isOwner && isUploadingPic && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-full z-10">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0 text-center sm:text-left">
                <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-100">{data.exhibitor.name || 'Exhibitor'}</h1>
                <div className="flex items-center justify-center sm:justify-start gap-2 mt-0.5 flex-wrap">
                  {data.exhibitor.email && <p className="text-sm text-zinc-500 dark:text-zinc-400">{data.exhibitor.email}</p>}
                  <span className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full uppercase tracking-wider">{data.exhibitor.role || 'Exhibitor'}</span>
                </div>

                <div className="flex items-center justify-center sm:justify-start gap-6 sm:gap-8 my-4 sm:my-5">
                  <div className="text-center">
                    <p className="text-lg font-bold text-zinc-900 dark:text-zinc-100">{data.artworks.length}</p>
                    <p className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Artworks</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-zinc-900 dark:text-zinc-100">{totalAvailable}</p>
                    <p className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Available</p>
                  </div>
                </div>

                {isOwner && isEditingBio ? (
                  <div className="max-w-md">
                    <textarea
                      value={bioInput}
                      onChange={(e) => onBioInputChange?.(e.target.value)}
                      placeholder="Share your artistic journey, inspirations, and background..."
                      className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 rounded-xl p-3 text-sm text-zinc-800 dark:text-zinc-100 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-500 resize-none min-h-[80px]"
                    />
                    <div className="flex items-center gap-3 justify-end mt-2">
                      <button onClick={onCancelBio} className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 px-3 py-1.5" disabled={savingBio}>Cancel</button>
                      <button onClick={onSaveBio} className="text-xs font-bold bg-zinc-900 text-white px-4 py-1.5 rounded-lg hover:bg-zinc-800 disabled:opacity-50" disabled={savingBio}>
                        {savingBio ? 'Saving...' : 'Save'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 max-w-md leading-relaxed">
                    {data.exhibitor.bio || <span className="text-zinc-400 dark:text-zinc-500 italic">No bio yet.{isOwner ? ' Tell us about your creative journey!' : ''}</span>}
                    {isOwner && !isEditingBio && (
                      <button onClick={onStartEditBio} className="ml-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400 hover:text-zinc-900">Edit</button>
                    )}
                  </p>
                )}

                {canChat && onMessage && (
                  <button onClick={() => { onClose?.(); onMessage(); }} className="mt-4 text-xs font-semibold bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                    Send Message
                  </button>
                )}
              </div>
            </div>

            <div className="mb-6 sm:mb-8">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Achievements &amp; Awards</h3>
                {isOwner && onAddAchievement && (
                  <button onClick={onAddAchievement} className="text-[10px] bg-zinc-900 text-white px-2.5 py-1 rounded-full font-semibold hover:bg-zinc-800 transition-colors">
                    + Add
                  </button>
                )}
              </div>
              {data.achievements.length === 0 ? (
                <div className="text-center py-8 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-100 dark:border-zinc-800">
                  <p className="text-zinc-500 dark:text-zinc-400 text-sm font-medium">No achievements added yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {data.achievements.map((a) => (
                    <div key={a.id} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl p-4 flex items-start gap-4">
                      {a.proofImageUrl && (
                        <div className="w-14 h-14 rounded-lg bg-zinc-100 dark:bg-zinc-800 shrink-0 overflow-hidden border border-zinc-200 dark:border-zinc-700">
                          <img src={a.proofImageUrl} alt="Proof" className="w-full h-full object-cover" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">{a.title}</h4>
                          {a.year && <span className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-md">{a.year}</span>}
                          {a.isVerified
                            ? <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">Verified</span>
                            : <span className="text-[9px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">Pending</span>
                          }
                        </div>
                        {a.description && <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">{a.description}</p>}
                        {a.proofLink && (
                          <a href={a.proofLink} target="_blank" rel="noreferrer" className="text-[11px] text-blue-600 hover:underline font-medium inline-block mt-1">View Link →</a>
                        )}
                      </div>
                      {isOwner && onDeleteAchievement && (
                        <button onClick={() => onDeleteAchievement(a.id)} className="text-xs text-red-500 hover:text-red-700 font-semibold shrink-0">Delete</button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mb-6 sm:mb-8">
              <h3 className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-3">Available Artworks</h3>
              {data.artworks.filter(a => a.status === 'Available').length === 0 ? (
                <div className="text-center py-8 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-100 dark:border-zinc-800">
                  <p className="text-zinc-500 dark:text-zinc-400 text-sm font-medium">No available artworks.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
                  {data.artworks.filter(a => a.status === 'Available').map(artwork => (
                    <ArtworkCard key={artwork.id} artwork={artwork} onClick={() => setSelectedArtwork(artwork)} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {selectedArtwork && (
        <ArtworkModal artwork={selectedArtwork} onClose={() => setSelectedArtwork(null)} />
      )}
    </>
  );

  if (isOverlay) {
    return (
      <div className="fixed inset-0 z-[200] bg-zinc-50 dark:bg-zinc-950 flex flex-col">
        {content}
      </div>
    );
  }

  return content;
}
