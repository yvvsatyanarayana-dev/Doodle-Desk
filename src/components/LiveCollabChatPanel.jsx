import React, { useEffect, useRef, useState } from 'react';
import { MessageCircle, Send, X, Mic, MicOff, Headphones, VolumeX, PhoneOff, RefreshCw, Copy, Check, Users, ScreenShare, ScreenShareOff, Monitor } from 'lucide-react';

const QUICK_REACTIONS = ['🔥', '👍', '❤️', '💡', '🚀', '🎨', '👏', '🎉', '👀'];

export function LiveCollabChatPanel({
  isOpen,
  onToggle,
  isConnected,
  chatMessages = [],
  sendChatMessage,
  myProfile,
  voiceState,
  voiceError,
  startVoiceCall,
  leaveVoiceCall,
  toggleVoiceMute,
  toggleVoiceDeafen,
  isVoiceSupported = true,
  roomId = '',
  collabPeersCount = 0,
  syncSceneNow,
  onToast,
  screenShareState,
  startScreenShare,
  stopScreenShare,
}) {
  const [message, setMessage] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const [copiedLink, setCopiedLink] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState(false);
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

  const handleCopyInvite = async () => {
    if (!roomId) return;
    const inviteUrl = getRoomInviteLink(roomId);
    const ok = await copyToClipboard(inviteUrl);
    if (ok) {
      setCopiedLink(true);
      onToast?.('Invite link copied! Send it to your friend to join this canvas.');
      setTimeout(() => setCopiedLink(false), 2000);
    }
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
              {roomId && <span className="live-collab-chat-room-badge" title="Room Code">{roomId}</span>}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              {syncSceneNow && (
                <button
                  type="button"
                  className="live-collab-chat-sync-btn"
                  onClick={() => {
                    setSyncFeedback(true);
                    const count = syncSceneNow();
                    onToast?.(`Canvas synced with peers (${count} elements)`);
                    setTimeout(() => setSyncFeedback(false), 1200);
                  }}
                  title="Sync canvas diagrams with peers"
                  aria-label="Sync Canvas"
                >
                  <RefreshCw size={13} className={syncFeedback ? 'animate-spin text-emerald-400' : ''} />
                </button>
              )}
              <button type="button" className="live-collab-chat-close" onClick={toggleChat} aria-label="Close room chat">
                <X size={15} />
              </button>
            </div>
          </header>

          {/* Waiting for peers alert banner */}
          {collabPeersCount === 0 && roomId && (
            <div className="live-collab-chat-waiting-alert">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Users size={12} color="#f59e0b" />
                  <span style={{ fontSize: '11px', fontWeight: 600, color: '#f59e0b' }}>
                    Waiting for friend to join
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleCopyInvite}
                  className="live-collab-chat-copy-badge"
                  title="Copy room invite link"
                >
                  {copiedLink ? <Check size={10} color="#10b981" /> : <Copy size={10} />}
                  <span>{copiedLink ? 'Copied' : 'Copy Link'}</span>
                </button>
              </div>
              <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '3px' }}>
                Share Room Code <strong style={{ color: '#f1f5f9', fontFamily: 'monospace' }}>{roomId}</strong> with your friend so they can see your diagrams live.
              </div>
            </div>
          )}

          {/* Voice Chat Banner — Connected automatically from session start */}
          {isVoiceSupported && (
            <div
              className={`live-collab-voice-banner ${voiceState?.isMuted ? 'muted' : 'in-voice'}`}
            >
              <div className="live-collab-voice-status">
                <span className={`live-collab-voice-indicator ${voiceState?.isMuted ? 'muted' : 'active'}`} />
                <span style={{ fontSize: '11px', fontWeight: 600, color: voiceState?.isMuted ? '#f87171' : '#34d399' }}>
                  {voiceState?.isSpeaking
                    ? 'Speaking...'
                    : voiceState?.isMuted
                    ? 'Mic Off (Muted)'
                    : 'Mic On (Live Talk)'}
                </span>
              </div>

              <div className="live-collab-voice-actions">
                <button
                  type="button"
                  className={`live-collab-voice-btn ${voiceState?.isMuted ? 'muted' : 'active'}`}
                  onClick={() => {
                    if (!voiceState?.inVoice) {
                      startVoiceCall?.();
                    } else {
                      toggleVoiceMute?.();
                    }
                  }}
                  title={voiceState?.isMuted ? 'Turn Mic On (Alt+M)' : 'Turn Mic Off (Alt+M)'}
                  aria-label={voiceState?.isMuted ? 'Turn Mic On' : 'Turn Mic Off'}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '3px 8px',
                    borderRadius: 5,
                    background: voiceState?.isMuted ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                    borderColor: voiceState?.isMuted ? 'rgba(239, 68, 68, 0.4)' : 'rgba(16, 185, 129, 0.4)',
                    color: voiceState?.isMuted ? '#f87171' : '#34d399',
                  }}
                >
                  {voiceState?.isMuted ? <MicOff size={12} color="#f87171" /> : <Mic size={12} color="#34d399" />}
                  <span style={{ fontSize: '10px', fontWeight: 600 }}>{voiceState?.isMuted ? 'Mic Off' : 'Mic On'}</span>
                </button>

                <button
                  type="button"
                  className="live-collab-voice-btn"
                  onClick={toggleVoiceDeafen}
                  title={voiceState?.isDeafened ? 'Undeafen' : 'Deafen'}
                  aria-label={voiceState?.isDeafened ? 'Undeafen Audio' : 'Deafen Audio'}
                >
                  {voiceState?.isDeafened ? <VolumeX size={12} color="#fbbf24" /> : <Headphones size={12} />}
                </button>

                {startScreenShare && (
                  <button
                    type="button"
                    className={`live-collab-voice-btn ${screenShareState?.isSharing ? 'danger' : ''}`}
                    onClick={screenShareState?.isSharing ? stopScreenShare : startScreenShare}
                    title={screenShareState?.isSharing ? 'Stop Presenting Screen (Alt+S)' : 'Share Screen (Alt+S)'}
                    aria-label="Toggle Screen Share"
                  >
                    {screenShareState?.isSharing ? <ScreenShareOff size={12} /> : <ScreenShare size={12} />}
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="live-collab-chat-messages" aria-live="polite">
            {chatMessages.length === 0 ? (
              <div className="live-collab-chat-empty">Messages and reactions appear here.</div>
            ) : (
              chatMessages.map((item) => (
                <div key={item.id} className={`live-collab-message ${item.isReaction ? 'reaction' : ''}`}>
                  <span className="live-collab-message-author" style={{ color: item.color?.background || '#94a3b8' }}>
                    {item.senderName || 'Collaborator'}
                  </span>
                  <span className="live-collab-message-text">{item.text}</span>
                </div>
              ))
            )}
            <div ref={bottomRef} />
          </div>

          <div className="live-collab-chat-reactions" aria-label="Quick reactions">
            {QUICK_REACTIONS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => sendChatMessage?.(emoji, true)}
                aria-label={`Send ${emoji} reaction`}
              >
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
