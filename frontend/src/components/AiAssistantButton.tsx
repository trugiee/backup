import { useState, useRef } from 'react';
import AIChatPanel from './AIChatPanel';

interface AiAssistantButtonProps {
  token?: string;
  onSignIn?: () => void;
}

export default function AiAssistantButton({ token, onSignIn }: AiAssistantButtonProps) {
  const [open, setOpen] = useState(false);
  const [aiPos, setAiPos] = useState({ right: 24, bottom: 80 });
  const aiDragRef = useRef<{ startX: number; startY: number; startLeft: number; startTop: number; el: HTMLElement | null }>({ startX: 0, startY: 0, startLeft: 0, startTop: 0, el: null });
  const aiBtnRef = useRef<HTMLButtonElement>(null);
  const didDrag = useRef(false);

  const dragHandlers = {
    onMouseDown: (e: React.MouseEvent) => {
      const el = aiBtnRef.current;
      if (!el) return;
      didDrag.current = false;
      const rect = el.getBoundingClientRect();
      aiDragRef.current = { startX: e.clientX, startY: e.clientY, startLeft: rect.left, startTop: rect.top, el };
      el.style.transition = 'none';
      el.style.cursor = 'grabbing';
      const onMove = (ev: MouseEvent) => {
        const dx = ev.clientX - aiDragRef.current.startX;
        const dy = ev.clientY - aiDragRef.current.startY;
        if (Math.abs(dx) > 5 || Math.abs(dy) > 5) didDrag.current = true;
        el.style.left = (aiDragRef.current.startLeft + dx) + 'px';
        el.style.top = (aiDragRef.current.startTop + dy) + 'px';
        el.style.right = 'auto';
        el.style.bottom = 'auto';
      };
      const onUp = () => {
        el.style.transition = '';
        el.style.cursor = '';
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        const r = window.innerWidth - parseInt(el.style.left) - el.offsetWidth;
        const b = window.innerHeight - parseInt(el.style.top) - el.offsetHeight;
        setAiPos({ right: Math.max(0, r), bottom: Math.max(0, b) });
      };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    },
    onTouchStart: (e: React.TouchEvent) => {
      const el = aiBtnRef.current;
      if (!el || !e.touches[0]) return;
      didDrag.current = false;
      const rect = el.getBoundingClientRect();
      const t = e.touches[0];
      aiDragRef.current = { startX: t.clientX, startY: t.clientY, startLeft: rect.left, startTop: rect.top, el };
      el.style.transition = 'none';
      const onMove = (ev: TouchEvent) => {
        if (!ev.touches[0]) return;
        const dx = ev.touches[0].clientX - aiDragRef.current.startX;
        const dy = ev.touches[0].clientY - aiDragRef.current.startY;
        if (Math.abs(dx) > 5 || Math.abs(dy) > 5) didDrag.current = true;
        el.style.left = (aiDragRef.current.startLeft + dx) + 'px';
        el.style.top = (aiDragRef.current.startTop + dy) + 'px';
        el.style.right = 'auto';
        el.style.bottom = 'auto';
      };
      const onUp = () => {
        el.style.transition = '';
        document.removeEventListener('touchmove', onMove);
        document.removeEventListener('touchend', onUp);
        const r = window.innerWidth - parseInt(el.style.left) - el.offsetWidth;
        const b = window.innerHeight - parseInt(el.style.top) - el.offsetHeight;
        setAiPos({ right: Math.max(0, r), bottom: Math.max(0, b) });
      };
      document.addEventListener('touchmove', onMove, { passive: true });
      document.addEventListener('touchend', onUp);
    },
  };

  return (
    <>
      <button
        ref={aiBtnRef}
        onMouseDown={(e) => {
          if (open) return;
          dragHandlers.onMouseDown(e);
        }}
        onTouchStart={(e) => {
          if (open) return;
          dragHandlers.onTouchStart(e);
        }}
        onClick={() => { if (!didDrag.current) setOpen(true); }}
        className="group fixed z-[60] w-14 h-14 sm:w-12 sm:h-12 rounded-full bg-zinc-900 dark:bg-white shadow-lg shadow-zinc-900/20 hover:shadow-xl hover:shadow-zinc-900/30 hover:scale-110 active:scale-95 transition-all duration-200 flex items-center justify-center select-none cursor-pointer"
        style={{ right: aiPos.right ?? 24, bottom: aiPos.bottom ?? 80 }}
        title="AI Assistant"
      >
        <div className="absolute inset-0 rounded-full bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity dark:bg-zinc-900/10" />
        <img src="/logo-white.png" alt="" className="w-10 h-10 sm:w-8 sm:h-8 object-contain dark:hidden" />
        <img src="/logo-icon.png" alt="" className="w-10 h-10 sm:w-8 sm:h-8 object-contain hidden dark:block" />
        <span className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-[10px] font-bold px-2.5 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity shadow-lg pointer-events-none">
          AI Assistant
        </span>
      </button>

      {open && <AIChatPanel token={token} onClose={() => setOpen(false)} />}
    </>
  );
}
