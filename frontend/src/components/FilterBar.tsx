interface FilterItem {
  value: string;
  label: string;
  count: number;
}

interface FilterBarProps {
  items: FilterItem[];
  selected: string;
  onChange: (value: string) => void;
  className?: string;
}

export default function FilterBar({ items, selected, onChange, className = '' }: FilterBarProps) {
  return (
    <div className={`flex items-center gap-4 text-[9px] ${className}`}>
      {items.map((item, i) => (
        <span key={item.value} className="flex items-center gap-4">
          {i > 0 && <span className="text-zinc-200 dark:text-zinc-700 dark:text-zinc-300">|</span>}
          <button
            onClick={() => onChange(item.value)}
            className={`uppercase tracking-wider transition-colors pb-0.5 border-b-2 ${ selected === item.value ? 'text-zinc-900 dark:text-zinc-100 font-semibold border-zinc-900' : 'text-zinc-400 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 border-transparent' }`}
          >
            {item.label}
          </button>
        </span>
      ))}
    </div>
  );
}
