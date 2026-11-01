import React, { useState } from 'react';
import {
  Mic,
  MicOff,
  Headphones,
  VolumeX,
  PhoneOff,
  Radio,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  ScreenShare,
  ScreenShareOff
} from 'lucide-react';

/**
 * LiveCollabVoiceWidget
 * A floating, glassmorphism audio capsule for peer-to-peer live voice chat during real-time collaboration.
 */
export default function LiveCollabVoiceWidget({
  voiceState,
  voiceError,
  onToggleMute,
  onToggleDeafen,
  onLeaveVoice,
  collaborators = new Map(),
  isSharingScreen = false,
  onToggleScreenShare,
  className = '',
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  if (!voiceState || !voiceState.inVoice) {
    return null;
  }

  const { isMuted, isDeafened, isSpeaking, remoteSpeakingPeers, activeCallCount } = voiceState;

  // Find names of remote peers who are currently speaking
  const speakingNames = [];
  if (remoteSpeakingPeers && remoteSpeakingPeers.size > 0) {
    collaborators.forEach((collab) => {
      if (collab.inVoice && collab.isVoiceSpeaking) {
        speakingNames.push(collab.username || collab.name || 'Collaborator');
      }
    });
  }

  const participantCount = (activeCallCount || 0) + 1;

  return (
    <aside
      aria-label="Voice Call Controls"
      className={`fixed bottom-14 right-6 z-50 transition-all duration-200 select-none ${className}`}
    >
      <div className="bg-[#141519]/95 backdrop-blur-md border border-[#27272a] shadow-2xl rounded-2xl overflow-hidden min-w-[280px] max-w-[340px] text-zinc-100 ring-1 ring-white/5">
        {/* Header Bar */}
        <header className="flex items-center justify-between px-3.5 py-2.5 bg-[#18191f] border-b border-[#27272a]/80">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <div className="flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-xs font-semibold tracking-wide text-zinc-200">
                Voice Connected
              </span>
            </div>
            <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-zinc-800 text-zinc-400 font-mono">
              {participantCount}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setIsCollapsed((prev) => !prev)}
              className="p-1 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/80 rounded transition-colors"
              title={isCollapsed ? 'Expand Voice Controls' : 'Collapse Voice Controls'}
              aria-label={isCollapsed ? 'Expand Voice Controls' : 'Collapse Voice Controls'}
            >
              {isCollapsed ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </header>

        {/* Collapsed Compact View */}
        {isCollapsed ? (
          <div className="px-3.5 py-2 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span
                className={`text-xs ${
                  isSpeaking ? 'text-emerald-400 font-medium' : isMuted ? 'text-red-400' : 'text-zinc-400'
                }`}
              >
                {isSpeaking ? 'Speaking...' : isMuted ? 'Muted' : 'Connected'}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={onToggleMute}
                className={`p-1.5 rounded-lg text-xs transition-colors ${
                  isMuted ? 'bg-red-500/20 text-red-300 hover:bg-red-500/30' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200'
                }`}
                title={isMuted ? 'Unmute Mic (Alt+M)' : 'Mute Mic (Alt+M)'}
                aria-label={isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
              >
                {isMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
              </button>
              <button
                type="button"
                onClick={onLeaveVoice}
                className="p-1.5 rounded-lg bg-red-600/80 hover:bg-red-600 text-white transition-colors"
                title="Disconnect Call"
                aria-label="Disconnect Voice Call"
              >
                <PhoneOff className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : (
          /* Full Expanded View */
          <div className="p-3.5 space-y-3">
            {/* Status & Equalizer Display */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#0f1013] border border-[#27272a]/70">
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                    isMuted
                      ? 'bg-red-500/10 text-red-400 border border-red-500/30'
                      : isSpeaking
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                      : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                  }`}
                >
                  {isMuted ? (
                    <MicOff className="w-4 h-4" />
                  ) : (
                    <Mic className="w-4 h-4" />
                  )}
                </div>

                <div className="min-w-0">
                  <div className="text-xs font-medium text-zinc-200 truncate">
                    {isMuted
                      ? 'Microphone muted'
                      : isSpeaking
                      ? 'You are speaking'
                      : speakingNames.length > 0
                      ? `${speakingNames[0]} speaking...`
                      : 'Voice ready'}
                  </div>
                  <div className="text-[11px] text-zinc-400">
                    {isDeafened ? 'Audio deafened' : `${participantCount} in live call`}
                  </div>
                </div>
              </div>

              {/* Sound Wave / Activity Equalizer */}
              <div className="flex items-end gap-1 h-5 px-1">
                {[
                  { height: isSpeaking ? 'h-5' : 'h-1.5', delay: 'delay-75' },
                  { height: isSpeaking ? 'h-3.5' : 'h-2', delay: 'delay-150' },
                  { height: isSpeaking ? 'h-4.5' : 'h-1', delay: 'delay-100' },
                  { height: isSpeaking ? 'h-3' : 'h-2.5', delay: 'delay-200' },
                ].map((bar, idx) => (
                  <span
                    key={idx}
                    className={`w-1 rounded-full transition-all duration-150 ${
                      isSpeaking
                        ? 'bg-emerald-400 animate-pulse'
                        : isMuted
                        ? 'bg-zinc-700'
                        : 'bg-zinc-600'
                    } ${bar.height} ${bar.delay}`}
                  />
                ))}
              </div>
            </div>

            {/* Error Message */}
            {voiceError && (
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-red-950/40 border border-red-800/50 text-red-300 text-xs">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 text-red-400" />
                <span className="truncate">{voiceError}</span>
              </div>
            )}

            {/* Controls Button Row */}
            <div className={`grid ${onToggleScreenShare ? 'grid-cols-4' : 'grid-cols-3'} gap-2`}>
              {/* Mic Mute Button */}
              <button
                type="button"
                onClick={onToggleMute}
                className={`flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-xl text-xs font-medium border transition-all ${
                  isMuted
                    ? 'bg-red-500/15 border-red-500/40 text-red-300 hover:bg-red-500/25'
                    : 'bg-zinc-800/80 border-zinc-700/80 text-zinc-200 hover:bg-zinc-700/80'
                }`}
                title="Mute / Unmute (Alt+M)"
                aria-label={isMuted ? 'Unmute microphone' : 'Mute microphone'}
              >
                {isMuted ? <MicOff className="w-4 h-4 text-red-400" /> : <Mic className="w-4 h-4 text-emerald-400" />}
                <span className="text-[10px]">{isMuted ? 'Unmute' : 'Mute'}</span>
              </button>

              {/* Deafen Button */}
              <button
                type="button"
                onClick={onToggleDeafen}
                className={`flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-xl text-xs font-medium border transition-all ${
                  isDeafened
                    ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 hover:bg-amber-500/25'
                    : 'bg-zinc-800/80 border-zinc-700/80 text-zinc-200 hover:bg-zinc-700/80'
                }`}
                title="Deafen / Undeafen audio output"
                aria-label={isDeafened ? 'Undeafen audio' : 'Deafen audio'}
              >
                {isDeafened ? <VolumeX className="w-4 h-4 text-amber-400" /> : <Headphones className="w-4 h-4 text-zinc-300" />}
                <span className="text-[10px]">{isDeafened ? 'Undeafen' : 'Deafen'}</span>
              </button>

              {/* Screen Share Button */}
              {onToggleScreenShare && (
                <button
                  type="button"
                  onClick={onToggleScreenShare}
                  className={`flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-xl text-xs font-medium border transition-all ${
                    isSharingScreen
                      ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/25'
                      : 'bg-zinc-800/80 border-zinc-700/80 text-zinc-200 hover:bg-zinc-700/80'
                  }`}
                  title={isSharingScreen ? "Stop Screen Share (Alt+S)" : "Share Screen (Alt+S)"}
                  aria-label={isSharingScreen ? "Stop Screen Share" : "Share Screen"}
                >
                  {isSharingScreen ? <ScreenShareOff className="w-4 h-4 text-emerald-400" /> : <ScreenShare className="w-4 h-4 text-zinc-300" />}
                  <span className="text-[10px]">{isSharingScreen ? 'Sharing' : 'Share'}</span>
                </button>
              )}

              {/* Disconnect Button */}
              <button
                type="button"
                onClick={onLeaveVoice}
                className="flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-xl text-xs font-medium bg-red-600/20 border border-red-500/40 text-red-300 hover:bg-red-600/30 hover:border-red-500 transition-all"
                title="Leave voice call"
                aria-label="Leave voice call"
              >
                <PhoneOff className="w-4 h-4 text-red-400" />
                <span className="text-[10px]">Leave</span>
              </button>
            </div>

            {/* Quick Keyboard Hint */}
            <div className="flex items-center justify-between text-[10px] text-zinc-500 px-1 pt-0.5">
              <span>Shortcut: <kbd className="px-1 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono">Alt+M</kbd> to mute</span>
              <span>P2P WebRTC</span>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
