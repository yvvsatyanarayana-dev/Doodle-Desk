/**
 * LiveCollabScreenShareManager
 * Manages peer-to-peer WebRTC screen sharing using getDisplayMedia and PeerJS media calls.
 * Allows collaborators in a live session to share their screen/window and view peers' screens live.
 */

export function isScreenShareSupported() {
  return typeof navigator !== 'undefined' &&
    Boolean(navigator.mediaDevices && typeof navigator.mediaDevices.getDisplayMedia === 'function');
}

export class LiveCollabScreenShareManager {
  constructor({ onStateChange, onError } = {}) {
    this.onStateChange = onStateChange;
    this.onError = onError;

    this.isSharing = false;
    this.localStream = null;
    this.activeOutgoingCalls = new Map(); // peerId -> call

    // remotePeerId -> { stream, senderName, senderId, call }
    this.remoteStreams = new Map();
    this.peerRef = null;
  }

  notifyState() {
    this.onStateChange?.({
      isSharing: this.isSharing,
      localStream: this.localStream,
      remoteStreams: new Map(this.remoteStreams),
    });
  }

  async startScreenShare({ peer, peerIds = [], myProfile = {} }) {
    if (!isScreenShareSupported()) {
      const msg = 'Screen sharing is not supported in this environment.';
      this.onError?.(msg);
      return false;
    }

    try {
      this.peerRef = peer;

      // Request screen stream from browser or Electron with resilient constraint fallback
      let stream;
      try {
        stream = await navigator.mediaDevices.getDisplayMedia({
          video: { cursor: 'always' },
          audio: false,
        });
      } catch (e) {
        stream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: false,
        });
      }

      this.localStream = stream;
      this.isSharing = true;

      // Handle user clicking native "Stop Sharing" button in OS/browser bar
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.onended = () => {
          this.stopScreenShare();
        };
      }

      // Call each active peer in the room with the screen share stream
      if (peer && peerIds.length > 0) {
        peerIds.forEach((remotePeerId) => {
          this.callPeer(peer, remotePeerId, myProfile);
        });
      }

      this.notifyState();
      return true;
    } catch (err) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        // User cancelled or denied the screen share picker
        return false;
      }
      console.warn('Screen share initiation failed:', err);
      this.onError?.(err?.message || 'Failed to start screen share.');
      this.stopScreenShare();
      return false;
    }
  }

  callPeer(peer, remotePeerId, myProfile = {}) {
    if (!this.isSharing || !this.localStream || !peer) return;
    if (this.activeOutgoingCalls.has(remotePeerId)) return;

    try {
      const call = peer.call(remotePeerId, this.localStream, {
        metadata: {
          type: 'screen-share',
          senderId: myProfile.id,
          senderName: myProfile.username || 'Collaborator',
        },
      });

      this.activeOutgoingCalls.set(remotePeerId, call);

      call.on('close', () => {
        this.activeOutgoingCalls.delete(remotePeerId);
      });

      call.on('error', (err) => {
        console.warn(`Screen share call error with ${remotePeerId}:`, err);
        this.activeOutgoingCalls.delete(remotePeerId);
      });
    } catch (err) {
      console.warn(`Failed to call peer ${remotePeerId} for screen share:`, err);
    }
  }

  handleIncomingScreenCall(call) {
    if (!call) return;
    const remotePeerId = call.peer;
    const metadata = call.metadata || {};

    try {
      // Answer with no stream (receive-only)
      call.answer();

      call.on('stream', (remoteStream) => {
        this.remoteStreams.set(remotePeerId, {
          stream: remoteStream,
          senderName: metadata.senderName || 'Collaborator',
          senderId: metadata.senderId || remotePeerId,
          call,
        });
        this.notifyState();
      });

      call.on('close', () => {
        this.remoteStreams.delete(remotePeerId);
        this.notifyState();
      });

      call.on('error', (err) => {
        console.warn(`Incoming screen share call error from ${remotePeerId}:`, err);
        this.remoteStreams.delete(remotePeerId);
        this.notifyState();
      });
    } catch (err) {
      console.warn('Failed to handle incoming screen share call:', err);
    }
  }

  stopScreenShare() {
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {}
      });
      this.localStream = null;
    }

    this.activeOutgoingCalls.forEach((call) => {
      try {
        call.close();
      } catch {}
    });
    this.activeOutgoingCalls.clear();

    this.isSharing = false;
    this.notifyState();
  }

  removeRemoteStream(peerId) {
    const entry = this.remoteStreams.get(peerId);
    if (entry) {
      try {
        entry.call?.close();
      } catch {}
      this.remoteStreams.delete(peerId);
      this.notifyState();
    }
  }

  cleanup() {
    this.stopScreenShare();
    this.remoteStreams.forEach((entry) => {
      try {
        entry.call?.close();
      } catch {}
    });
    this.remoteStreams.clear();
    this.notifyState();
  }
}
