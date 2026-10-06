import React, { useEffect, useRef, useState } from 'react';
import { MessageCircle, Send, X } from 'lucide-react';

const QUICK_REACTIONS = ['🔥', '👍', '❤️', '💡', '🚀', '🎨', '👏', '🎉', '👀'];

export function LiveCollabChatPanel({ isOpen, onToggle, isConnected, chatMessages = [], sendChatMessage, myProfile }) {
  const [message, setMessage] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const bottomRef = useRef(null);
  const seenMessageIdsRef = useRef(new Set(chatMessages.map((item) => item.id)));

  useEffect(() => {
    bottomRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'end' });
  }, [chatMessages, isOpen]);

  useEffect(() => {
    if (!isConnected) {
      setUnreadCount(0);
      seenMessageIdsRef.current = new Set(chatMessages.map((item) => item.id));
      return;
    }

    const unseenMessages = chatMessages.filter((item) => !seenMessageIdsRef.current.has(item.id));
    if (isOpen) {
      setUnreadCount(0);
    } else {
      const unreadIncoming = unseenMessages.filter((item) => !myProfile?.id || item.senderId !== myProfile.id).length;
      if (unreadIncoming > 0) setUnreadCount((count) => Math.min(99, count + unreadIncoming));
    }

    unseenMessages.forEach((item) => seenMessageIdsRef.current.add(item.id));
    if (seenMessageIdsRef.current.size > 100) {
      seenMessageIdsRef.current = new Set(chatMessages.slice(-50).map((item) => item.id));
    }
  }, [chatMessages, isConnected, isOpen, myProfile?.id]);

  const sendMessage = (event) => {
    event.preventDefault();
    const value = message.trim();
    if (!value) return;
    sendChatMessage?.(value, false);
    setMessage('');
  };

  const toggleChat = () => {
    if (!isOpen) {
      setUnreadCount(0);
      chatMessages.forEach((item) => seenMessageIdsRef.current.add(item.id));
    }
    onToggle?.();
  };

  if (!isConnected) return null;

  return (
    <>
      <button
        type="button"
        className={`live-collab-chat-toggle ${isOpen ? 'active' : ''}`}
        onClick={toggleChat}
        aria-label={isOpen ? 'Close room chat' : 'Open room chat'}
        aria-expanded={isOpen}
        title={isOpen ? 'Close room chat' : 'Open room chat'}
      >
        <MessageCircle size={17} />
        {unreadCount > 0 && <span className="live-collab-chat-count">{unreadCount > 99 ? '99+' : unreadCount}</span>}
      </button>

      {isOpen && (
        <section className="live-collab-chat-panel" aria-label="Room chat">
          <header className="live-collab-chat-header">
            <div className="live-collab-chat-heading">
              <MessageCircle size={15} />
              <span>Room Chat</span>
            </div>
            <button type="button" className="live-collab-chat-close" onClick={toggleChat} aria-label="Close room chat">
              <X size={15} />
            </button>
          </header>

          <div className="live-collab-chat-messages" aria-live="polite">
            {chatMessages.length === 0 ? (
              <div className="live-collab-chat-empty">Messages and reactions appear here.</div>
            ) : chatMessages.map((item) => (
              <div key={item.id} className={`live-collab-message ${item.isReaction ? 'reaction' : ''}`}>
                <span className="live-collab-message-author" style={{ color: item.color?.background || '#94a3b8' }}>
                  {item.senderName || 'Collaborator'}
                </span>
                <span className="live-collab-message-text">{item.text}</span>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          <div className="live-collab-chat-reactions" aria-label="Quick reactions">
            {QUICK_REACTIONS.map((emoji) => (
              <button key={emoji} type="button" onClick={() => sendChatMessage?.(emoji, true)} aria-label={`Send ${emoji} reaction`}>
                {emoji}
              </button>
            ))}
          </div>

          <form className="live-collab-chat-compose" onSubmit={sendMessage}>
            <input
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder={`Message as ${myProfile?.username || 'you'}…`}
              aria-label="Type a room message"
              maxLength={1000}
            />
            <button type="submit" disabled={!message.trim()} aria-label="Send message">
              <Send size={15} />
            </button>
          </form>
        </section>
      )}
    </>
  );
}
