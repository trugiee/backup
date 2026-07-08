export default function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-32 text-zinc-500 dark:text-zinc-400">
      <div className="w-16 h-16 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-4">
        <svg className="w-8 h-8 text-zinc-300 dark:text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
      <p className="text-xl font-semibold mb-1 text-zinc-800 dark:text-zinc-200">No {label} yet</p>
      <p className="text-sm">Add {label} to the database to see them here.</p>
    </div>
  );
}
