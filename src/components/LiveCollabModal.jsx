import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Users,
  Radio,
  Share2,
  Copy,
  Check,
  LogOut,
  Send,
  Sparkles,
  Wifi,
  Smile,
  ShieldCheck,
  User,
  Eye,
  MessageSquare,
  Flame,
  ArrowRight,
} from 'lucide-react';

const QUICK_REACTIONS = ['🔥', '👍', '❤️', '💡', '🚀', '🎨', '👏', '🎉', '👀'];

export default function LiveCollabModal({
  isOpen,
  onClose,
  status, // 'disconnected' | 'hosting' | 'joined'
  connectionError = '',
  roomId,
  myProfile,
  setMyProfile,
  collaborators, // Map
  chatMessages,
  startHosting,
  joinSession,
  leaveSession,
  sendChatMessage,
  onFollowCollaborator,
  theme = 'dark',
}) {
  const [inputRoomId, setInputRoomId] = useState('');
  const [usernameInput, setUsernameInput] = useState(myProfile?.username || '');
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const chatBottomRef = useRef(null);

  useEffect(() => {
    if (myProfile?.username) {
      setUsernameInput(myProfile.username);
    }
  }, [myProfile]);

  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages]);

  if (!isOpen) return null;

  const isConnected = status === 'hosting' || status === 'joined';
  const collaboratorList = Array.from(collaborators.values());

  const handleUpdateName = (e) => {
    e.preventDefault();
    if (!usernameInput.trim()) return;
    setMyProfile((prev) => ({
      ...prev,
      username: usernameInput.trim(),
    }));
  };

  const handleColorSelect = (color) => {
    setMyProfile((prev) => ({
      ...prev,
      color,
    }));
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
    // Support pasting full URL
    try {
      if (target.includes('room=')) {
        const parsed = new URL(target);
        target = parsed.searchParams.get('room') || target;
      }
    } catch {}
    joinSession(target);
  };

  const handleSendChat = (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    sendChatMessage(chatInput.trim(), false);
    setChatInput('');
  };

  const handleSendReaction = (emoji) => {
    sendChatMessage(emoji, true);
  };

  const COLLAB_COLORS = [
    { background: '#ef4444', stroke: '#dc2626', name: 'Coral Red' },
    { background: '#3b82f6', stroke: '#2563eb', name: 'Azure Blue' },
    { background: '#10b981', stroke: '#059669', name: 'Emerald' },
    { background: '#f59e0b', stroke: '#d97706', name: 'Amber Glow' },
    { background: '#8b5cf6', stroke: '#7c3aed', name: 'Purple Neon' },
    { background: '#ec4899', stroke: '#db2777', name: 'Rose Pink' },
    { background: '#06b6d4', stroke: '#0891b2', name: 'Cyan Wave' },
    { background: '#84cc16', stroke: '#65a30d', name: 'Lime Zest' },
  ];

  const isLightTheme = theme === 'light';
  const T = isLightTheme
    ? {
        bg: '#ffffff',
        bgSubtle: '#f8fafc',
        border: 'rgba(0, 0, 0, 0.09)',
        borderSubtle: 'rgba(0, 0, 0, 0.06)',
        text: '#0f172a',
        textSecondary: '#334155',
        textMuted: '#64748b',
        textDim: '#94a3b8',
        inputBg: '#f1f5f9',
        inputBorder: 'rgba(0, 0, 0, 0.12)',
        cardBg: '#f8fafc',
        cardBorder: 'rgba(0, 0, 0, 0.08)',
        btnBg: '#f1f5f9',
        btnBorder: 'rgba(0, 0, 0, 0.1)',
        btnText: '#1e293b',
        primaryBtnBg: '#6366f1',
        primaryBtnHover: '#4f46e5',
        shadow: '0 25px 60px -15px rgba(0, 0, 0, 0.18), 0 0 35px rgba(99, 102, 241, 0.08)',
      }
    : {
        bg: '#18181b',
        bgSubtle: 'rgba(0, 0, 0, 0.2)',
        border: 'rgba(255, 255, 255, 0.12)',
        borderSubtle: 'rgba(255, 255, 255, 0.08)',
        text: '#f4f4f5',
        textSecondary: '#a1a1aa',
        textMuted: '#71717a',
        textDim: '#52525b',
        inputBg: 'rgba(0, 0, 0, 0.3)',
        inputBorder: 'rgba(255, 255, 255, 0.12)',
        cardBg: 'rgba(255, 255, 255, 0.03)',
        cardBorder: 'rgba(255, 255, 255, 0.07)',
        btnBg: 'rgba(255, 255, 255, 0.08)',
        btnBorder: 'rgba(255, 255, 255, 0.1)',
        btnText: '#e4e4e7',
        primaryBtnBg: 'rgba(255, 255, 255, 0.1)',
        primaryBtnHover: 'rgba(255, 255, 255, 0.18)',
        shadow: '0 25px 60px -15px rgba(0, 0, 0, 0.8), 0 0 40px rgba(99, 102, 241, 0.1)',
      };

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(8px)',
        padding: '16px',
        animation: 'fadeIn 0.2s ease-out',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: isConnected ? '740px' : '560px',
          maxHeight: '90vh',
          backgroundColor: T.bg,
          border: '1px solid ' + T.border,
          borderRadius: '20px',
          boxShadow: T.shadow,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          color: T.text,
          fontFamily: 'system-ui, -apple-system, sans-serif',
          transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid ' + T.borderSubtle,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: isLightTheme ? 'linear-gradient(180deg, rgba(0,0,0,0.01) 0%, transparent 100%)' : 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, transparent 100%)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                backgroundColor: isConnected ? 'rgba(52, 211, 153, 0.12)' : (isLightTheme ? '#f1f5f9' : 'rgba(255, 255, 255, 0.06)'),
                border: `1px solid ${isConnected ? 'rgba(52, 211, 153, 0.25)' : (isLightTheme ? 'rgba(0,0,0,0.1)' : 'rgba(255, 255, 255, 0.1)')}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: isConnected ? '#34d399' : (isLightTheme ? '#0f172a' : '#e4e4e7'),
              }}
            >
              <Radio size={22} className={isConnected ? 'animate-pulse' : ''} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600, letterSpacing: '-0.01em', color: T.text }}>
                  Live Collaboration
                </h2>
                {isConnected ? (
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      padding: '2px 8px',
                      borderRadius: '999px',
                      backgroundColor: 'rgba(16, 185, 129, 0.2)',
                      color: '#34d399',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <span
                      style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        backgroundColor: '#10b981',
                        display: 'inline-block',
                      }}
                    />
                    {status === 'hosting' ? 'HOSTING LIVE' : 'CONNECTED'}
                  </span>
                ) : (
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 500,
                      padding: '2px 8px',
                      borderRadius: '999px',
                      backgroundColor: 'rgba(255, 255, 255, 0.06)',
                      color: '#a1a1aa',
                    }}
                  >
                    Offline / Standalone
                  </span>
                )}
              </div>
              <p style={{ margin: '3px 0 0', fontSize: '12px', color: '#a1a1aa' }}>
                {isConnected
                  ? 'Real-time multi-user drawing with synced pointers & chat'
                  : 'Draw together with peers or collaborate across multiple browser tabs'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close Live Collab"
            style={{
              background: 'none',
              border: 'none',
              color: '#a1a1aa',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background-color 0.15s, color 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
              e.currentTarget.style.color = '#fff';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = '#a1a1aa';
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {connectionError && (
            <div role="alert" style={{ padding: '10px 12px', borderRadius: '10px', border: '1px solid rgba(248, 113, 113, 0.3)', background: 'rgba(248, 113, 113, 0.1)', color: '#fca5a5', fontSize: '12px', lineHeight: 1.45 }}>
              {connectionError}
            </div>
          )}
          {/* User Profile Bar */}
          <div
            style={{
              padding: '14px 16px',
              backgroundColor: T.cardBg,
              borderRadius: '14px',
              border: '1px solid ' + T.cardBorder,
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: T.textSecondary, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Your Collaborator Profile
              </span>
              <span style={{ fontSize: '11px', color: T.textMuted }}>Visible to others on canvas</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  backgroundColor: myProfile?.color?.background || '#3b82f6',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: '14px',
                  boxShadow: `0 4px 12px ${myProfile?.color?.background || '#3b82f6'}40`,
                  flexShrink: 0,
                }}
              >
                {usernameInput ? usernameInput.slice(0, 2).toUpperCase() : 'ME'}
              </div>

              <form onSubmit={handleUpdateName} style={{ display: 'flex', gap: '8px', flex: 1, minWidth: '200px' }}>
                <input
                  type="text"
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  onBlur={handleUpdateName}
                  placeholder="Enter your name..."
                  style={{
                    flex: 1,
                    backgroundColor: T.inputBg,
                    border: '1px solid ' + T.inputBorder,
                    borderRadius: '8px',
                    padding: '8px 12px',
                    fontSize: '13px',
                    color: T.text,
                    outline: 'none',
                  }}
                />
                <button
                  type="submit"
                  style={{
                    backgroundColor: T.btnBg,
                    border: '1px solid ' + T.btnBorder,
                    borderRadius: '8px',
                    padding: '0 12px',
                    fontSize: '12px',
                    fontWeight: 500,
                    color: T.btnText,
                    cursor: 'pointer',
                  }}
                >
                  Save
                </button>
              </form>

              {/* Color swatch selector */}
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                {COLLAB_COLORS.map((col, idx) => {
                  const isSelected = myProfile?.color?.background === col.background;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleColorSelect(col)}
                      title={col.name}
                      style={{
                        width: '22px',
                        height: '22px',
                        borderRadius: '50%',
                        backgroundColor: col.background,
                        border: isSelected ? (isLightTheme ? '2px solid #0f172a' : '2px solid #ffffff') : '2px solid transparent',
                        transform: isSelected ? 'scale(1.2)' : 'scale(1)',
                        cursor: 'pointer',
                        padding: 0,
                        transition: 'transform 0.15s',
                        boxShadow: isSelected ? `0 0 10px ${col.background}` : 'none',
                      }}
                    />
                  );
                })}
              </div>
            </div>
          </div>

          {!isConnected ? (
            /* Disconnected View: Host or Join */
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
              {/* Host Card */}
              <div
                style={{
                  padding: '20px',
                  backgroundColor: isLightTheme ? '#f8fafc' : 'rgba(99, 102, 241, 0.05)',
                  borderRadius: '16px',
                  border: '1px solid ' + (isLightTheme ? 'rgba(99, 102, 241, 0.25)' : 'rgba(99, 102, 241, 0.2)'),
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div
                    style={{
                      display: 'inline-flex',
                      padding: '6px',
                      borderRadius: '10px',
                      backgroundColor: isLightTheme ? '#f1f5f9' : 'rgba(255, 255, 255, 0.06)',
                      border: '1px solid ' + (isLightTheme ? 'rgba(0,0,0,0.08)' : 'rgba(255, 255, 255, 0.1)'),
                      color: isLightTheme ? '#4f46e5' : '#d4d4d8',
                      marginBottom: '8px',
                    }}
                  >
                    <Sparkles size={20} />
                  </div>
                  <h3 style={{ margin: '0 0 6px', fontSize: '16px', fontWeight: 600, color: T.text }}>Host a Live Room</h3>
                  <p style={{ margin: 0, fontSize: '13px', color: T.textMuted, lineHeight: 1.45 }}>
                    Generate an instant peer-to-peer room. Share your room code or link with collaborators to draw in sync.
                  </p>
                </div>

                <button
                  onClick={() => startHosting()}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    backgroundColor: isLightTheme ? '#6366f1' : 'rgba(255, 255, 255, 0.1)',
                    color: '#ffffff',
                    border: '1px solid ' + (isLightTheme ? '#4f46e5' : 'rgba(255, 255, 255, 0.18)'),
                    borderRadius: '10px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    boxShadow: isLightTheme ? '0 2px 6px rgba(99, 102, 241, 0.25)' : '0 2px 8px rgba(0, 0, 0, 0.35)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <Wifi size={16} />
                  Create Live Room
                </button>
              </div>

              {/* Join Card */}
              <div
                style={{
                  padding: '20px',
                  backgroundColor: T.cardBg,
                  borderRadius: '16px',
                  border: '1px solid ' + T.cardBorder,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div
                    style={{
                      display: 'inline-flex',
                      padding: '6px',
                      borderRadius: '10px',
                      backgroundColor: isLightTheme ? '#f1f5f9' : 'rgba(255, 255, 255, 0.08)',
                      color: isLightTheme ? '#0f172a' : '#e4e4e7',
                      marginBottom: '8px',
                    }}
                  >
                    <Users size={20} />
                  </div>
                  <h3 style={{ margin: '0 0 6px', fontSize: '16px', fontWeight: 600, color: T.text }}>Join Existing Room</h3>
                  <p style={{ margin: 0, fontSize: '13px', color: T.textMuted, lineHeight: 1.45 }}>
                    Enter a room code or paste an invite URL to connect to an ongoing collaborative board session.
                  </p>
                </div>

                <form onSubmit={handleJoin} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <input
                    type="text"
                    value={inputRoomId}
                    onChange={(e) => setInputRoomId(e.target.value)}
                    placeholder="e.g. room-k8s9f2 or paste link"
                    style={{
                      backgroundColor: T.inputBg,
                      border: '1px solid ' + T.inputBorder,
                      borderRadius: '10px',
                      padding: '10px 12px',
                      fontSize: '13px',
                      color: T.text,
                      outline: 'none',
                    }}
                  />
                  <button
                    type="submit"
                    disabled={!inputRoomId.trim()}
                    style={{
                      padding: '10px 16px',
                      backgroundColor: inputRoomId.trim() ? (isLightTheme ? '#6366f1' : '#27272a') : (isLightTheme ? '#e2e8f0' : 'rgba(255, 255, 255, 0.04)'),
                      color: inputRoomId.trim() ? '#fff' : (isLightTheme ? '#94a3b8' : '#71717a'),
                      border: '1px solid ' + (isLightTheme ? 'transparent' : 'rgba(255, 255, 255, 0.1)'),
                      borderRadius: '10px',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: inputRoomId.trim() ? 'pointer' : 'not-allowed',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                    }}
                  >
                    Join Room
                    <ArrowRight size={16} />
                  </button>
                </form>
              </div>
            </div>
          ) : (
            /* Connected View: Room Info, Collaborators, Live Chat */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Room Share Pill */}
              <div
                style={{
                  padding: '16px',
                  backgroundColor: isLightTheme ? '#f8fafc' : 'rgba(16, 185, 129, 0.05)',
                  borderRadius: '14px',
                  border: '1px solid ' + (isLightTheme ? 'rgba(0, 0, 0, 0.08)' : 'rgba(16, 185, 129, 0.2)'),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '12px',
                }}
              >
                <div>
                  <div style={{ fontSize: '11px', color: '#10b981', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Active Room Code
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: T.text, fontFamily: 'monospace', letterSpacing: '0.04em' }}>
                    {roomId}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={handleCopyCode}
                    style={{
                      padding: '8px 12px',
                      backgroundColor: T.btnBg,
                      border: '1px solid ' + T.btnBorder,
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: 500,
                      color: T.btnText,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    {copiedCode ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                    {copiedCode ? 'Copied Code!' : 'Copy Code'}
                  </button>

                  <button
                    onClick={handleCopyLink}
                    style={{
                      padding: '8px 12px',
                      backgroundColor: isLightTheme ? 'rgba(16, 185, 129, 0.12)' : 'rgba(16, 185, 129, 0.15)',
                      border: '1px solid ' + (isLightTheme ? 'rgba(16, 185, 129, 0.3)' : 'rgba(16, 185, 129, 0.3)'),
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: isLightTheme ? '#059669' : '#34d399',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    {copiedLink ? <Check size={14} /> : <Share2 size={14} />}
                    {copiedLink ? 'Copied Link!' : 'Copy Link'}
                  </button>
                </div>
              </div>

              {/* Two Column Layout: Connected Peers & Live Chat */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                {/* Left: Collaborators List */}
                <div
                  style={{
                    backgroundColor: T.cardBg,
                    borderRadius: '14px',
                    border: '1px solid ' + T.cardBorder,
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Users size={16} color={T.textMuted} />
                      <span style={{ fontSize: '13px', fontWeight: 600, color: T.text }}>Active Members</span>
                    </div>
                    <span style={{ fontSize: '11px', color: T.textMuted }}>
                      {collaboratorList.length + 1} online
                    </span>
                  </div>

                  {/* List */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto' }}>
                    {/* Self */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 10px',
                        backgroundColor: isLightTheme ? '#ffffff' : 'rgba(255, 255, 255, 0.04)',
                        border: '1px solid ' + (isLightTheme ? '#e2e8f0' : 'transparent'),
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div
                          style={{
                            width: '10px',
                            height: '10px',
                            borderRadius: '50%',
                            backgroundColor: myProfile?.color?.background || '#3b82f6',
                          }}
                        />
                        <span style={{ fontWeight: 600, color: T.text }}>{myProfile?.username || 'You'}</span>
                        <span style={{ fontSize: '10px', color: T.textMuted }}>(You)</span>
                      </div>
                      <span style={{ fontSize: '10px', color: '#10b981', fontWeight: 500 }}>Active</span>
                    </div>

                    {/* Remote collaborators */}
                    {collaboratorList.map((collab) => (
                      <div
                        key={collab.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '8px 10px',
                          backgroundColor: isLightTheme ? '#ffffff' : 'rgba(255, 255, 255, 0.02)',
                          border: '1px solid ' + (isLightTheme ? '#e2e8f0' : 'transparent'),
                          borderRadius: '8px',
                          fontSize: '12px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div
                            style={{
                              width: '10px',
                              height: '10px',
                              borderRadius: '50%',
                              backgroundColor: collab.color?.background || '#8b5cf6',
                            }}
                          />
                          <span style={{ color: T.text }}>{collab.username || 'Peer'}</span>
                        </div>
                        {collab.pointer && onFollowCollaborator && (
                          <button
                            onClick={() => onFollowCollaborator(collab)}
                            title="Follow view"
                            style={{
                              background: 'none',
                              border: 'none',
                              color: T.textMuted,
                              cursor: 'pointer',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <Eye size={12} />
                            Follow
                          </button>
                        )}
                      </div>
                    ))}

                    {collaboratorList.length === 0 && (
                      <div
                        style={{
                          padding: '16px',
                          textAlign: 'center',
                          color: T.textMuted,
                          fontSize: '12px',
                          border: '1px dashed ' + (isLightTheme ? 'rgba(0,0,0,0.12)' : 'rgba(255, 255, 255, 0.08)'),
                          borderRadius: '8px',
                        }}
                      >
                        Waiting for peers to join... Share your Room Code or Invite Link!
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: Live Room Chat & Reaction Pad */}
                <div
                  style={{
                    backgroundColor: T.cardBg,
                    borderRadius: '14px',
                    border: '1px solid ' + T.cardBorder,
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <MessageSquare size={16} color={isLightTheme ? '#059669' : '#34d399'} />
                      <span style={{ fontSize: '13px', fontWeight: 600, color: T.text }}>Room Feed & Reactions</span>
                    </div>
                  </div>

                  {/* Chat message display */}
                  <div
                    style={{
                      height: '130px',
                      overflowY: 'auto',
                      backgroundColor: isLightTheme ? '#ffffff' : 'rgba(0, 0, 0, 0.25)',
                      border: '1px solid ' + (isLightTheme ? '#e2e8f0' : 'transparent'),
                      borderRadius: '8px',
                      padding: '8px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                      fontSize: '12px',
                    }}
                  >
                    {chatMessages.length === 0 ? (
                      <div style={{ margin: 'auto', color: T.textMuted, fontSize: '11px' }}>
                        No messages yet. Send a quick reaction!
                      </div>
                    ) : (
                      chatMessages.map((msg) => (
                        <div
                          key={msg.id}
                          style={{
                            display: 'flex',
                            gap: '6px',
                            alignItems: 'baseline',
                            lineHeight: 1.3,
                          }}
                        >
                          <span
                            style={{
                              color: msg.color?.background || T.textMuted,
                              fontWeight: 600,
                              fontSize: '11px',
                            }}
                          >
                            {msg.senderName}:
                          </span>
                          <span
                            style={{
                              color: msg.isReaction ? (isLightTheme ? '#b45309' : '#fef08a') : T.text,
                              fontSize: msg.isReaction ? '15px' : '12px',
                            }}
                          >
                            {msg.text}
                          </span>
                        </div>
                      ))
                    )}
                    <div ref={chatBottomRef} />
                  </div>

                  {/* Quick Reactions Bar */}
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                    {QUICK_REACTIONS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => handleSendReaction(emoji)}
                        style={{
                          background: isLightTheme ? '#ffffff' : 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid ' + (isLightTheme ? '#e2e8f0' : 'transparent'),
                          borderRadius: '6px',
                          padding: '3px 7px',
                          fontSize: '14px',
                          cursor: 'pointer',
                          transition: 'transform 0.1s',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'scale(1.25)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'scale(1)';
                        }}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>

                  {/* Chat input */}
                  <form onSubmit={handleSendChat} style={{ display: 'flex', gap: '6px' }}>
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder="Type a message..."
                      style={{
                        flex: 1,
                        backgroundColor: T.inputBg,
                        border: '1px solid ' + T.inputBorder,
                        borderRadius: '6px',
                        padding: '6px 10px',
                        fontSize: '12px',
                        color: T.text,
                        outline: 'none',
                      }}
                    />
                    <button
                      type="submit"
                      disabled={!chatInput.trim()}
                      style={{
                        backgroundColor: isLightTheme ? '#6366f1' : '#3b82f6',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '0 10px',
                        color: '#fff',
                        cursor: chatInput.trim() ? 'pointer' : 'not-allowed',
                        opacity: chatInput.trim() ? 1 : 0.5,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Send size={12} />
                    </button>
                  </form>
                </div>
              </div>

              {/* Leave Session Button */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '8px' }}>
                <button
                  onClick={leaveSession}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: isLightTheme ? '#fee2e2' : 'rgba(239, 68, 68, 0.12)',
                    border: '1px solid ' + (isLightTheme ? '#fca5a5' : 'rgba(239, 68, 68, 0.25)'),
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#ef4444',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <LogOut size={14} />
                  Leave Collaboration Room
                </button>
              </div>
            </div>
          )}

          {/* Peer-to-Peer Security & Architecture Callout */}
          <div
            style={{
              padding: '12px 14px',
              backgroundColor: 'rgba(255, 255, 255, 0.02)',
              borderRadius: '10px',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontSize: '12px',
              color: '#71717a',
            }}
          >
            <ShieldCheck size={16} color="#10b981" style={{ flexShrink: 0 }} />
            <span>
              Direct Peer-to-Peer WebRTC mesh. Shapes, pointer streams, and messages stay between connected browsers without third-party canvas storage.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
