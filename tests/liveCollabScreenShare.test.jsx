import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  LiveCollabScreenShareManager,
  isScreenShareSupported,
} from '../src/utils/liveCollabScreenShareManager';
import LiveCollabScreenShareViewer from '../src/components/LiveCollabScreenShareViewer';
import LiveCollabDropdown from '../src/components/LiveCollabDropdown';
import { LiveCollabChatPanel } from '../src/components/LiveCollabChatPanel';

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

describe('Live Collab Screen Sharing & Canvas Annotation', () => {
  describe('LiveCollabScreenShareManager', () => {
    it('detects screen sharing support', () => {
      expect(typeof isScreenShareSupported()).toBe('boolean');
    });

    it('starts screen share, calls peers with screen metadata, and stops tracks', async () => {
      const mockVideoTrack = {
        kind: 'video',
        stop: vi.fn(),
        onended: null,
      };
      const mockStream = {
        getVideoTracks: () => [mockVideoTrack],
        getTracks: () => [mockVideoTrack],
      };

      const mockGetDisplayMedia = vi.fn().mockResolvedValue(mockStream);
      Object.defineProperty(globalThis.navigator, 'mediaDevices', {
        value: { getDisplayMedia: mockGetDisplayMedia },
        configurable: true,
      });

      let latestState = null;
      const manager = new LiveCollabScreenShareManager({
        onStateChange: (state) => {
          latestState = state;
        },
        onError: vi.fn(),
      });

      const fakePeer = {
        id: 'host-peer',
        call: vi.fn((remoteId, stream, options) => ({
          peer: remoteId,
          stream,
          options,
          on: vi.fn(),
          close: vi.fn(),
        })),
      };

      // 1. Start Screen Share
      const started = await manager.startScreenShare({
        peer: fakePeer,
        peerIds: ['friend-peer-1'],
        myProfile: { id: 'user-1', username: 'Alex' },
      });

      expect(started).toBe(true);
      expect(mockGetDisplayMedia).toHaveBeenCalled();
      expect(fakePeer.call).toHaveBeenCalledWith(
        'friend-peer-1',
        mockStream,
        expect.objectContaining({
          metadata: expect.objectContaining({
            type: 'screen-share',
            senderName: 'Alex',
          }),
        })
      );
      expect(latestState?.isSharing).toBe(true);

      // 2. Stop Screen Share
      manager.stopScreenShare();
      expect(mockVideoTrack.stop).toHaveBeenCalled();
      expect(latestState?.isSharing).toBe(false);
    });

    it('handles incoming screen share calls and stores remote streams', () => {
      let latestState = null;
      const manager = new LiveCollabScreenShareManager({
        onStateChange: (state) => {
          latestState = state;
        },
      });

      const mockRemoteStream = { id: 'remote-screen-stream' };
      const callHandlers = new Map();
      const incomingCall = {
        peer: 'friend-peer',
        metadata: {
          type: 'screen-share',
          senderName: 'Sam',
          senderId: 'sam-id',
        },
        answer: vi.fn(),
        on(event, cb) {
          callHandlers.set(event, cb);
        },
        close: vi.fn(),
      };

      manager.handleIncomingScreenCall(incomingCall);
      expect(incomingCall.answer).toHaveBeenCalled();

      // Simulate remote stream arrival
      const streamCallback = callHandlers.get('stream');
      expect(streamCallback).toBeDefined();
      streamCallback(mockRemoteStream);

      expect(latestState?.remoteStreams.has('friend-peer')).toBe(true);
      expect(latestState?.remoteStreams.get('friend-peer').senderName).toBe('Sam');

      // Simulate call close
      const closeCallback = callHandlers.get('close');
      closeCallback();
      expect(latestState?.remoteStreams.has('friend-peer')).toBe(false);
    });
  });

  describe('LiveCollabScreenShareViewer Component', () => {
    it('renders floating studio window with live presenter tag and controls', () => {
      const mockStream = { id: 'stream-1' };
      const remoteStreams = new Map([
        ['peer-1', { stream: mockStream, senderName: 'Alice', senderId: 'alice-id' }],
      ]);
      const onCapture = vi.fn();

      act(() => {
        root.render(
          <LiveCollabScreenShareViewer
            remoteStreams={remoteStreams}
            onCaptureSnapshotToCanvas={onCapture}
          />
        );
      });

      expect(container.textContent).toContain("Alice");
      expect(container.textContent).toContain('Stamp to Canvas');

      // Click Stamp to Canvas button
      const stampBtn = container.querySelector('button[aria-label="Snapshot frame to canvas"]');
      expect(stampBtn).not.toBeNull();
    });

    it('toggles opacity for drawing directly over the screen', () => {
      const mockStream = { id: 'stream-1' };
      const remoteStreams = new Map([
        ['peer-1', { stream: mockStream, senderName: 'Alice' }],
      ]);

      act(() => {
        root.render(
          <LiveCollabScreenShareViewer remoteStreams={remoteStreams} />
        );
      });

      const opacityBtn = container.querySelector('button[aria-label="Toggle Translucent View"]');
      expect(opacityBtn).not.toBeNull();
      expect(opacityBtn.textContent).toContain('100%');

      act(() => opacityBtn.dispatchEvent(new MouseEvent('click', { bubbles: true })));
      expect(opacityBtn.textContent).toContain('65%');
    });
  });

  describe('Dropdown and Chat Screen Sharing Integration', () => {
    it('renders Share Screen button in LiveCollabDropdown and triggers startScreenShare', () => {
      const startScreenShare = vi.fn();
      const stopScreenShare = vi.fn();

      act(() => {
        root.render(
          <LiveCollabDropdown
            status="hosting"
            roomId="DOODLE-123"
            myProfile={{ username: 'Alex' }}
            collaborators={new Map()}
            screenShareState={{ isSharing: false }}
            startScreenShare={startScreenShare}
            stopScreenShare={stopScreenShare}
          />
        );
      });

      expect(container.textContent).toContain('Live Screen Sharing');
      const shareBtn = Array.from(container.querySelectorAll('button')).find((b) =>
        b.textContent.includes('Share Screen')
      );
      expect(shareBtn).toBeTruthy();

      act(() => shareBtn.dispatchEvent(new MouseEvent('click', { bubbles: true })));
      expect(startScreenShare).toHaveBeenCalledOnce();
    });

    it('renders Stop Sharing button when user is actively sharing', () => {
      const stopScreenShare = vi.fn();

      act(() => {
        root.render(
          <LiveCollabDropdown
            status="hosting"
            roomId="DOODLE-123"
            myProfile={{ username: 'Alex' }}
            collaborators={new Map()}
            screenShareState={{ isSharing: true }}
            stopScreenShare={stopScreenShare}
          />
        );
      });

      expect(container.textContent).toContain('You are presenting');
      const stopBtn = Array.from(container.querySelectorAll('button')).find((b) =>
        b.textContent.includes('Stop Sharing')
      );
      expect(stopBtn).toBeTruthy();

      act(() => stopBtn.dispatchEvent(new MouseEvent('click', { bubbles: true })));
      expect(stopScreenShare).toHaveBeenCalledOnce();
    });

    it('renders screen share button in LiveCollabChatPanel', () => {
      const startScreenShare = vi.fn();

      act(() => {
        root.render(
          <LiveCollabChatPanel
            isOpen={true}
            isConnected={true}
            onToggle={() => {}}
            startScreenShare={startScreenShare}
            screenShareState={{ isSharing: false }}
          />
        );
      });

      const shareBtn = container.querySelector('button[aria-label="Toggle Screen Share"]');
      expect(shareBtn).not.toBeNull();
      act(() => shareBtn.dispatchEvent(new MouseEvent('click', { bubbles: true })));
      expect(startScreenShare).toHaveBeenCalledOnce();
    });
  });
});
