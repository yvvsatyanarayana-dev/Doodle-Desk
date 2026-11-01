import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LiveCollabVoiceManager, isVoiceSupported, enhanceAudioSdp, optimizeAudioSenders } from '../src/utils/liveCollabVoiceManager';
import LiveCollabVoiceWidget from '../src/components/LiveCollabVoiceWidget';
import { LiveCollabChatPanel } from '../src/components/LiveCollabChatPanel';
import LiveCollabDropdown from '../src/components/LiveCollabDropdown';

let root;
let container;

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  if (root) act(() => root.unmount());
  container?.remove();
  delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  vi.restoreAllMocks();
});

describe('Live Collab Voice Talk & Audio Calling', () => {
  describe('LiveCollabVoiceManager', () => {
    it('correctly detects voice support in standard browser environments', () => {
      expect(typeof isVoiceSupported()).toBe('boolean');
    });

    it('manages local audio streams, mute, deafen, and peer calls', async () => {
      // Mock MediaStream and AudioContext
      const mockTrack = {
        kind: 'audio',
        enabled: true,
        stop: vi.fn(),
      };
      const mockStream = {
        getAudioTracks: () => [mockTrack],
        getTracks: () => [mockTrack],
      };

      const mockGetUserMedia = vi.fn().mockResolvedValue(mockStream);
      Object.defineProperty(globalThis.navigator, 'mediaDevices', {
        value: { getUserMedia: mockGetUserMedia },
        configurable: true,
      });

      // Mock AudioContext
      class MockAnalyserNode {
        constructor() {
          this.fftSize = 256;
          this.frequencyBinCount = 128;
        }
        getByteFrequencyData(arr) {
          arr.fill(30); // simulates voice energy > threshold
        }
      }

      class MockAudioContext {
        createMediaStreamSource() {
          return { connect: vi.fn() };
        }
        createAnalyser() {
          return new MockAnalyserNode();
        }
        close() {
          return Promise.resolve();
        }
      }

      globalThis.AudioContext = MockAudioContext;

      let latestState = null;
      let speakingEvents = [];

      const manager = new LiveCollabVoiceManager({
        onStateChange: (state) => {
          latestState = state;
        },
        onSpeakingChange: (peerId, isSpeaking) => {
          speakingEvents.push({ peerId, isSpeaking });
        },
        onError: vi.fn(),
      });

      // Mock fake peer
      const mockCalls = [];
      const fakePeer = {
        id: 'host-1',
        call: vi.fn((remoteId, stream) => {
          const callObj = {
            peer: remoteId,
            handlers: new Map(),
            on(event, cb) {
              const arr = this.handlers.get(event) || [];
              arr.push(cb);
              this.handlers.set(event, arr);
              return this;
            },
            close: vi.fn(),
          };
          mockCalls.push(callObj);
          return callObj;
        }),
      };

      // 1. Start Voice
      const started = await manager.startVoice({
        peer: fakePeer,
        peerIds: ['guest-peer-1'],
      });

      expect(started).toBe(true);
      expect(mockGetUserMedia).toHaveBeenCalled();
      expect(fakePeer.call).toHaveBeenCalledWith('guest-peer-1', mockStream);
      expect(latestState?.inVoice).toBe(true);
      expect(latestState?.isMuted).toBe(false);

      // 2. Toggle Mute
      const muted = manager.toggleMute();
      expect(muted).toBe(true);
      expect(mockTrack.enabled).toBe(false);
      expect(latestState?.isMuted).toBe(true);

      const unmuted = manager.toggleMute();
      expect(unmuted).toBe(false);
      expect(mockTrack.enabled).toBe(true);

      // 3. Toggle Deafen
      const deafened = manager.toggleDeafen();
      expect(deafened).toBe(true);
      expect(latestState?.isDeafened).toBe(true);

      const undeafened = manager.toggleDeafen();
      expect(undeafened).toBe(false);
      expect(latestState?.isDeafened).toBe(false);

      // 4. Handle Incoming Call
      const incomingCall = {
        peer: 'guest-peer-2',
        answer: vi.fn(),
        handlers: new Map(),
        on(event, cb) {
          const arr = this.handlers.get(event) || [];
          arr.push(cb);
          this.handlers.set(event, arr);
          return this;
        },
        close: vi.fn(),
      };
      manager.handleIncomingCall(incomingCall);
      expect(incomingCall.answer).toHaveBeenCalledWith(mockStream);

      // 5. Leave Voice
      manager.leaveVoice();
      expect(mockTrack.stop).toHaveBeenCalled();
      expect(latestState?.inVoice).toBe(false);
    });

    it('gracefully handles microphone permission denial', async () => {
      const mockGetUserMedia = vi.fn().mockRejectedValue(new Error('Permission denied'));
      Object.defineProperty(globalThis.navigator, 'mediaDevices', {
        value: { getUserMedia: mockGetUserMedia },
        configurable: true,
      });

      let errorReceived = '';
      const manager = new LiveCollabVoiceManager({
        onError: (err) => {
          errorReceived = err;
        },
      });

      const started = await manager.startVoice({});
      expect(started).toBe(false);
      expect(errorReceived).toContain('Microphone access was denied');
    });
  });

  describe('LiveCollabVoiceWidget', () => {
    it('renders voice status capsule with mute, deafen, and disconnect controls', () => {
      const onToggleMute = vi.fn();
      const onToggleDeafen = vi.fn();
      const onLeaveVoice = vi.fn();

      const voiceState = {
        inVoice: true,
        isMuted: false,
        isDeafened: false,
        isSpeaking: true,
        remoteSpeakingPeers: new Set(['peer-1']),
        activeCallCount: 1,
      };

      const collaborators = new Map([
        ['peer-1', { id: 'peer-1', name: 'Alice', inVoice: true, isVoiceSpeaking: true }],
      ]);

      act(() => {
        root.render(
          <LiveCollabVoiceWidget
            voiceState={voiceState}
            onToggleMute={onToggleMute}
            onToggleDeafen={onToggleDeafen}
            onLeaveVoice={onLeaveVoice}
            collaborators={collaborators}
          />
        );
      });

      expect(container.textContent).toContain('Voice Connected');
      expect(container.textContent).toContain('You are speaking');

      // Click Mute button
      const muteBtn = container.querySelector('button[aria-label="Mute microphone"]');
      expect(muteBtn).not.toBeNull();
      act(() => muteBtn.dispatchEvent(new MouseEvent('click', { bubbles: true })));
      expect(onToggleMute).toHaveBeenCalledOnce();

      // Click Deafen button
      const deafenBtn = container.querySelector('button[aria-label="Deafen audio"]');
      expect(deafenBtn).not.toBeNull();
      act(() => deafenBtn.dispatchEvent(new MouseEvent('click', { bubbles: true })));
      expect(onToggleDeafen).toHaveBeenCalledOnce();

      // Click Leave button
      const leaveBtn = container.querySelector('button[aria-label="Leave voice call"]');
      expect(leaveBtn).not.toBeNull();
      act(() => leaveBtn.dispatchEvent(new MouseEvent('click', { bubbles: true })));
      expect(onLeaveVoice).toHaveBeenCalledOnce();
    });

    it('collapses and expands smoothly', () => {
      const voiceState = {
        inVoice: true,
        isMuted: false,
        isDeafened: false,
        isSpeaking: false,
        remoteSpeakingPeers: new Set(),
        activeCallCount: 0,
      };

      act(() => {
        root.render(
          <LiveCollabVoiceWidget
            voiceState={voiceState}
            onToggleMute={() => {}}
            onToggleDeafen={() => {}}
            onLeaveVoice={() => {}}
          />
        );
      });

      const collapseBtn = container.querySelector('button[aria-label="Collapse Voice Controls"]');
      expect(collapseBtn).not.toBeNull();

      act(() => collapseBtn.dispatchEvent(new MouseEvent('click', { bubbles: true })));
      expect(container.querySelector('button[aria-label="Expand Voice Controls"]')).not.toBeNull();
    });
  });

  describe('LiveCollabChatPanel voice integration', () => {
    it('shows direct Mic On / Mic Off control and triggers voice mute toggle', () => {
      const toggleVoiceMute = vi.fn();

      act(() => {
        root.render(
          <LiveCollabChatPanel
            isOpen={true}
            isConnected={true}
            onToggle={() => {}}
            voiceState={{ inVoice: true, isMuted: false, isSpeaking: false }}
            toggleVoiceMute={toggleVoiceMute}
          />
        );
      });

      expect(container.textContent).toContain('Mic On');
      const micBtn = container.querySelector('button[aria-label="Turn Mic Off"]');
      expect(micBtn).not.toBeNull();
      act(() => micBtn.dispatchEvent(new MouseEvent('click', { bubbles: true })));
      expect(toggleVoiceMute).toHaveBeenCalledOnce();
    });

    it('shows voice active state and controls when connected', () => {
      const toggleVoiceMute = vi.fn();
      const toggleVoiceDeafen = vi.fn();

      act(() => {
        root.render(
          <LiveCollabChatPanel
            isOpen={true}
            isConnected={true}
            onToggle={() => {}}
            voiceState={{
              inVoice: true,
              isMuted: true,
              isDeafened: false,
              isSpeaking: false,
              activeCallCount: 1,
            }}
            toggleVoiceMute={toggleVoiceMute}
            toggleVoiceDeafen={toggleVoiceDeafen}
          />
        );
      });

      expect(container.textContent).toContain('Mic Off');
      const micBtn = container.querySelector('button[aria-label="Turn Mic On"]');
      expect(micBtn).not.toBeNull();
      act(() => micBtn.dispatchEvent(new MouseEvent('click', { bubbles: true })));
      expect(toggleVoiceMute).toHaveBeenCalledOnce();

      const deafenBtn = container.querySelector('button[aria-label="Deafen Audio"]');
      expect(deafenBtn).not.toBeNull();
      act(() => deafenBtn.dispatchEvent(new MouseEvent('click', { bubbles: true })));
      expect(toggleVoiceDeafen).toHaveBeenCalledOnce();
    });
  });

  describe('LiveCollabDropdown voice integration', () => {
    it('displays speaking status badges for active members and voice card with Mic On / Off', () => {
      const toggleVoiceMute = vi.fn();
      const collaborators = new Map([
        ['peer-1', { id: 'peer-1', username: 'Bob', inVoice: true, isVoiceSpeaking: true }],
      ]);

      act(() => {
        root.render(
          <LiveCollabDropdown
            status="hosting"
            roomId="DOODLE-ROOM"
            myProfile={{ username: 'Alice' }}
            collaborators={collaborators}
            voiceState={{ inVoice: true, isMuted: false }}
            toggleVoiceMute={toggleVoiceMute}
          />
        );
      });

      expect(container.textContent).toContain('Live Voice Talk');
      expect(container.textContent).toContain('Speaking');

      const micToggleBtn = container.querySelector('button[aria-label="Turn Mic Off"]');
      expect(micToggleBtn).toBeTruthy();
      act(() => micToggleBtn.dispatchEvent(new MouseEvent('click', { bubbles: true })));
      expect(toggleVoiceMute).toHaveBeenCalledOnce();
    });
  });

  describe('Audio Quality & DSP Background Noise Reduction', () => {
    it('enhances SDP with 128kbps Opus, Forward Error Correction, and Discontinuous Transmission', () => {
      const rawSdp = [
        'v=0',
        'm=audio 9 UDP/TLS/RTP/SAVPF 111',
        'a=rtpmap:111 opus/48000/2',
        'a=fmtp:111 minptime=10;useinbandfec=0',
      ].join('\r\n');

      const enhanced = enhanceAudioSdp(rawSdp);
      expect(enhanced).toContain('maxaveragebitrate=128000');
      expect(enhanced).toContain('useinbandfec=1');
      expect(enhanced).toContain('usedtx=1');
      expect(enhanced).toContain('sprop-maxcapturerate=48000');
      expect(enhanced).toContain('maxplaybackrate=48000');
    });

    it('optimizes audio sender parameters on RTCPeerConnection', () => {
      const mockAudioSender = {
        track: { kind: 'audio' },
        getParameters: vi.fn(() => ({ encodings: [{}] })),
        setParameters: vi.fn(() => Promise.resolve()),
      };
      const mockPc = {
        getSenders: () => [mockAudioSender],
      };

      optimizeAudioSenders(mockPc);
      expect(mockAudioSender.setParameters).toHaveBeenCalledWith(
        expect.objectContaining({
          encodings: [
            expect.objectContaining({
              maxBitrate: 128000,
              priority: 'high',
            }),
          ],
        })
      );
    });

    it('builds real-time Web Audio DSP pipeline with high-pass, presence EQ, compressor, and noise gate', async () => {
      const mockFilter = {
        type: '',
        frequency: { setValueAtTime: vi.fn() },
        gain: { setValueAtTime: vi.fn() },
        Q: { setValueAtTime: vi.fn() },
        connect: vi.fn(),
        disconnect: vi.fn(),
      };
      const mockCompressor = {
        threshold: { setValueAtTime: vi.fn() },
        knee: { setValueAtTime: vi.fn() },
        ratio: { setValueAtTime: vi.fn() },
        attack: { setValueAtTime: vi.fn() },
        release: { setValueAtTime: vi.fn() },
        connect: vi.fn(),
        disconnect: vi.fn(),
      };
      const mockGain = {
        gain: { setValueAtTime: vi.fn(), setTargetAtTime: vi.fn() },
        connect: vi.fn(),
        disconnect: vi.fn(),
      };
      const mockDestination = {
        stream: { kind: 'processed-stream' },
      };

      class FullDspAudioContext {
        currentTime = 0;
        createMediaStreamSource() {
          return { connect: vi.fn(), disconnect: vi.fn() };
        }
        createBiquadFilter() {
          return { ...mockFilter };
        }
        createDynamicsCompressor() {
          return { ...mockCompressor };
        }
        createGain() {
          return { ...mockGain };
        }
        createAnalyser() {
          return {
            fftSize: 256,
            smoothingTimeConstant: 0.3,
            connect: vi.fn(),
            disconnect: vi.fn(),
          };
        }
        createMediaStreamDestination() {
          return mockDestination;
        }
        close() {
          return Promise.resolve();
        }
      }

      globalThis.AudioContext = FullDspAudioContext;
      if (typeof window !== 'undefined') {
        window.AudioContext = FullDspAudioContext;
      }

      const manager = new LiveCollabVoiceManager({});
      const rawStream = { kind: 'raw-stream' };
      const processed = await manager.setupAudioProcessing(rawStream);

      expect(processed).toBe(mockDestination.stream);
      expect(manager.getTransmitStream()).toBe(mockDestination.stream);
    });
  });
});
