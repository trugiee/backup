import { useState, useRef, useEffect } from 'react';
import type { Message } from '../types';
import { useToast } from './Toast';

interface ChatThreadViewProps {
  messages: Message[];
  currentRole: 'collector' | 'exhibitor';
  onSendMessage: (content: string) => Promise<void>;
  loading?: boolean;
  placeholder?: string;
  emptyStateHeader?: string;
  emptyStateSubtext?: React.ReactNode;
}

export default function ChatThreadView({
  messages,
  currentRole,
  onSendMessage,
  loading = false,
  placeholder = 'Type a message...',
  emptyStateHeader = 'No messages yet',
  emptyStateSubtext,
}: ChatThreadViewProps) {
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || sending) return;
    setSending(true);
    try {
      await onSendMessage(input.trim());
      setInput('');
    } catch (err: any) {
      toast(err.message || 'Failed to send message', 'error');
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 min-h-0">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-5 h-5 border-2 border-zinc-200 dark:border-zinc-700 border-t-zinc-600 rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-center">
            <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-1">
              <svg className="w-5 h-5 text-zinc-400 dark:text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">{emptyStateHeader}</p>
            {emptyStateSubtext && <p className="text-[10px] text-zinc-400 dark:text-zinc-500 max-w-[180px]">{emptyStateSubtext}</p>}
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.senderRole === currentRole;
            return (
              <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] flex flex-col gap-0.5 ${isMe ? 'items-end' : 'items-start'}`}>
                  <div className={`px-3.5 py-2.5 rounded-2xl text-[12px] leading-relaxed ${ isMe ? 'bg-black text-white rounded-br-sm' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 rounded-bl-sm' }`}>
                    {/* Artwork mini-card */}
                    {msg.artwork && (
                      <div className={`mb-2 p-1.5 rounded-lg flex items-center gap-2 ${ isMe ? 'bg-zinc-800/50' : 'bg-white dark:bg-zinc-900 shadow-sm dark:shadow-zinc-900/30 border border-zinc-100 dark:border-zinc-800 dark:border-zinc-800' } max-w-[180px]`}>
                        {msg.artwork.imageUrl ? (
                          <img
                            src={msg.artwork.imageUrl}
                            alt={msg.artwork.title}
                            className="w-10 h-10 object-cover rounded-md bg-zinc-200 dark:bg-zinc-700 shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-md bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center shrink-0">
                            <svg className="w-4 h-4 text-zinc-400 dark:text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                        )}
                        <span className={`text-[10px] font-bold truncate ${isMe ? 'text-zinc-200 dark:text-zinc-300' : 'text-zinc-700 dark:text-zinc-500'}`}>
                          {msg.artwork.title}
                        </span>
                      </div>
                    )}
                    {msg.content}
                  </div>
                  <span className="text-[9px] text-zinc-400 dark:text-zinc-500 px-1">
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <div className="shrink-0 border-t border-zinc-100 dark:border-zinc-800 px-4 py-3 flex items-center gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder={placeholder}
          className="flex-1 text-sm bg-zinc-100 dark:bg-zinc-800 rounded-full px-4 py-2.5 outline-none placeholder:text-zinc-400 dark:text-zinc-500 focus:bg-zinc-50 focus:ring-1 focus:ring-zinc-300 transition-all"
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || sending}
          className="w-9 h-9 rounded-full bg-black text-white flex items-center justify-center disabled:opacity-30 hover:bg-zinc-800 transition-colors shrink-0"
        >
          {sending ? (
            <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <svg className="w-4 h-4 rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          )}
        </button>
      </div>
    </>
  );
}
