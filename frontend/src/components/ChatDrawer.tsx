import { useState, useEffect } from 'react';
import type { Message, User } from '../types';
import { sendMessage, fetchConversation } from '../api';
import ExhibitorProfileView from './ExhibitorProfileView';
import ChatThreadView from './ChatThreadView';
import { io } from 'socket.io-client';

interface ChatDrawerProps {
  token: string;
  user: User;
  exhibitorId: string;
  exhibitorName: string;
  exhibitorAvatar?: string | null;
  artworkId?: string;
  artworkType?: string;
  artworkImageUrl?: string | null;
  artworkTitle?: string;
  onClose: () => void;
}

export default function ChatDrawer({
  token,
  exhibitorId,
  exhibitorName,
  exhibitorAvatar,
  artworkId,
  artworkType,
  artworkImageUrl,
  artworkTitle,
  onClose,
}: ChatDrawerProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [showProfile, setShowProfile] = useState(false);

  const load = async () => {
    try {
      const data = await fetchConversation(token, exhibitorId);
      setMessages(data);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:3001');
    socket.emit('join', user.id);
    
    socket.on('newMessage', (msg: Message) => {
      // Only append if it belongs to this conversation
      if (
        (msg.exhibitorId === exhibitorId && msg.collectorId === user.id) || 
        (msg.collectorId === exhibitorId && msg.exhibitorId === user.id)
      ) {
        setMessages(prev => {
          if (prev.find(m => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [exhibitorId, user.id]);

  const handleSend = async (content: string) => {
    const msg = await sendMessage(token, {
      exhibitorId,
      content,
      artworkId,
      artworkType,
    });
    setMessages((prev) => [...prev, msg]);
  };

  return (
    <div className="fixed inset-0 z-[200] bg-white dark:bg-zinc-900 dark:bg-zinc-900/80 backdrop-blur-sm flex flex-col items-center justify-center p-0 sm:p-8">
      <div className="bg-white dark:bg-zinc-900 border-0 sm:border sm:border-zinc-100 dark:border-zinc-800 sm:rounded-2xl shadow-sm dark:shadow-zinc-900/30 flex flex-col w-full max-w-3xl overflow-hidden h-full sm:h-auto sm:min-h-0" style={{ height: '100dvh' }}>

      {/* ── Header ── */}
      <div className="shrink-0 flex items-center gap-2 sm:gap-3 px-4 sm:px-5 py-3 sm:py-4 border-b border-zinc-100 dark:border-zinc-800">
        <button
          onClick={onClose}
          className="w-7 sm:w-8 h-7 sm:h-8 rounded-full flex items-center justify-center text-zinc-400 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
        >
          <svg className="w-3.5 sm:w-4 h-3.5 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <div 
          className="w-8 sm:w-9 h-8 sm:h-9 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden flex items-center justify-center text-zinc-700 dark:text-zinc-300 text-xs sm:text-sm font-bold shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => setShowProfile(true)}
          title="View Profile"
        >
          {exhibitorAvatar ? (
            <img src={exhibitorAvatar} alt={exhibitorName} className="w-full h-full object-cover" />
          ) : (
            exhibitorName.charAt(0).toUpperCase()
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">{exhibitorName}</p>
          <p className="text-[8px] sm:text-[10px] text-zinc-400 dark:text-zinc-500">Exhibitor</p>
        </div>
        <span className="w-1.5 sm:w-2 h-1.5 sm:h-2 rounded-full bg-emerald-400 shrink-0" />
      </div>

      {/* ── Artwork context banner ── */}
      {(artworkImageUrl || artworkTitle) && (
        <div className="shrink-0 flex items-center gap-2 sm:gap-3 px-4 sm:px-5 py-2 sm:py-2.5 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950">
          {artworkImageUrl ? (
            <img
              src={artworkImageUrl}
              alt={artworkTitle}
              className="w-10 h-10 object-cover rounded-lg bg-zinc-200 dark:bg-zinc-700 shrink-0"
            />
          ) : (
            <div className="w-10 h-10 rounded-lg bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 text-zinc-400 dark:text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">Regarding</p>
            <p className="text-[12px] font-semibold text-zinc-800 dark:text-zinc-200 truncate">{artworkTitle}</p>
          </div>
        </div>
      )}

      <ChatThreadView
        messages={messages}
        currentRole="collector"
        onSendMessage={handleSend}
        loading={loading}
        placeholder={`Reply to ${exhibitorName}…`}
        emptyStateHeader="Start a conversation"
        emptyStateSubtext={`Ask ${exhibitorName} about this artwork.`}
      />
      </div>
      {showProfile && (
        <ExhibitorProfileView
          exhibitorId={exhibitorId}
          onClose={() => setShowProfile(false)}
        />
      )}
    </div>
  );
}
