import React, { useState, useEffect, useRef } from 'react';
import {
  CloudRain,
  Waves,
  Coffee,
  Radio,
  Volume2,
  VolumeX,
  Play,
  Pause,
  RotateCcw,
  Timer,
  X,
  Headphones,
  GripHorizontal,
} from 'lucide-react';
import { ambientAudio } from '../utils/ambientAudioEngine';

const SOUND_TRACKS = [
  { id: 'rain', name: 'Gentle Rain', desc: 'Raindrops & soft rumble', icon: CloudRain },
  { id: 'ocean', name: 'Ocean Waves', desc: 'Rhythmic tidal surge', icon: Waves },
  { id: 'coffee', name: 'Coffee Shop', desc: 'Warm cafe ambiance', icon: Coffee },
  { id: 'brown', name: 'Brown Noise', desc: 'Deep warm relaxation', icon: Radio },
];

export function AmbientSoundStudio({
  isOpen,
  onClose,
  theme = 'dark',
  pomodoroState,
  onPomodoroTick,
}) {
  const isDark = theme !== 'light';
  const [activeTrack, setActiveTrack] = useState(ambientAudio.getTrack());
  const [volume, setVolume] = useState(ambientAudio.getVolume());
  const [isMuted, setIsMuted] = useState(false);
  const [customPos, setCustomPos] = useState(null); // { x: number, y: number }
  const [isDragging, setIsDragging] = useState(false);
  const cardRef = useRef(null);

  // Synchronize with ambientAudio engine
  useEffect(() => {
    setActiveTrack(ambientAudio.getTrack());
  }, [isOpen]);

  // Handle Escape key to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [isOpen, onClose]);

  // Dragging logic for the floating studio widget
  const handleMouseDown = (e) => {
    // Only allow dragging when clicking the header area (not close button or interactive controls)
    if (e.target.closest('button')) return;
    e.preventDefault();
    setIsDragging(true);

    const startX = e.clientX;
    const startY = e.clientY;
    const currentRect = cardRef.current?.getBoundingClientRect();
    const currentLeft = currentRect ? currentRect.left : (window.innerWidth - 320 - 68);
    const currentTop = currentRect ? currentRect.top : (window.innerHeight - 380 - 56);

    const onMouseMove = (moveEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;

      const nextX = Math.max(16, Math.min(window.innerWidth - 336, currentLeft + deltaX));
      const nextY = Math.max(44, Math.min(window.innerHeight - 340, currentTop + deltaY));

      setCustomPos({ x: nextX, y: nextY });
    };

    const onMouseUp = () => {
      setIsDragging(false);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  if (!isOpen) return null;

  const handleSelectTrack = (trackId) => {
    if (activeTrack === trackId) {
      ambientAudio.stop();
      setActiveTrack(null);
    } else {
      ambientAudio.play(trackId);
      setActiveTrack(trackId);
    }
  };

  const handleVolumeChange = (e) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (isMuted) setIsMuted(false);
    ambientAudio.setVolume(val);
  };

  const handleToggleMute = () => {
    if (isMuted) {
      setIsMuted(false);
      ambientAudio.setVolume(volume || 0.5);
    } else {
      setIsMuted(true);
      ambientAudio.setVolume(0);
    }
  };

  // Position: either dragged coordinates or default to bottom: 56px, right: 68px
  // right: 68px ensures it completely avoids covering the right buttons (help ?, minimap, layers, smart components)
  const positionStyles = customPos
    ? {
        position: 'fixed',
        left: `${customPos.x}px`,
        top: `${customPos.y}px`,
      }
    : {
        position: 'fixed',
        bottom: '56px',
        right: '68px',
      };

  return (
    <div
      ref={cardRef}
      className="ambient-sound-studio-floating"
      style={{
        ...positionStyles,
        zIndex: 9999,
        width: '320px',
        background: isDark ? 'rgba(20, 20, 24, 0.96)' : 'rgba(255, 255, 255, 0.97)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: isDark ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid rgba(0, 0, 0, 0.1)',
        borderRadius: '14px',
        boxShadow: isDark
          ? '0 16px 48px rgba(0, 0, 0, 0.75), 0 0 0 1px rgba(255, 255, 255, 0.05)'
          : '0 16px 48px rgba(0, 0, 0, 0.14), 0 0 0 1px rgba(0, 0, 0, 0.04)',
        overflow: 'hidden',
        color: isDark ? '#f4f4f5' : '#18181b',
        animation: customPos ? 'none' : 'slideUp 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
        userSelect: 'none',
        transition: isDragging ? 'none' : 'box-shadow 0.15s ease',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Draggable Header matching Doodle Desk UI */}
      <div
        onMouseDown={handleMouseDown}
        style={{
          padding: '11px 14px',
          borderBottom: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(0, 0, 0, 0.07)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)',
          cursor: isDragging ? 'grabbing' : 'grab',
        }}
        title="Click and drag to reposition anywhere"
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '26px',
              height: '26px',
              borderRadius: '7px',
              background: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
              border: isDark ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid rgba(0, 0, 0, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: isDark ? '#ffffff' : '#18181b',
            }}
          >
            <Headphones size={14} />
          </div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 600 }}>Focus & Soundscapes</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <div
            style={{
              color: isDark ? '#52525b' : '#a1a1aa',
              display: 'flex',
              alignItems: 'center',
              padding: '2px 4px',
            }}
            title="Drag handle"
          >
            <GripHorizontal size={14} />
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              padding: '4px',
              color: isDark ? '#71717a' : '#a1a1aa',
              cursor: 'pointer',
              borderRadius: '5px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'color 0.15s ease',
            }}
            title="Close (Esc)"
            aria-label="Close soundscapes studio"
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {/* Soundscapes Grid */}
      <div style={{ padding: '12px 14px 10px' }}>
        <div
          style={{
            fontSize: '10px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: isDark ? '#a1a1aa' : '#71717a',
            marginBottom: '8px',
          }}
        >
          Ambient Soundscapes
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          {SOUND_TRACKS.map((t) => {
            const Icon = t.icon;
            const isPlaying = activeTrack === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => handleSelectTrack(t.id)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  padding: '10px',
                  borderRadius: '10px',
                  border: isPlaying
                    ? (isDark ? '1.5px solid #ffffff' : '1.5px solid #18181b')
                    : (isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #e4e4e7'),
                  background: isPlaying
                    ? (isDark ? 'rgba(255, 255, 255, 0.08)' : '#f1f5f9')
                    : (isDark ? 'rgba(255, 255, 255, 0.02)' : '#fcfcfc'),
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s ease',
                  outline: 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                  <Icon
                    size={16}
                    style={{
                      color: isPlaying
                        ? (isDark ? '#ffffff' : '#09090b')
                        : (isDark ? '#a1a1aa' : '#64748b'),
                    }}
                  />
                  {isPlaying && (
                    <span
                      style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        background: isDark ? '#ffffff' : '#09090b',
                        boxShadow: isDark ? '0 0 6px #ffffff' : '0 0 4px rgba(0,0,0,0.4)',
                      }}
                    />
                  )}
                </div>
                <div
                  style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    marginTop: '6px',
                    color: isDark ? '#f4f4f5' : '#18181b',
                  }}
                >
                  {t.name}
                </div>
                <div
                  style={{
                    fontSize: '10px',
                    color: isDark ? '#71717a' : '#8e8e99',
                    marginTop: '2px',
                  }}
                >
                  {t.desc}
                </div>
              </button>
            );
          })}
        </div>

        {/* Volume Slider matching Doodle Desk tokens */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            marginTop: '10px',
            padding: '6px 10px',
            borderRadius: '8px',
            background: isDark ? 'rgba(255, 255, 255, 0.03)' : '#f8fafc',
            border: isDark ? '1px solid rgba(255, 255, 255, 0.06)' : '1px solid #e4e4e7',
          }}
        >
          <button
            type="button"
            onClick={handleToggleMute}
            style={{
              background: 'transparent',
              border: 'none',
              padding: 0,
              color: isDark ? '#a1a1aa' : '#71717a',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
            }}
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted || volume === 0 ? <VolumeX size={14} /> : <Volume2 size={14} />}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={isMuted ? 0 : volume}
            onChange={handleVolumeChange}
            style={{
              flex: 1,
              accentColor: isDark ? '#ffffff' : '#18181b',
              height: '4px',
              cursor: 'pointer',
            }}
          />
          <span
            style={{
              fontSize: '11px',
              fontWeight: 600,
              color: isDark ? '#a1a1aa' : '#71717a',
              minWidth: '28px',
              textAlign: 'right',
            }}
          >
            {isMuted ? '0%' : `${Math.round(volume * 100)}%`}
          </span>
        </div>
      </div>

      {/* Pomodoro Timer Dock matching Doodle Desk island */}
      <div
        style={{
          margin: '4px 10px 12px',
          padding: '10px 12px',
          borderRadius: '10px',
          background: isDark ? 'rgba(255, 255, 255, 0.04)' : '#f4f4f5',
          border: isDark ? '1px solid rgba(255, 255, 255, 0.06)' : '1px solid rgba(0, 0, 0, 0.06)',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Timer
              size={14}
              style={{
                color: pomodoroState?.isRunning
                  ? (isDark ? '#f87171' : '#dc2626')
                  : (isDark ? '#a1a1aa' : '#71717a'),
              }}
            />
            <span style={{ fontSize: '12px', fontWeight: 600, color: isDark ? '#f4f4f5' : '#18181b' }}>
              {pomodoroState?.mode === 'break' ? 'Break Interval' : 'Focus Session'}
            </span>
          </div>
          <span
            style={{
              fontSize: '15px',
              fontWeight: 700,
              fontFamily: 'monospace',
              color: pomodoroState?.isRunning
                ? (isDark ? '#f87171' : '#dc2626')
                : (isDark ? '#f4f4f5' : '#18181b'),
            }}
          >
            {pomodoroState?.formattedTime || '25:00'}
          </span>
        </div>

        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            type="button"
            onClick={() => onPomodoroTick?.('toggle')}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '6px 10px',
              borderRadius: '7px',
              background: pomodoroState?.isRunning
                ? (isDark ? '#dc2626' : '#ef4444')
                : (isDark ? '#ffffff' : '#18181b'),
              color: pomodoroState?.isRunning
                ? '#ffffff'
                : (isDark ? '#09090b' : '#ffffff'),
              border: 'none',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'opacity 0.15s ease',
            }}
          >
            {pomodoroState?.isRunning ? <Pause size={12} /> : <Play size={12} />}
            <span>{pomodoroState?.isRunning ? 'Pause' : 'Start Focus'}</span>
          </button>
          <button
            type="button"
            onClick={() => onPomodoroTick?.('reset')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '6px 10px',
              borderRadius: '7px',
              background: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
              color: isDark ? '#d4d4d8' : '#3f3f46',
              border: 'none',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
            title="Reset timer to 25 mins"
          >
            <RotateCcw size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}
