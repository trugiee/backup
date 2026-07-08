import { useState, useRef, useEffect } from 'react';
import { chatWithCurator } from '../api';

interface Message {
  role: 'user' | 'assistant';
  text: string;
}

interface AIChatPanelProps {
  token?: string;
  onClose: () => void;
}

export default function AIChatPanel({ token, onClose }: AIChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', text: 'Hello! I\'m Mugna, your gallery curator. Ask me anything about the artworks and artists on display.' },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [position, setPosition] = useState({ right: 24, bottom: 100 });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ startX: number; startY: number; startLeft: number; startTop: number; el: HTMLElement | null }>({ startX: 0, startY: 0, startLeft: 0, startTop: 0, el: null });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text }]);
    setLoading(true);
    try {
      const history = messages.map(m => ({ role: m.role, text: m.text }));
      const res = await chatWithCurator(token || '', text, history);
      setMessages(prev => [...prev, { role: 'assistant', text: res.reply }]);
    } catch (err: any) {
      setMessages(prev => [...prev, { role: 'assistant', text: 'Sorry, I couldn\'t reach the gallery archives. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const onDragStart = (clientX: number, clientY: number) => {
    const el = panelRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    dragRef.current = { startX: clientX, startY: clientY, startLeft: rect.left, startTop: rect.top, el };
    el.style.transition = 'none';
  };

  const onDragMove = (clientX: number, clientY: number) => {
    const d = dragRef.current;
    if (!d.el) return;
    d.el.style.left = (d.startLeft + clientX - d.startX) + 'px';
    d.el.style.top = (d.startTop + clientY - d.startY) + 'px';
    d.el.style.right = 'auto';
    d.el.style.bottom = 'auto';
  };

  const onDragEnd = () => {
    const d = dragRef.current;
    if (!d.el) return;
    d.el.style.transition = '';
    const r = window.innerWidth - parseInt(d.el.style.left) - d.el.offsetWidth;
    const b = window.innerHeight - parseInt(d.el.style.top) - d.el.offsetHeight;
    setPosition({ right: Math.max(0, r), bottom: Math.max(0, b) });
  };

  return (
    <div
      ref={panelRef}
      className="fixed z-[70] w-[360px] max-w-[calc(100vw-32px)] h-[520px] max-h-[calc(100vh-120px)] rounded-2xl bg-white dark:bg-zinc-900 shadow-2xl shadow-zinc-900/20 border border-zinc-200 dark:border-zinc-700 flex flex-col overflow-hidden select-none"
      style={{ right: position.right ?? 24, bottom: position.bottom ?? 100 }}
      onMouseDown={(e) => {
        if ((e.target as HTMLElement).closest('.drag-handle')) {
          onDragStart(e.clientX, e.clientY);
          const onMove = (ev: MouseEvent) => onDragMove(ev.clientX, ev.clientY);
          const onUp = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); onDragEnd(); };
          document.addEventListener('mousemove', onMove);
          document.addEventListener('mouseup', onUp);
        }
      }}
      onTouchStart={(e) => {
        if ((e.target as HTMLElement).closest('.drag-handle') && e.touches[0]) {
          onDragStart(e.touches[0].clientX, e.touches[0].clientY);
          const onMove = (ev: TouchEvent) => { if (ev.touches[0]) onDragMove(ev.touches[0].clientX, ev.touches[0].clientY); };
          const onUp = () => { document.removeEventListener('touchmove', onMove); document.removeEventListener('touchend', onUp); onDragEnd(); };
          document.addEventListener('touchmove', onMove, { passive: true });
          document.addEventListener('touchend', onUp);
        }
      }}
    >
      <div className="drag-handle flex items-center justify-between px-4 py-3 border-b border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 cursor-grab">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-zinc-900 dark:bg-white flex items-center justify-center">
            <img src="/logo-white.png" alt="" className="w-4 h-4 object-contain dark:hidden" />
            <img src="/logo-icon.png" alt="" className="w-4 h-4 object-contain hidden dark:block" />
          </div>
          <div>
            <span className="text-sm font-bold text-zinc-900 dark:text-white">Mugna</span>
            <span className="text-[10px] text-zinc-500 dark:text-zinc-400 block leading-tight">Gallery Curator</span>
          </div>
        </div>
        <button onClick={onClose} className="w-7 h-7 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-700 flex items-center justify-center text-zinc-500 dark:text-zinc-400 transition-colors">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-white dark:bg-zinc-900">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
              msg.role === 'user'
                ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-br-md'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 rounded-bl-md'
            }`}>
              {msg.text}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-zinc-100 dark:bg-zinc-800 rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex gap-1.5">
                <div className="w-2 h-2 rounded-full bg-zinc-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 rounded-full bg-zinc-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 rounded-full bg-zinc-400 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t border-zinc-200 dark:border-zinc-700 p-3 bg-white dark:bg-zinc-900">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about the gallery..."
            disabled={loading}
            className="flex-1 px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-900/20 dark:focus:ring-white/20 disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className="px-3.5 py-2 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-sm font-semibold hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>
          </button>
        </div>
      </div>
    </div>
  );
}
