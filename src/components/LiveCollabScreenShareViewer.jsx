import React, { useState, useRef, useEffect } from 'react';
import {
  Monitor,
  Maximize2,
  Minimize2,
  Camera,
  X,
  Sliders,
  Move,
  Pin,
  Check,
  Sparkles,
} from 'lucide-react';

/**
 * LiveCollabScreenShareViewer
 * Floating, resizable studio PiP HUD for viewing a peer's live screen share during collaboration.
 * Supports taking snapshots directly to canvas shapes and translucent annotation mode.
 */
export default function LiveCollabScreenShareViewer({
  remoteStreams = new Map(),
  localStream = null,
  isSharingLocal = false,
  onStopSharingLocal,
  onCaptureSnapshotToCanvas,
  className = '',
}) {
  const [activePeerId, setActivePeerId] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [opacity, setOpacity] = useState(1);
  const [position, setPosition] = useState({ x: 32, y: 80 });
  const [size, setSize] = useState({ width: 560, height: 350 });
  const [snapshotSuccess, setSnapshotSuccess] = useState(false);

  const videoRef = useRef(null);
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  const streamEntries = Array.from(remoteStreams.entries());

  // Automatically select the first available remote stream, or fallback to local preview
  useEffect(() => {
    const remoteKeys = Array.from(remoteStreams.keys());
    if (remoteKeys.length > 0) {
      if (!activePeerId || !remoteStreams.has(activePeerId)) {
        setActivePeerId(remoteKeys[0]);
      }
    } else if (isSharingLocal) {
      setActivePeerId('local');
    } else {
      setActivePeerId(null);
    }
  }, [remoteStreams, isSharingLocal, activePeerId]);

  // Bind video element srcObject and initiate playback
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    let targetStream = null;
    if (activePeerId === 'local' && localStream) {
      targetStream = localStream;
    } else if (activePeerId && remoteStreams.has(activePeerId)) {
      targetStream = remoteStreams.get(activePeerId).stream;
    }

    if (video.srcObject !== targetStream) {
      video.srcObject = targetStream;
      if (targetStream) {
        const playPromise = video.play();
        if (playPromise !== undefined) {
          playPromise.catch(() => {
            if (videoRef.current) {
              videoRef.current.muted = true;
              videoRef.current.play().catch(() => {});
            }
          });
        }
      }
    }
  }, [activePeerId, localStream, remoteStreams]);

  if (!activePeerId && !isSharingLocal && streamEntries.length === 0) {
    return null;
  }

  const activeEntry = activePeerId === 'local'
    ? { senderName: 'Your Screen (Preview)', stream: localStream }
    : remoteStreams.get(activePeerId);

  const presenterName = activeEntry?.senderName || 'Collaborator';

  // Handle Dragging
  const handleMouseDown = (e) => {
    if (isFullscreen) return;
    isDraggingRef.current = true;
    dragStartRef.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };

    const handleMouseMove = (moveEvent) => {
      if (!isDraggingRef.current) return;
      setPosition({
        x: Math.max(10, Math.min(window.innerWidth - 300, moveEvent.clientX - dragStartRef.current.x)),
        y: Math.max(10, Math.min(window.innerHeight - 200, moveEvent.clientY - dragStartRef.current.y)),
      });
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  // Capture current frame to canvas as an image shape
  const handleTakeSnapshot = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) return;

    try {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/png');

      onCaptureSnapshotToCanvas?.(dataUrl, canvas.width, canvas.height, presenterName);
      setSnapshotSuccess(true);
      setTimeout(() => setSnapshotSuccess(false), 2000);
    } catch (err) {
      console.warn('Failed to snapshot video frame:', err);
    }
  };

  return (
    <aside
      aria-label="Screen Share Viewer"
      className={`fixed z-[99990] transition-shadow duration-200 select-none ${className}`}
      style={
        isFullscreen
          ? { inset: 0, width: '100vw', height: '100vh' }
          : isMinimized
          ? { bottom: 20, left: 24, width: 280 }
          : {
              left: position.x,
              top: position.y,
              width: size.width,
              height: size.height,
              opacity: opacity,
            }
      }
    >
      <div className="w-full h-full flex flex-col bg-[#141519]/95 backdrop-blur-md border border-[#27272a] shadow-2xl rounded-2xl overflow-hidden ring-1 ring-white/10 text-zinc-100">
        {/* Header Bar */}
        <header
          onMouseDown={handleMouseDown}
          className="flex items-center justify-between px-3.5 py-2.5 bg-[#18191f] border-b border-[#27272a] cursor-move select-none"
        >
          <div className="flex items-center gap-2 min-w-0">
            <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
            </span>

            <div className="flex items-center gap-1.5 min-w-0">
              <Monitor className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
              <span className="text-xs font-semibold tracking-wide text-zinc-200 truncate">
                {presenterName}
              </span>
            </div>

            {streamEntries.length > 1 && (
              <select
                value={activePeerId || ''}
                onChange={(e) => setActivePeerId(e.target.value)}
                className="text-[10px] bg-zinc-800 text-zinc-300 border border-zinc-700 rounded px-1.5 py-0.5"
              >
                {streamEntries.map(([peerId, entry]) => (
                  <option key={peerId} value={peerId}>
                    {entry.senderName || 'Peer'}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="flex items-center gap-1">
            {/* Opacity control button */}
            {!isMinimized && !isFullscreen && (
              <button
                type="button"
                onClick={() => setOpacity((prev) => (prev === 1 ? 0.65 : prev === 0.65 ? 0.35 : 1))}
                className="p-1 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/80 rounded transition-colors text-[10px] font-mono"
                title="Toggle Translucent View (Draw directly over screen)"
                aria-label="Toggle Translucent View"
              >
                {Math.round(opacity * 100)}%
              </button>
            )}

            {/* Snapshot to Canvas button */}
            <button
              type="button"
              onClick={handleTakeSnapshot}
              className={`p-1.5 rounded-lg text-xs transition-colors flex items-center gap-1 ${
                snapshotSuccess
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'text-zinc-300 hover:text-white hover:bg-zinc-800/80'
              }`}
              title="Snapshot frame directly into canvas diagram to annotate"
              aria-label="Snapshot frame to canvas"
            >
              {snapshotSuccess ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Camera className="w-3.5 h-3.5" />}
              <span className="text-[10px] font-medium hidden sm:inline">
                {snapshotSuccess ? 'Stamped!' : 'Stamp to Canvas'}
              </span>
            </button>

            {/* Minimize / Expand Toggle */}
            {!isFullscreen && (
              <button
                type="button"
                onClick={() => setIsMinimized((prev) => !prev)}
                className="p-1 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/80 rounded transition-colors"
                title={isMinimized ? 'Expand Screen Window' : 'Minimize to PiP Capsule'}
                aria-label={isMinimized ? 'Expand Screen Window' : 'Minimize to PiP'}
              >
                <Minimize2 className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Fullscreen Toggle */}
            <button
              type="button"
              onClick={() => {
                setIsFullscreen((prev) => !prev);
                setIsMinimized(false);
              }}
              className="p-1 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/80 rounded transition-colors"
              title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
              aria-label={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>

            {/* Stop local sharing or close view */}
            {activePeerId === 'local' && isSharingLocal ? (
              <button
                type="button"
                onClick={onStopSharingLocal}
                className="px-2 py-0.5 rounded bg-red-600/80 hover:bg-red-600 text-white text-[10px] font-semibold transition-colors ml-1"
                title="Stop Sharing Your Screen"
                aria-label="Stop Sharing Your Screen"
              >
                Stop Sharing
              </button>
            ) : null}
          </div>
        </header>

        {/* Video Viewport */}
        {!isMinimized && (
          <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden min-h-0">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted={activePeerId === 'local'}
              className="w-full h-full object-contain"
            />

            {/* Floating Annotation Guidance Pill */}
            <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between pointer-events-none">
              <span className="text-[10px] px-2 py-0.5 rounded bg-black/60 backdrop-blur-md text-zinc-300 border border-white/10 pointer-events-auto">
                🎨 Draw shapes, arrows & notes anywhere on the canvas while viewing
              </span>

              <button
                type="button"
                onClick={handleTakeSnapshot}
                className="text-[10px] px-2 py-0.5 rounded bg-emerald-600/80 hover:bg-emerald-600 text-white font-medium border border-emerald-500/50 pointer-events-auto shadow-md transition-colors"
                title="Capture this frame onto the canvas"
              >
                📸 Draw On This Frame
              </button>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
