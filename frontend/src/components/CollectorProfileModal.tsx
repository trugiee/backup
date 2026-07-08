interface Collector {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  profilePicture?: string | null;
  bio?: string | null;
  createdAt?: string;
}

interface CollectorProfileModalProps {
  collector: Collector;
  onClose: () => void;
}

export default function CollectorProfileModal({ collector, onClose }: CollectorProfileModalProps) {
  return (
    <div className="fixed inset-0 z-[300] bg-white dark:bg-zinc-900 flex flex-col">
      <div className="shrink-0 flex items-center gap-3 px-4 py-3 border-b border-zinc-100 dark:border-zinc-800">
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
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 sm:gap-8">
            <div className="shrink-0">
              <div className="w-20 sm:w-24 h-20 sm:h-24 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-zinc-500 dark:text-zinc-400 text-2xl sm:text-3xl font-bold overflow-hidden">
                {collector.profilePicture ? (
                  <img src={collector.profilePicture} alt={collector.name} className="w-full h-full object-cover" />
                ) : (
                  <img src="/spiral.webp" alt="" className="w-full h-full object-cover" />
                )}
              </div>
            </div>

            <div className="flex-1 min-w-0 text-center sm:text-left">
              <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-100">{collector.name || 'Collector'}</h1>
              <div className="flex items-center justify-center sm:justify-start gap-2 mt-0.5 flex-wrap">
                {collector.email && <p className="text-sm text-zinc-500 dark:text-zinc-400">{collector.email}</p>}
                <span className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full uppercase tracking-wider">Collector</span>
              </div>

              <p className="text-sm text-zinc-600 dark:text-zinc-400 max-w-md leading-relaxed mt-4">
                {collector.bio || <span className="text-zinc-400 dark:text-zinc-500 italic">No bio yet.</span>}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
