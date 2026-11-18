import React, { useState, useEffect } from 'react';
import { copyToClipboard, getRoomInviteLink, getRoomAppDeepLink } from '../utils/collabShare.js';
import {
  Wifi, WifiOff, Radio, Users, Share2, Copy, Check, Link,
  Sparkles, Eye, MessageCircle, ArrowRight,
  Mic, MicOff, Headphones, VolumeX, PhoneOff, RefreshCw, Maximize2, ScreenShare, ScreenShareOff, Monitor,
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
          : (isLightTheme ? '#111111' : 'rgba(255, 255, 255, 0.1)'),
        color: disabled ? (isLightTheme ? '#94a3b8' : '#52525b') : '#ffffff',
        border: '1px solid ' + (disabled ? 'transparent' : (isLightTheme ? '#333333' : 'rgba(255, 255, 255, 0.18)')),
        borderRadius: '8px',
        padding: '8px 14px',
        fontSize: '12px',
        fontWeight: 600,
        cursor: disabled ? 'not-allowed' : 'pointer',
        boxShadow: disabled ? 'none' : (isLightTheme ? '0 2px 6px rgba(0, 0, 0, 0.2)' : '0 2px 8px rgba(0, 0, 0, 0.35)'),
        transition: 'all 0.15s ease',
        ...style,
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          e.currentTarget.style.background = isLightTheme ? '#333333' : 'rgba(255, 255, 255, 0.18)';
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled) {
          e.currentTarget.style.background = isLightTheme ? '#111111' : 'rgba(255, 255, 255, 0.1)';
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
  discoveredRoom = null,
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
  voiceState,
  voiceError,
  startVoiceCall,
  leaveVoiceCall,
  toggleVoiceMute,
  toggleVoiceDeafen,
  isVoiceSupported = true,
  syncSceneNow,
  onFitToContent,
  onToast,
  screenShareState,
  startScreenShare,
  stopScreenShare,
  isScreenShareSupported = true,
}) {
  const [inputRoomId, setInputRoomId] = useState('');
  const [usernameInput, setUsernameInput] = useState(myProfile?.username || '');
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [syncingCanvas, setSyncingCanvas] = useState(false);

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

  const inviteUrl = getRoomInviteLink(roomId);
  const appDeepLink = getRoomAppDeepLink(roomId);
  const [copiedAppDeepLink, setCopiedAppDeepLink] = useState(false);

  const handleCopyCode = async () => {
    if (!roomId) return;
    const ok = await copyToClipboard(roomId);
    if (ok) {
      setCopiedCode(true);
      onToast?.('Room code copied to clipboard!');
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const handleCopyLink = async () => {
    if (!roomId) return;
    const ok = await copyToClipboard(inviteUrl);
    if (ok) {
      setCopiedLink(true);
      onToast?.('Invite link copied to clipboard!');
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleCopyAppDeepLink = async () => {
    if (!roomId) return;
    const ok = await copyToClipboard(appDeepLink);
    if (ok) {
      setCopiedAppDeepLink(true);
      onToast?.('Desktop app link copied (doodle-desk://)!');
      setTimeout(() => setCopiedAppDeepLink(false), 2000);
    }
  };

  const handleJoin = (e) => {
    e.preventDefault();
    if (!inputRoomId.trim()) return;
    let target = inputRoomId.trim();
    try {
      if (target.includes('room=')) {
        const match = target.match(/room=([^&#\s]+)/i);
        if (match && match[1]) target = decodeURIComponent(match[1]);
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
        width: 'min(300px, calc(100vw - 20px))',
        maxWidth: 'calc(100vw - 20px)',
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
            {discoveredRoom && (
              <div
                style={{
                  background: isLightTheme ? '#f0fdf4' : 'rgba(16, 185, 129, 0.1)',
                  border: '1px solid ' + (isLightTheme ? '#bbf7d0' : 'rgba(16, 185, 129, 0.3)'),
                  borderRadius: 10,
                  padding: '10px 12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                  </span>
                  <div style={{ fontWeight: 600, fontSize: '12px', color: isLightTheme ? '#15803d' : '#34d399' }}>
                    Active Local Room Found
                  </div>
                </div>
                <div style={{ fontSize: '11px', color: isLightTheme ? '#166534' : '#a7f3d0' }}>
                  <strong>{discoveredRoom.hostName || 'A collaborator'}</strong> is live in room{' '}
                  <code style={{ fontFamily: 'monospace', fontWeight: 700 }}>{discoveredRoom.roomId}</code>.
                </div>
                <PrimaryBtn
                  isDark={isDark}
                  onClick={() => joinSession?.(discoveredRoom.roomId)}
                  style={{
                    background: '#10b981',
                    borderColor: '#059669',
                    color: '#ffffff',
                    padding: '8px 12px',
                    width: '100%',
                  }}
                >
                  <Users size={13} />
                  <span>Join {discoveredRoom.hostName ? `${discoveredRoom.hostName}'s Room` : 'Active Room'}</span>
                </PrimaryBtn>
              </div>
            )}
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
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <div>
                  <div style={labelSm}>Active Room Code</div>
                  <div style={{ fontSize: '15px', fontWeight: 700, fontFamily: 'monospace', color: T.text, marginTop: 1, letterSpacing: '0.04em' }}>
                    {roomId}
                  </div>
                </div>
                <SecondaryBtn isDark={isDark} onClick={handleCopyCode} style={{ padding: '5px 10px', fontSize: '11px' }}>
                  {copiedCode ? <Check size={11} color="#10b981" /> : <Copy size={11} />}
                  <span style={{ color: copiedCode ? '#10b981' : undefined }}>{copiedCode ? 'Copied Code!' : 'Copy Code'}</span>
                </SecondaryBtn>
              </div>

              {/* Shareable Invite Link Input Group */}
              <div style={{ marginTop: 4, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ fontSize: '10px', fontWeight: 600, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Shareable Invite Link
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    background: isLightTheme ? '#f1f5f9' : 'rgba(0, 0, 0, 0.35)',
                    border: '1px solid ' + (isLightTheme ? 'rgba(0, 0, 0, 0.12)' : 'rgba(255, 255, 255, 0.12)'),
                    borderRadius: '8px',
                    padding: '3px 4px 3px 8px',
                    boxSizing: 'border-box',
                    transition: 'border-color 0.15s ease',
                  }}
                >
                  <Link size={12} style={{ color: T.textMuted, flexShrink: 0 }} />
                  <input
                    type="text"
                    readOnly
                    value={inviteUrl}
                    onClick={(e) => {
                      e.target.select();
                      handleCopyLink();
                    }}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      outline: 'none',
                      fontSize: '11px',
                      fontFamily: 'monospace',
                      color: T.text,
                      flex: 1,
                      minWidth: 0,
                      cursor: 'pointer',
                      padding: '2px 0',
                    }}
                    title="Click to copy invite link"
                  />
                  <SecondaryBtn
                    isDark={isDark}
                    onClick={handleCopyLink}
                    style={{
                      padding: '4px 8px',
                      fontSize: '11px',
                      flexShrink: 0,
                      background: copiedLink
                        ? 'rgba(16, 185, 129, 0.15)'
                        : (isLightTheme ? '#e2e8f0' : 'rgba(255, 255, 255, 0.08)'),
                      color: copiedLink ? '#10b981' : (isLightTheme ? '#1e293b' : '#d4d4d8'),
                      borderColor: copiedLink ? 'rgba(16, 185, 129, 0.3)' : undefined,
                    }}
                  >
                    {copiedLink ? <Check size={11} color="#10b981" /> : <Copy size={11} />}
                    <span>{copiedLink ? 'Copied Link!' : 'Copy Link'}</span>
                  </SecondaryBtn>
                </div>
                <div style={{ display: 'flex', gap: 6, marginTop: 2 }}>
                  <SecondaryBtn
                    isDark={isDark}
                    onClick={handleCopyAppDeepLink}
                    style={{
                      flex: 1,
                      padding: '4px 8px',
                      fontSize: '10.5px',
                      color: copiedAppDeepLink ? '#10b981' : T.textMuted,
                      borderColor: copiedAppDeepLink ? 'rgba(16, 185, 129, 0.3)' : undefined,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 4,
                    }}
                    title="Copy doodle-desk:// deep link to open directly in the desktop app"
                  >
                    {copiedAppDeepLink ? <Check size={11} color="#10b981" /> : <Monitor size={11} />}
                    <span>{copiedAppDeepLink ? 'Copied Desktop App Link!' : 'Copy Desktop App Link'}</span>
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
              {collaboratorList.length === 0 && (
                <div
                  style={{
                    background: isLightTheme ? '#f8fafc' : 'rgba(255, 255, 255, 0.03)',
                    border: '1px dashed ' + (isLightTheme ? '#cbd5e1' : 'rgba(255, 255, 255, 0.14)'),
                    borderRadius: 8,
                    padding: '8px 10px',
                    fontSize: '11px',
                    color: T.textMuted,
                  }}
                >
                  Waiting for collaborators to join <strong>{roomId}</strong>.
                </div>
              )}
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
                    {voiceState?.inVoice && (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 2,
                          padding: '1px 5px',
                          borderRadius: 4,
                          fontSize: '9px',
                          fontWeight: 600,
                          background: voiceState.isMuted
                            ? 'rgba(239, 68, 68, 0.15)'
                            : voiceState.isSpeaking
                            ? 'rgba(16, 185, 129, 0.2)'
                            : 'rgba(255, 255, 255, 0.08)',
                          color: voiceState.isMuted
                            ? '#ef4444'
                            : voiceState.isSpeaking
                            ? '#10b981'
                            : T.textMuted,
                        }}
                        title={voiceState.isMuted ? 'Mic Muted' : voiceState.isSpeaking ? 'Speaking' : 'Voice Connected'}
                      >
                        {voiceState.isMuted ? <MicOff size={9} /> : <Mic size={9} />}
                        {voiceState.isSpeaking ? 'Speaking' : voiceState.isMuted ? 'Muted' : 'Voice'}
                      </span>
                    )}
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
                      {c.inVoice && (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 2,
                            padding: '1px 5px',
                            borderRadius: 4,
                            fontSize: '9px',
                            fontWeight: 600,
                            background: c.isVoiceMuted
                              ? 'rgba(239, 68, 68, 0.15)'
                              : c.isVoiceSpeaking
                              ? 'rgba(16, 185, 129, 0.2)'
                              : 'rgba(255, 255, 255, 0.08)',
                            color: c.isVoiceMuted
                              ? '#ef4444'
                              : c.isVoiceSpeaking
                              ? '#10b981'
                              : T.textMuted,
                          }}
                          title={c.isVoiceMuted ? 'Mic Muted' : c.isVoiceSpeaking ? 'Speaking' : 'Voice Connected'}
                        >
                          {c.isVoiceMuted ? <MicOff size={9} /> : <Mic size={9} />}
                          {c.isVoiceSpeaking ? 'Speaking' : c.isVoiceMuted ? 'Muted' : 'Voice'}
                        </span>
                      )}
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

            {/* Canvas Synchronization Tools */}
            <div style={card}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontWeight: 600, fontSize: '12px', color: T.text }}>
                <RefreshCw size={12} style={{ color: T.textMuted }} />
                <span>Canvas Sync & View</span>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <SecondaryBtn
                  isDark={isDark}
                  onClick={() => {
                    setSyncingCanvas(true);
                    const count = syncSceneNow?.() || 0;
                    onToast?.(`Canvas synchronized with peers (${count} elements)`);
                    setTimeout(() => setSyncingCanvas(false), 1200);
                  }}
                  style={{ flex: 1, padding: '6px 8px', fontSize: '11px' }}
                  title="Force re-sync all shapes and diagrams with room peers"
                >
                  <RefreshCw size={11} className={syncingCanvas ? 'animate-spin' : ''} style={{ color: '#10b981' }} />
                  <span>{syncingCanvas ? 'Syncing...' : 'Sync Canvas'}</span>
                </SecondaryBtn>

                {onFitToContent && (
                  <SecondaryBtn
                    isDark={isDark}
                    onClick={() => {
                      onFitToContent?.();
                      onClose?.();
                    }}
                    style={{ flex: 1, padding: '6px 8px', fontSize: '11px' }}
                    title="Fit viewport to include all diagrams created by you and your peers"
                  >
                    <Maximize2 size={11} style={{ color: '#3b82f6' }} />
                    <span>Fit All Diagrams</span>
                  </SecondaryBtn>
                )}
              </div>
            </div>

            {/* Screen Sharing Section */}
            {isScreenShareSupported && (
              <div style={card}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontWeight: 600, fontSize: '12px', color: T.text }}>
                  <Monitor size={12} style={{ color: screenShareState?.isSharing ? '#ef4444' : T.textMuted }} />
                  <span>Live Screen Sharing</span>
                  {screenShareState?.isSharing && (
                    <span style={{ marginLeft: 'auto', color: '#ef4444', fontSize: 10, fontWeight: 600 }}>
                      ● You are presenting
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <span style={{ color: T.textMuted, fontSize: 11 }}>
                    {screenShareState?.isSharing
                      ? 'Presenting your screen live to room peers.'
                      : 'Share canvas, window, or entire screen.'}
                  </span>
                  {screenShareState?.isSharing ? (
                    <SecondaryBtn
                      isDark={isDark}
                      onClick={stopScreenShare}
                      style={{ flexShrink: 0, padding: '6px 10px', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.3)' }}
                    >
                      <ScreenShareOff size={12} />
                      <span>Stop Sharing</span>
                    </SecondaryBtn>
                  ) : (
                    <PrimaryBtn
                      isDark={isDark}
                      onClick={() => {
                        startScreenShare?.();
                        onClose?.();
                      }}
                      style={{ flexShrink: 0, padding: '6px 10px' }}
                    >
                      <ScreenShare size={12} />
                      <span>Share Screen</span>
                    </PrimaryBtn>
                  )}
                </div>
              </div>
            )}

            {/* Voice Talk Section — Auto-connected from session start */}
            {isVoiceSupported && (
              <div style={card}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span className="relative flex h-2 w-2">
                      <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                        voiceState?.isSpeaking ? 'bg-emerald-400' : voiceState?.isMuted ? 'bg-rose-400' : 'bg-emerald-400'
                      }`} />
                      <span className={`relative inline-flex rounded-full h-2 w-2 ${
                        voiceState?.isMuted ? 'bg-rose-500' : 'bg-emerald-500'
                      }`} />
                    </span>
                    <span style={{ fontWeight: 600, fontSize: '12px', color: T.text }}>Live Voice Talk</span>
                  </div>
                  <span style={{
                    fontSize: 10,
                    fontWeight: 600,
                    color: voiceState?.isMuted ? '#ef4444' : '#10b981',
                    background: voiceState?.isMuted ? 'rgba(239, 68, 68, 0.12)' : 'rgba(16, 185, 129, 0.12)',
                    padding: '2px 7px',
                    borderRadius: 999,
                    border: `1px solid ${voiceState?.isMuted ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
                  }}>
                    {voiceState?.isMuted ? 'Mic Off' : 'Mic On'}
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{
                      fontSize: '11px',
                      color: voiceState?.isSpeaking ? '#10b981' : voiceState?.isMuted ? '#ef4444' : T.textMuted,
                      fontWeight: voiceState?.isSpeaking ? 600 : 400,
                    }}>
                      {voiceState?.isSpeaking
                        ? '🎙️ You are speaking...'
                        : voiceState?.isMuted
                        ? '🔇 Microphone is off (Muted)'
                        : '🎙️ Microphone is on — you can talk freely'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {/* Primary Mic On / Off Toggle */}
                    <button
                      type="button"
                      aria-label={voiceState?.isMuted ? 'Turn Mic On' : 'Turn Mic Off'}
                      onClick={() => {
                        if (!voiceState?.inVoice) {
                          startVoiceCall?.();
                        } else {
                          toggleVoiceMute?.();
                        }
                      }}
                      style={{
                        flex: 1.3,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                        padding: '7px 12px',
                        borderRadius: 7,
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        background: voiceState?.isMuted
                          ? (isLightTheme ? '#fee2e2' : 'rgba(239, 68, 68, 0.16)')
                          : (isLightTheme ? '#dcfce7' : 'rgba(16, 185, 129, 0.2)'),
                        color: voiceState?.isMuted ? '#ef4444' : '#10b981',
                        border: `1px solid ${voiceState?.isMuted ? 'rgba(239, 68, 68, 0.35)' : 'rgba(16, 185, 129, 0.35)'}`,
                      }}
                      title={voiceState?.isMuted ? 'Turn Mic On (Alt+M)' : 'Turn Mic Off (Alt+M)'}
                    >
                      {voiceState?.isMuted ? <MicOff size={13} /> : <Mic size={13} className={voiceState?.isSpeaking ? 'animate-pulse' : ''} />}
                      <span>{voiceState?.isMuted ? 'Turn Mic On' : 'Turn Mic Off'}</span>
                    </button>

                    {/* Deafen / Undeafen */}
                    <SecondaryBtn
                      isDark={isDark}
                      onClick={toggleVoiceDeafen}
                      style={{
                        flex: 1,
                        color: voiceState?.isDeafened ? '#f59e0b' : T.text,
                        borderColor: voiceState?.isDeafened ? 'rgba(245, 158, 11, 0.35)' : undefined,
                      }}
                      title={voiceState?.isDeafened ? 'Undeafen audio output' : 'Deafen audio output'}
                    >
                      {voiceState?.isDeafened ? <VolumeX size={12} /> : <Headphones size={12} />}
                      <span>{voiceState?.isDeafened ? 'Undeafen' : 'Deafen'}</span>
                    </SecondaryBtn>
                  </div>
                </div>
              </div>
            )}

            {/* Leave Room Button */}
            <button
              onClick={() => {
                leaveSession?.();
                onClose?.();
                onToast?.('Left collaboration room');
              }}
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
