import React, { useState, useEffect } from 'react';
import {
  Wifi, WifiOff, Radio, Users, Share2, Copy, Check,
  Sparkles, Eye, MessageCircle, ArrowRight,
} from 'lucide-react';

const COLLAB_COLORS = [
  { background: '#ef4444', stroke: '#dc2626', name: 'Red' },
  { background: '#3b82f6', stroke: '#2563eb', name: 'Blue' },
  { background: '#10b981', stroke: '#059669', name: 'Emerald' },
  { background: '#f59e0b', stroke: '#d97706', name: 'Amber' },
  { background: '#8b5cf6', stroke: '#7c3aed', name: 'Violet' },
  { background: '#ec4899', stroke: '#db2777', name: 'Rose' },
  { background: '#06b6d4', stroke: '#0891b2', name: 'Cyan' },
  { background: '#84cc16', stroke: '#65a30d', name: 'Lime' },
];

// Signature primary action button with full light & dark theme support
function PrimaryBtn({ onClick, children, style = {}, disabled = false, type = 'button', isDark = true }) {
  const isLightTheme = !isDark;
  return (
    <button
      onClick={onClick}
      type={type}
      disabled={disabled}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 7,
        background: disabled
          ? (isLightTheme ? '#e2e8f0' : 'rgba(255, 255, 255, 0.03)')
          : (isLightTheme ? '#6366f1' : 'rgba(255, 255, 255, 0.1)'),
        color: disabled ? (isLightTheme ? '#94a3b8' : '#52525b') : '#ffffff',
        border: '1px solid ' + (disabled ? 'transparent' : (isLightTheme ? '#4f46e5' : 'rgba(255, 255, 255, 0.18)')),
        borderRadius: '8px',
        padding: '8px 14px',
        fontSize: '12px',
        fontWeight: 600,
        cursor: disabled ? 'not-allowed' : 'pointer',
        boxShadow: disabled ? 'none' : (isLightTheme ? '0 2px 6px rgba(99, 102, 241, 0.25)' : '0 2px 8px rgba(0, 0, 0, 0.35)'),
        transition: 'all 0.15s ease',
        ...style,
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          e.currentTarget.style.background = isLightTheme ? '#4f46e5' : 'rgba(255, 255, 255, 0.18)';
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled) {
          e.currentTarget.style.background = isLightTheme ? '#6366f1' : 'rgba(255, 255, 255, 0.1)';
        }
      }}
    >
      {children}
    </button>
  );
}

// Reusable secondary button with full light & dark theme support
function SecondaryBtn({ onClick, children, style = {}, disabled = false, type = 'button', isDark = true }) {
  const isLightTheme = !isDark;
  return (
    <button
      onClick={onClick}
      type={type}
      disabled={disabled}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 5,
        background: isLightTheme ? '#f1f5f9' : 'rgba(255, 255, 255, 0.05)',
        color: disabled ? (isLightTheme ? '#94a3b8' : '#52525b') : (isLightTheme ? '#1e293b' : '#d4d4d8'),
        border: '1px solid ' + (isLightTheme ? '#e2e8f0' : 'rgba(255, 255, 255, 0.1)'),
        borderRadius: '7px',
        padding: '5px 10px',
        fontSize: '11px',
        fontWeight: 500,
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all 0.12s ease',
        ...style,
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          e.currentTarget.style.background = isLightTheme ? '#e2e8f0' : 'rgba(255, 255, 255, 0.1)';
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled) {
          e.currentTarget.style.background = isLightTheme ? '#f1f5f9' : 'rgba(255, 255, 255, 0.05)';
        }
      }}
    >
      {children}
    </button>
  );
}

export default function LiveCollabDropdown({
  status = 'disconnected',
  connectionError = '',
  roomId,
  myProfile,
  setMyProfile,
  collaborators,
  chatMessages = [],
  onOpenLiveChat,
  startHosting,
  joinSession,
  leaveSession,
  onFollowCollaborator,
  onClose,
  theme = 'dark',
  isDark = theme !== 'light',
}) {
  const [inputRoomId, setInputRoomId] = useState('');
  const [usernameInput, setUsernameInput] = useState(myProfile?.username || '');
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const isLightTheme = !isDark;

  // Harmonious theme tokens
  const T = isLightTheme
    ? {
        bg: '#ffffff',
        bgCard: '#f8fafc',
        border: 'rgba(0, 0, 0, 0.09)',
        borderSubtle: 'rgba(0, 0, 0, 0.06)',
        text: '#0f172a',
        textSecondary: '#334155',
        textMuted: '#64748b',
        textDim: '#94a3b8',
        shadow: '0 20px 45px rgba(0, 0, 0, 0.14), 0 0 0 1px rgba(0, 0, 0, 0.05)',
      }
    : {
        bg: '#111113',
        bgCard: 'rgba(255, 255, 255, 0.03)',
        border: 'rgba(255, 255, 255, 0.09)',
        borderSubtle: 'rgba(255, 255, 255, 0.06)',
        text: '#f4f4f5',
        textSecondary: '#a1a1aa',
        textMuted: '#71717a',
        textDim: '#52525b',
        shadow: '0 24px 60px rgba(0,0,0,0.85), 0 0 0 1px rgba(255,255,255,0.05)',
      };

  const collaboratorList = Array.from((collaborators || new Map()).values());
  const isConnected = status === 'hosting' || status === 'joined';

  useEffect(() => {
    if (myProfile?.username) setUsernameInput(myProfile.username);
  }, [myProfile]);

  const handleUpdateName = (e) => {
    e?.preventDefault?.();
    if (!usernameInput.trim()) return;
    setMyProfile?.((prev) => ({ ...prev, username: usernameInput.trim() }));
  };

  const handleCopyCode = () => {
    if (!roomId) return;
    navigator.clipboard.writeText(roomId);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyLink = () => {
    if (!roomId) return;
    const url = new URL(window.location.href);
    url.searchParams.set('room', roomId);
    navigator.clipboard.writeText(url.toString());
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleJoin = (e) => {
    e.preventDefault();
    if (!inputRoomId.trim()) return;
    let target = inputRoomId.trim();
    try {
      if (target.includes('room=')) {
        const parsed = new URL(target);
        target = parsed.searchParams.get('room') || target;
      }
    } catch {}
    joinSession?.(target);
  };

  const card = {
    background: T.bgCard,
    border: '1px solid ' + T.borderSubtle,
    borderRadius: '10px',
    padding: '10px 12px',
    display: 'flex',
    flexDirection: 'column',
    gap: 7,
  };

  const labelSm = {
    fontSize: '10px',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: T.textMuted,
  };

  const inputStyle = {
    background: isLightTheme ? '#f1f5f9' : 'rgba(0,0,0,0.35)',
    border: '1px solid ' + (isLightTheme ? 'rgba(0, 0, 0, 0.12)' : 'rgba(255,255,255,0.12)'),
    borderRadius: '7px',
    padding: '6px 9px',
    fontSize: '12px',
    color: T.text,
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
    transition: 'border-color 0.15s',
  };

  const iconBox = {
    width: 28,
    height: 28,
    borderRadius: 7,
    background: isLightTheme ? '#f1f5f9' : 'rgba(255,255,255,0.06)',
    border: '1px solid ' + (isLightTheme ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255,255,255,0.1)'),
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: isLightTheme ? '#0f172a' : '#d4d4d8',
    flexShrink: 0,
  };

  return (
    <div
      className="live-collab-dropdown"
      style={{
        background: T.bg,
        border: '1px solid ' + T.border,
        borderRadius: '14px',
        boxShadow: T.shadow,
        width: '300px',
        maxHeight: 'min(560px, calc(100dvh - 72px))',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        fontFamily: 'system-ui,-apple-system,sans-serif',
        color: T.text,
        fontSize: '13px',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* ── Header ─────────────────────────── */}
      <div
        style={{
          padding: '11px 14px',
          borderBottom: '1px solid ' + T.borderSubtle,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: '8px',
            flexShrink: 0,
            background: isLightTheme ? '#f1f5f9' : 'rgba(255,255,255,0.06)',
            border: '1px solid ' + (isLightTheme ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.1)'),
            color: isConnected ? '#10b981' : (isLightTheme ? '#0f172a' : '#e4e4e7'),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Radio size={16} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: '13px', display: 'flex', alignItems: 'center', gap: 7, color: T.text }}>
            <span>Live Collaboration</span>
            {isConnected && (
              <span
                style={{
                  fontSize: '9px',
                  fontWeight: 700,
                  padding: '1px 6px',
                  borderRadius: 999,
                  background: 'rgba(16, 185, 129, 0.12)',
                  color: '#10b981',
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                  letterSpacing: '0.04em',
                }}
              >
                {status === 'hosting' ? 'HOSTING' : 'LIVE'}
              </span>
            )}
          </div>
          <div style={{ fontSize: '11px', color: T.textMuted, marginTop: 1 }}>
            {isConnected ? 'Real-time multi-user drawing' : 'Draw together in real-time'}
          </div>
        </div>
      </div>

      {/* ── Body ───────────────────────────── */}
      <div className="live-collab-scroll" style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 7, padding: '8px 8px' }}>

        {connectionError && (
          <div role="alert" style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid rgba(248, 113, 113, 0.3)', background: 'rgba(248, 113, 113, 0.1)', color: '#ef4444', fontSize: 11, lineHeight: 1.4 }}>
            {connectionError}
          </div>
        )}

        {/* Profile Card */}
        <div style={card}>
          <div style={labelSm}>Your Profile</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 7,
                flexShrink: 0,
                background: myProfile?.color?.background || '#3b82f6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontWeight: 700,
                fontSize: '11px',
              }}
            >
              {usernameInput ? usernameInput.slice(0, 2).toUpperCase() : 'ME'}
            </div>
            <form onSubmit={handleUpdateName} style={{ display: 'flex', gap: 5, flex: 1 }}>
              <input
                type="text"
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                onBlur={handleUpdateName}
                placeholder="Your name…"
                style={{ ...inputStyle, flex: 1, padding: '5px 8px' }}
              />
              <SecondaryBtn isDark={isDark} onClick={handleUpdateName} style={{ padding: '5px 10px' }}>
                Save
              </SecondaryBtn>
            </form>
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', paddingTop: 2 }}>
            {COLLAB_COLORS.map((col, idx) => {
              const sel = myProfile?.color?.background === col.background;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setMyProfile?.((p) => ({ ...p, color: col }))}
                  title={col.name}
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: '50%',
                    background: col.background,
                    padding: 0,
                    border: 'none',
                    cursor: 'pointer',
                    outline: sel ? (isLightTheme ? '2px solid #0f172a' : '2px solid #ffffff') : 'none',
                    outlineOffset: '2px',
                    transform: sel ? 'scale(1.15)' : 'scale(1)',
                    transition: 'all 0.12s ease',
                  }}
                />
              );
            })}
          </div>
        </div>

        {!isConnected ? (
          // ── Disconnected ────────────────────
          <>
            {/* Host Card */}
            <div style={card}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                <div style={iconBox}>
                  <Sparkles size={14} />
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '13px', color: T.text }}>Host a Live Room</div>
                  <div style={{ fontSize: '11px', color: T.textMuted }}>Generate a peer-to-peer room code</div>
                </div>
              </div>
              <PrimaryBtn
                isDark={isDark}
                onClick={() => startHosting?.()}
                style={{ width: '100%', padding: '9px 14px' }}
              >
                <Wifi size={13} />
                <span>Create Live Room</span>
              </PrimaryBtn>
            </div>

            {/* Join Card */}
            <div style={card}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                <div style={iconBox}>
                  <Users size={14} />
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '13px', color: T.text }}>Join Existing Room</div>
                  <div style={{ fontSize: '11px', color: T.textMuted }}>Enter a room code or paste invite URL</div>
                </div>
              </div>
              <form onSubmit={handleJoin} style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                <input
                  type="text"
                  value={inputRoomId}
                  onChange={(e) => setInputRoomId(e.target.value)}
                  placeholder="e.g. room-k8s9f2 or paste link…"
                  style={inputStyle}
                />
                <PrimaryBtn
                  isDark={isDark}
                  onClick={handleJoin}
                  type="submit"
                  disabled={!inputRoomId.trim()}
                  style={{ width: '100%', padding: '8px 14px' }}
                >
                  <span>Join Room</span>
                  <ArrowRight size={13} />
                </PrimaryBtn>
              </form>
            </div>
          </>
        ) : (
          // ── Connected ───────────────────────
          <>
            {/* Room info */}
            <div style={card}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                <div>
                  <div style={labelSm}>Active Room</div>
                  <div style={{ fontSize: '13px', fontWeight: 700, fontFamily: 'monospace', color: T.text, marginTop: 2 }}>
                    {roomId}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 5 }}>
                  <SecondaryBtn isDark={isDark} onClick={handleCopyCode} style={{ padding: '5px 9px', fontSize: '11px' }}>
                    {copiedCode ? <Check size={11} /> : <Copy size={11} />}
                    <span>{copiedCode ? 'Copied!' : 'Code'}</span>
                  </SecondaryBtn>
                  <SecondaryBtn isDark={isDark} onClick={handleCopyLink} style={{ padding: '5px 9px', fontSize: '11px' }}>
                    {copiedLink ? <Check size={11} /> : <Share2 size={11} />}
                    <span>{copiedLink ? 'Copied!' : 'Link'}</span>
                  </SecondaryBtn>
                </div>
              </div>
            </div>

            {/* Peers */}
            <div style={card}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontWeight: 600, fontSize: '12px', color: T.text }}>
                  <Users size={12} style={{ color: T.textMuted }} />
                  <span>Active Members</span>
                </div>
                <span style={{ fontSize: '10px', color: T.textMuted }}>{collaboratorList.length + 1} online</span>
              </div>
              <div className="live-collab-list" style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 100, overflowY: 'auto' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '4px 7px',
                    background: isLightTheme ? '#ffffff' : 'rgba(255,255,255,0.04)',
                    border: '1px solid ' + (isLightTheme ? '#e2e8f0' : 'transparent'),
                    borderRadius: 6,
                    fontSize: '11px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: '50%',
                        background: myProfile?.color?.background || '#3b82f6',
                      }}
                    />
                    <span style={{ fontWeight: 600, color: T.text }}>{myProfile?.username || 'You'}</span>
                    <span style={{ color: T.textMuted, fontSize: '10px' }}>(You)</span>
                  </div>
                  <span style={{ fontSize: '10px', color: '#10b981', fontWeight: 600 }}>Active</span>
                </div>
                {collaboratorList.map((c) => (
                  <div
                    key={c.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '4px 7px',
                      background: isLightTheme ? '#ffffff' : 'rgba(255,255,255,0.02)',
                      border: '1px solid ' + (isLightTheme ? '#e2e8f0' : 'transparent'),
                      borderRadius: 6,
                      fontSize: '11px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div
                        style={{
                          width: 7,
                          height: 7,
                          borderRadius: '50%',
                          background: c.color?.background || '#8b5cf6',
                        }}
                      />
                      <span style={{ color: T.text }}>{c.username || 'Peer'}</span>
                    </div>
                    {c.pointer && onFollowCollaborator && (
                      <button
                        onClick={() => onFollowCollaborator(c)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: T.textMuted,
                          cursor: 'pointer',
                          fontSize: '10px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 3,
                          padding: '1px 5px',
                          borderRadius: 4,
                        }}
                      >
                        <Eye size={10} /> Follow
                      </button>
                    )}
                  </div>
                ))}
                {collaboratorList.length === 0 && (
                  <div
                    style={{
                      padding: '8px',
                      textAlign: 'center',
                      color: T.textMuted,
                      fontSize: '11px',
                      border: '1px dashed ' + (isLightTheme ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.08)'),
                      borderRadius: 6,
                    }}
                  >
                    Waiting for peers… Share the room code!
                  </div>
                )}
              </div>
            </div>

            {/* Chat */}
            <div style={card}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontWeight: 600, fontSize: '12px', color: T.text }}>
                <MessageCircle size={12} style={{ color: T.textMuted }} />
                <span>Room Chat</span>
                <span style={{ marginLeft: 'auto', color: T.textMuted, fontSize: 10 }}>{chatMessages.length}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <span style={{ color: T.textMuted, fontSize: 11 }}>Open the floating chat panel to message everyone.</span>
                <PrimaryBtn isDark={isDark} onClick={() => { onOpenLiveChat?.(); onClose?.(); }} style={{ flexShrink: 0, padding: '6px 10px' }}>
                  <MessageCircle size={12} />
                  <span>Open Chat</span>
                </PrimaryBtn>
              </div>
            </div>

            {/* Leave Room Button */}
            <button
              onClick={leaveSession}
              type="button"
              style={{
                padding: '7px 12px',
                background: isLightTheme ? '#fee2e2' : 'rgba(239, 68, 68, 0.08)',
                border: '1px solid ' + (isLightTheme ? '#fca5a5' : 'rgba(239, 68, 68, 0.2)'),
                borderRadius: 8,
                fontSize: '12px',
                fontWeight: 600,
                color: '#ef4444',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                transition: 'background 0.12s, border-color 0.12s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = isLightTheme ? '#fecaca' : 'rgba(239, 68, 68, 0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = isLightTheme ? '#fee2e2' : 'rgba(239, 68, 68, 0.08)';
              }}
            >
              <WifiOff size={12} />
              <span>Leave Collaboration Room</span>
            </button>
          </>
        )}

      </div>
    </div>
  );
}
