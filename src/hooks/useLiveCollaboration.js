import { useState, useEffect, useRef, useCallback } from 'react';
import { cancelIdleTask, scheduleIdleTask } from '../utils/idleTask.js';
import {
  clearOfflineQueue,
  mergeOfflineScenes,
  offlineQueueStorageKey,
  readOfflineQueue,
  writeOfflineQueue,
} from '../engine/offlineCollaboration.js';
import { LiveCollabVoiceManager, isVoiceSupported } from '../utils/liveCollabVoiceManager.js';
import { LiveCollabScreenShareManager, isScreenShareSupported } from '../utils/liveCollabScreenShareManager.js';

let peerModulePromise;
const loadPeer = () => {
  peerModulePromise ||= import('peerjs').then((module) => module.Peer);
  return peerModulePromise;
};

const COLLAB_ADJECTIVES = [
  'Stylish', 'Remarkable', 'Cosmic', 'Swift', 'Clever',
  'Gentle', 'Curious', 'Brave', 'Sunny', 'Merry',
  'Witty', 'Radiant', 'Lively', 'Brilliant', 'Daring',
];

const COLLAB_ANIMALS = [
  'Sheep', 'Stingray', 'Otter', 'Falcon', 'Fox',
  'Panda', 'Dolphin', 'Koala', 'Owl', 'Tiger',
  'Badger', 'Lynx', 'Hedgehog', 'Cheetah', 'Chameleon',
];

const COLLAB_COLORS = [
  { background: '#ef4444', stroke: '#dc2626' }, // red
  { background: '#3b82f6', stroke: '#2563eb' }, // blue
  { background: '#10b981', stroke: '#059669' }, // emerald
  { background: '#f59e0b', stroke: '#d97706' }, // amber
  { background: '#8b5cf6', stroke: '#7c3aed' }, // violet
  { background: '#ec4899', stroke: '#db2777' }, // pink
  { background: '#06b6d4', stroke: '#0891b2' }, // cyan
  { background: '#84cc16', stroke: '#65a30d' }, // lime
];

// Robust ICE Servers fleet (STUN + OpenRelay TURN fallback for symmetric NATs)
const ROBUST_ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun3.l.google.com:19302' },
  { urls: 'stun:stun4.l.google.com:19302' },
  { urls: 'stun:global.stun.twilio.com:3478' },
  { urls: 'stun:stun.cloudflare.com:3478' },
  { urls: 'stun:stun.services.mozilla.com' },
  {
    urls: 'turn:openrelay.metered.ca:80',
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
  {
    urls: 'turn:openrelay.metered.ca:443',
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
  {
    urls: 'turn:openrelay.metered.ca:443?transport=tcp',
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
];

const USER_PREFS_KEY = 'doodle_collab_user_profile';
const ACTIVE_HOST_KEY = 'doodle_active_host_session';

const createSessionId = () => `usr-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 9)}`;
const normalizeRoomCode = (input) => {
  if (!input || typeof input === 'object') return '';
  let str = String(input).trim();
  if (str.includes('room=')) {
    try {
      const match = str.match(/room=([^&#\s]+)/i);
      if (match && match[1]) {
        return decodeURIComponent(match[1]).trim().toUpperCase();
      }
    } catch {}
  } else if (str.startsWith('http://') || str.startsWith('https://') || str.startsWith('doodle-desk://')) {
    try {
      const parsed = new URL(str.replace(/^doodle-desk:\/\//i, 'https://doodledesk.app/'));
      const fromParam = parsed.searchParams.get('room');
      if (fromParam) return fromParam.trim().toUpperCase();
      const segments = parsed.pathname.split('/').filter(Boolean);
      const joinIdx = segments.findIndex((s) => /^(join|room)$/i.test(s));
      if (joinIdx !== -1 && segments[joinIdx + 1]) {
        return decodeURIComponent(segments[joinIdx + 1]).trim().toUpperCase();
      }
      const last = segments[segments.length - 1];
      if (last && /^DOODLE-[A-Z0-9]+$/i.test(last)) {
        return decodeURIComponent(last).trim().toUpperCase();
      }
    } catch {}
  }
  str = str.replace(/^[#?&]+/, '').split('&')[0].split('#')[0].trim();
  if (str.includes('/')) {
    const parts = str.split('/').filter(Boolean);
    str = parts[parts.length - 1];
  }
  return str.toUpperCase();
};
const getSceneSignature = (elements) => elements
  .map((el) => `${el.id}:${el.version || 1}:${el.versionNonce || 0}:${Math.round(el.x || 0)}:${Math.round(el.y || 0)}:${Math.round(el.width || 0)}:${Math.round(el.height || 0)}:${el.angle || 0}:${el.text || ''}:${el.strokeColor || ''}:${el.backgroundColor || ''}:${el.strokeWidth || 1}:${el.fillStyle || ''}:${el.fontSize || 0}:${el.opacity !== undefined ? el.opacity : 1}:${el.points?.length || 0}:${el.isDeleted ? 1 : 0}`)
  .join('|');

export function useLiveCollaboration({ doodleAPI, canvasAPI, workspaceId, fileId }) {
  const activeAPI = doodleAPI || canvasAPI;
  const activeAPIRef = useRef(activeAPI);
  activeAPIRef.current = activeAPI;
  const getAPI = useCallback(() => activeAPIRef.current || activeAPI || (typeof window !== 'undefined' ? window.__doodleAPI : null), [activeAPI]);
  const [status, setStatus] = useState('disconnected'); // 'disconnected' | 'hosting' | 'joined'
  const [connectionError, setConnectionError] = useState('');
  const [roomId, setRoomId] = useState('');
  const [discoveredRoom, setDiscoveredRoom] = useState(null);
  const discoveredRoomRef = useRef(null);
  discoveredRoomRef.current = discoveredRoom;
  const [collaborators, setCollaborators] = useState(new Map());
  const [chatMessages, setChatMessages] = useState([]);
  const [pendingConflict, setPendingConflict] = useState(null);
  const [offlineQueueError, setOfflineQueueError] = useState('');
  const [voiceState, setVoiceState] = useState({
    inVoice: false,
    isMuted: false,
    isDeafened: false,
    isSpeaking: false,
    remoteSpeakingPeers: new Set(),
    activeCallCount: 0,
  });
  const [voiceError, setVoiceError] = useState('');
  const voiceManagerRef = useRef(null);
  const connectionTimeoutRef = useRef(null);
  const [screenShareState, setScreenShareState] = useState({
    isSharing: false,
    localStream: null,
    remoteStreams: new Map(),
  });
  const [screenShareError, setScreenShareError] = useState('');
  const screenShareManagerRef = useRef(null);

  const [myProfile, setMyProfile] = useState(() => {
    try {
      const saved = localStorage.getItem(USER_PREFS_KEY);
      if (saved) return { ...JSON.parse(saved), id: createSessionId() };
    } catch {}
    const randomIdx = Math.floor(Math.random() * COLLAB_COLORS.length);
    return {
      id: createSessionId(),
      username: `${COLLAB_ADJECTIVES[Math.floor(Math.random() * COLLAB_ADJECTIVES.length)]} ${COLLAB_ANIMALS[Math.floor(Math.random() * COLLAB_ANIMALS.length)]}`,
      color: COLLAB_COLORS[randomIdx],
    };
  });

  const peerRef = useRef(null);
  const peerToSenderMapRef = useRef(new Map());
  const connectionsRef = useRef(new Map());
  const broadcastChannelRef = useRef(null);
  const isRemoteUpdateRef = useRef(false);
  const lastBroadcastElementsSigRef = useRef(null);
  const statusRef = useRef(status);
  const collaboratorsRef = useRef(collaborators);
  collaboratorsRef.current = collaborators;
  const retryTimeoutRef = useRef(null);
  const sessionGenerationRef = useRef(0);
  const sessionRef = useRef(null);
  const lastSyncedSceneRef = useRef(null);
  const offlineQueueRef = useRef(null);
  const offlineQueueKeyRef = useRef(null);
  const pendingConflictRef = useRef(null);
  const pendingQueueWriteRef = useRef(null);
  const pendingQueueTaskRef = useRef(null);
  const broadcastDataRef = useRef(null);
  const targetHostPeerIdRef = useRef(null);
  const startVoiceCallRef = useRef(null);
  statusRef.current = status;

  useEffect(() => {
    voiceManagerRef.current = new LiveCollabVoiceManager({
      onStateChange: (state) => setVoiceState({ ...state }),
      onSpeakingChange: (peerId, isSpeaking) => {
        if (peerId === 'local' && statusRef.current !== 'disconnected') {
          broadcastDataRef.current?.({
            type: 'voice-speaking',
            isSpeaking,
          });
        }
      },
      onError: (err) => setVoiceError(err),
    });
    screenShareManagerRef.current = new LiveCollabScreenShareManager({
      onStateChange: (state) => setScreenShareState({ ...state }),
      onError: (err) => setScreenShareError(err),
    });
    return () => {
      voiceManagerRef.current?.leaveVoice();
      screenShareManagerRef.current?.cleanup();
    };
  }, []);

  const persistPendingQueue = useCallback(() => {
    cancelIdleTask(pendingQueueTaskRef.current);
    pendingQueueTaskRef.current = null;
    const pending = pendingQueueWriteRef.current;
    pendingQueueWriteRef.current = null;
    if (!pending) return;
    try {
      if (pending.isEmpty) {
        clearOfflineQueue(pending.key);
        offlineQueueRef.current = null;
      } else {
        writeOfflineQueue(pending.key, pending.queue);
        offlineQueueRef.current = pending.queue;
      }
      setOfflineQueueError('');
    } catch (error) {
      console.error('Could not persist offline collaboration changes:', error);
      setOfflineQueueError(`Offline changes could not be saved: ${error.message}`);
    }
  }, []);

  const queueOfflineScene = useCallback((elements, session = sessionRef.current) => {
    if (!session || !workspaceId || !fileId || !Array.isArray(elements)) return;
    const key = offlineQueueStorageKey(workspaceId, fileId, session.roomId);
    if (!key) return;
    const baseElements = lastSyncedSceneRef.current || [];
    const isEmpty = getSceneSignature(elements) === getSceneSignature(baseElements);
    const queue = { baseElements, localElements: elements, updatedAt: Date.now() };
    offlineQueueKeyRef.current = key;
    offlineQueueRef.current = isEmpty ? null : queue;
    pendingQueueWriteRef.current = { key, queue, isEmpty };
    cancelIdleTask(pendingQueueTaskRef.current);
    pendingQueueTaskRef.current = scheduleIdleTask(persistPendingQueue, 500);
  }, [workspaceId, fileId, persistPendingQueue]);

  const initializeSessionQueue = useCallback((roomCode) => {
    persistPendingQueue();
    const key = offlineQueueStorageKey(workspaceId, fileId, roomCode);
    offlineQueueKeyRef.current = key;
    pendingQueueWriteRef.current = null;
    cancelIdleTask(pendingQueueTaskRef.current);
    pendingQueueTaskRef.current = null;
    try {
      const queue = readOfflineQueue(key);
      offlineQueueRef.current = queue;
      lastSyncedSceneRef.current = queue?.baseElements || activeAPI?.getSceneElements?.() || [];
      setOfflineQueueError('');
    } catch (error) {
      console.error('Could not read the offline collaboration queue:', error);
      setOfflineQueueError(`Could not restore queued offline changes: ${error.message}`);
      const localElements = activeAPI?.getSceneElements?.() || [];
      const queue = { baseElements: [], localElements, updatedAt: Date.now() };
      offlineQueueRef.current = queue;
      lastSyncedSceneRef.current = [];
    }
  }, [workspaceId, fileId, activeAPI, persistPendingQueue]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (statusRef.current !== 'disconnected') {
        const leftPayload = {
          type: 'user-left',
          senderId: myProfile.id,
          username: myProfile.username,
        };
        // 0. Electron IPC Relay
        if (typeof window !== 'undefined' && window.electronAPI?.relayCollabMessage) {
          try {
            window.electronAPI.relayCollabMessage({
              roomId: sessionRef.current?.roomId,
              payload: leftPayload,
            });
          } catch {}
        }
        // 1. BroadcastChannel
        if (broadcastChannelRef.current) {
          try {
            broadcastChannelRef.current.postMessage(leftPayload);
          } catch {}
        }
        // 2. WebRTC Peer Connections
        connectionsRef.current.forEach((conn) => {
          if (conn.open) {
            try {
              conn.send(leftPayload);
              conn.close();
            } catch {}
          }
        });
        if (peerRef.current) {
          try {
            peerRef.current.destroy();
          } catch {}
        }
      }
      persistPendingQueue();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('unload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('unload', handleBeforeUnload);
      handleBeforeUnload();
    };
  }, [persistPendingQueue, myProfile.id, myProfile.username]);

  useEffect(() => {
    if (!activeAPI) return;
    const session = sessionRef.current;
    if (session && workspaceId && fileId) {
      initializeSessionQueue(session.roomId);
    } else {
      lastSyncedSceneRef.current = activeAPI.getSceneElements?.() || [];
      offlineQueueRef.current = null;
      offlineQueueKeyRef.current = null;
    }
  }, [activeAPI, workspaceId, fileId, initializeSessionQueue]);

  // Save profile changes
  useEffect(() => {
    try {
      localStorage.setItem(USER_PREFS_KEY, JSON.stringify(myProfile));
    } catch {}
  }, [myProfile]);

  // Announce active room if hosting (so other windows on the same machine discover it automatically)
  useEffect(() => {
    if (status !== 'hosting' || !roomId) return;
    const announceData = {
      roomId,
      hostName: myProfile.username,
      hostId: myProfile.id,
      timestamp: Date.now(),
    };
    try {
      localStorage.setItem(ACTIVE_HOST_KEY, JSON.stringify(announceData));
    } catch {}

    let discoveryChannel = null;
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        discoveryChannel = new BroadcastChannel('doodle_room_discovery');
        discoveryChannel.postMessage({ type: 'room-active', ...announceData });
      }
    } catch {}

    const relayDiscovery = (msg) => {
      if (typeof window !== 'undefined' && window.electronAPI?.relayCollabMessage) {
        try {
          window.electronAPI.relayCollabMessage({ roomId: '__discovery__', payload: msg });
        } catch {}
      }
    };
    relayDiscovery({ type: 'room-active', ...announceData });

    const interval = setInterval(() => {
      const ping = { ...announceData, timestamp: Date.now() };
      try {
        localStorage.setItem(ACTIVE_HOST_KEY, JSON.stringify(ping));
        discoveryChannel?.postMessage({ type: 'room-active', ...ping });
        relayDiscovery({ type: 'room-active', ...ping });
      } catch {}
    }, 2000);

    return () => {
      clearInterval(interval);
      try {
        const saved = JSON.parse(localStorage.getItem(ACTIVE_HOST_KEY) || '{}');
        if (saved?.hostId === myProfile.id) {
          localStorage.removeItem(ACTIVE_HOST_KEY);
        }
        discoveryChannel?.postMessage({ type: 'room-closed', roomId });
        discoveryChannel?.close();
        relayDiscovery({ type: 'room-closed', roomId });
      } catch {}
    };
  }, [status, roomId, myProfile.username, myProfile.id]);

  // Discover active local rooms from other windows
  useEffect(() => {
    if (status !== 'disconnected') {
      setDiscoveredRoom(null);
      return;
    }

    const checkStoredRoom = () => {
      try {
        const raw = localStorage.getItem(ACTIVE_HOST_KEY);
        if (!raw) {
          setDiscoveredRoom(null);
          return;
        }
        const data = JSON.parse(raw);
        if (data && data.roomId && data.hostId !== myProfile.id && Date.now() - (data.timestamp || 0) < 6000) {
          setDiscoveredRoom(data);
        } else {
          setDiscoveredRoom(null);
        }
      } catch {
        setDiscoveredRoom(null);
      }
    };

    checkStoredRoom();
    const interval = setInterval(checkStoredRoom, 1500);

    let discoveryChannel = null;
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        discoveryChannel = new BroadcastChannel('doodle_room_discovery');
        discoveryChannel.onmessage = (event) => {
          if (event.data?.type === 'room-active' && event.data.hostId !== myProfile.id) {
            setDiscoveredRoom(event.data);
          } else if (event.data?.type === 'room-closed') {
            setDiscoveredRoom((prev) => (prev?.roomId === event.data.roomId ? null : prev));
          }
        };
      }
    } catch {}

    let unsubscribeRelay = null;
    if (typeof window !== 'undefined' && window.electronAPI?.onCollabRelay) {
      unsubscribeRelay = window.electronAPI.onCollabRelay((envelope) => {
        if (envelope?.roomId === '__discovery__') {
          if (envelope.payload?.type === 'room-active' && envelope.payload.hostId !== myProfile.id) {
            setDiscoveredRoom(envelope.payload);
          } else if (envelope.payload?.type === 'room-closed') {
            setDiscoveredRoom((prev) => (prev?.roomId === envelope.payload.roomId ? null : prev));
          }
        }
      });
    }

    return () => {
      clearInterval(interval);
      try {
        discoveryChannel?.close();
      } catch {}
      try {
        unsubscribeRelay?.();
      } catch {}
    };
  }, [status, myProfile.id]);

  // Update scene collaborators map
  const syncCollaboratorsToCanvas = useCallback((collabsMap) => {
    if (!activeAPI) return;
    try {
      activeAPI.updateScene({
        collaborators: new Map(collabsMap),
      });
    } catch (e) {
      console.warn('Failed to sync collaborators:', e);
    }
  }, [activeAPI]);

  // Handle incoming messages from peers or local broadcast
  const handleIncomingMessage = useCallback((msg, senderId) => {
    if (!msg || msg.senderId === myProfile.id) return;

    if (senderId && msg.senderId) {
      peerToSenderMapRef.current.set(senderId, msg.senderId);
    }

    if (msg.type === 'user-left') {
      const targetId = msg.senderId;
      const targetPeerId = msg.peerId || senderId;

      // Clean up remote peer from voice calls and audio elements
      if (targetPeerId) {
        try {
          voiceManagerRef.current?.cleanupRemotePeer(targetPeerId);
          voiceManagerRef.current?.setRemotePeerSpeaking(targetPeerId, false);
        } catch {}
      }
      if (senderId && senderId !== targetPeerId) {
        try {
          voiceManagerRef.current?.cleanupRemotePeer(senderId);
          voiceManagerRef.current?.setRemotePeerSpeaking(senderId, false);
        } catch {}
      }

      // Close data connection if still held
      if (targetPeerId && connectionsRef.current.has(targetPeerId)) {
        try {
          connectionsRef.current.get(targetPeerId)?.close();
        } catch {}
        connectionsRef.current.delete(targetPeerId);
      }
      if (senderId && connectionsRef.current.has(senderId)) {
        try {
          connectionsRef.current.get(senderId)?.close();
        } catch {}
        connectionsRef.current.delete(senderId);
      }

      setCollaborators((prev) => {
        const next = new Map(prev);
        if (targetId) next.delete(targetId);
        if (targetPeerId) next.delete(targetPeerId);
        for (const [key, collab] of next.entries()) {
          if (
            key === targetId ||
            key === targetPeerId ||
            collab.id === targetId ||
            collab.id === targetPeerId ||
            collab.peerId === targetPeerId ||
            collab.peerId === targetId
          ) {
            next.delete(key);
          }
        }
        syncCollaboratorsToCanvas(next);
        return next;
      });
      return;
    }

    if (msg.senderId && !collaboratorsRef.current.has(msg.senderId)) {
      setCollaborators((prev) => {
        if (prev.has(msg.senderId)) return prev;
        const next = new Map(prev);
        next.set(msg.senderId, {
          id: msg.senderId,
          peerId: senderId,
          lastSeen: Date.now(),
          username: msg.username || 'Collaborator',
          color: msg.color || COLLAB_COLORS[0],
          pointer: { x: 0, y: 0, tool: 'selection' },
          button: 'up',
        });
        syncCollaboratorsToCanvas(next);
        return next;
      });
    }

    if (msg.type === 'pointer') {
      setCollaborators((prev) => {
        const next = new Map(prev);
        const existing = next.get(msg.senderId) || {};
        next.set(msg.senderId, {
          ...existing,
          id: msg.senderId,
          peerId: senderId || existing.peerId,
          lastSeen: Date.now(),
          username: msg.username || existing.username || 'Collaborator',
          color: msg.color || existing.color || COLLAB_COLORS[0],
          pointer: {
            x: msg.x,
            y: msg.y,
            tool: msg.tool || 'selection',
            laserMode: msg.laserMode || 'beam',
          },
          button: msg.button || 'up',
          selectedElementIds: msg.selectedElementIds || {},
        });
        syncCollaboratorsToCanvas(next);
        return next;
      });
    } else if (msg.type === 'heartbeat') {
      const existing = collaboratorsRef.current.get(msg.senderId);
      if (existing) {
        existing.lastSeen = Date.now();
        if (senderId && !existing.peerId) {
          existing.peerId = senderId;
        }
      }
    } else if (msg.type === 'scene') {
      const currentApi = getAPI();
      if (msg.elements && currentApi) {
        let elementsToApply = msg.elements;
        const queue = offlineQueueRef.current;
        const queueKey = offlineQueueKeyRef.current;
        let resolvedOfflineQueue = false;
        if (queue) {
          const localElements = currentApi.getSceneElements?.() || queue.localElements;
          const reconciliation = mergeOfflineScenes(
            queue.baseElements,
            localElements,
            msg.elements
          );
          if (reconciliation.conflicts.length > 0) {
            const nextConflict = {
              baseElements: queue.baseElements,
              localElements,
              remoteElements: msg.elements,
              conflicts: reconciliation.conflicts,
              storageKey: queueKey,
            };
            pendingConflictRef.current = nextConflict;
            setPendingConflict(nextConflict);
            return;
          }
          elementsToApply = reconciliation.elements;
          resolvedOfflineQueue = true;
        }

        const localElementsBefore = currentApi.getSceneElements?.() || [];
        isRemoteUpdateRef.current = true;
        try {
          currentApi.updateScene({
            elements: elementsToApply,
            commitToHistory: resolvedOfflineQueue,
          });
          lastSyncedSceneRef.current = elementsToApply;
          if (resolvedOfflineQueue) {
            clearOfflineQueue(queueKey);
            offlineQueueRef.current = null;
            offlineQueueKeyRef.current = queueKey;
          }
          // If receiver had an empty canvas and newcomer/host has sent diagram elements,
          // automatically frame/center the viewport so both users are working in the same location!
          if (localElementsBefore.length === 0 && elementsToApply.length > 0) {
            setTimeout(() => {
              try {
                currentApi.scrollToContent?.(elementsToApply, { animate: true, duration: 420 });
              } catch {}
            }, 80);
          }
        } finally {
          setTimeout(() => {
            isRemoteUpdateRef.current = false;
            if (resolvedOfflineQueue) {
              setPendingConflict(null);
              pendingConflictRef.current = null;
              lastBroadcastElementsSigRef.current = getSceneSignature(elementsToApply);
              broadcastDataRef.current?.({ type: 'scene', elements: elementsToApply });
            }
          }, 60);
        }
      }
    } else if (msg.type === 'chat') {
      setChatMessages((prev) => [
        ...prev.slice(-40),
        {
          id: msg.id || Date.now().toString(),
          senderId: msg.senderId,
          senderName: msg.username,
          color: msg.color,
          text: msg.text,
          isReaction: msg.isReaction,
          timestamp: msg.timestamp || Date.now(),
        },
      ]);
    } else if (msg.type === 'voice-state') {
      const targetSenderId = msg.senderId || senderId;
      if (targetSenderId) {
        setCollaborators((prev) => {
          const existing = prev.get(targetSenderId) || {};
          const inVoice = Boolean(msg.inVoice);
          const isVoiceMuted = Boolean(msg.isMuted);
          const isVoiceSpeaking = Boolean(msg.isSpeaking);
          const voicePeerId = msg.peerId || existing.voicePeerId;
          if (
            existing.inVoice === inVoice &&
            existing.isVoiceMuted === isVoiceMuted &&
            existing.isVoiceSpeaking === isVoiceSpeaking &&
            existing.voicePeerId === voicePeerId
          ) {
            return prev;
          }
          const next = new Map(prev);
          next.set(targetSenderId, {
            ...existing,
            id: targetSenderId,
            username: msg.username || existing.username || 'Collaborator',
            inVoice,
            isVoiceMuted,
            isVoiceSpeaking,
            voicePeerId,
          });
          syncCollaboratorsToCanvas(next);
          return next;
        });
      }

      const remotePeerId = msg.peerId || (statusRef.current === 'joined' ? targetHostPeerIdRef.current : senderId);
      if (voiceManagerRef.current?.inVoice && msg.inVoice && remotePeerId && peerRef.current) {
        voiceManagerRef.current.callPeer(peerRef.current, remotePeerId);
      } else if (!msg.inVoice && remotePeerId) {
        voiceManagerRef.current?.cleanupRemotePeer(remotePeerId);
      }
    } else if (msg.type === 'screen-share-state') {
      if (!msg.isSharing && msg.peerId) {
        screenShareManagerRef.current?.removeRemoteStream(msg.peerId);
      }
      setCollaborators((prev) => {
        const existing = prev.get(msg.senderId) || {};
        if (existing.isSharingScreen === Boolean(msg.isSharing)) {
          return prev;
        }
        const next = new Map(prev);
        next.set(msg.senderId, {
          ...existing,
          isSharingScreen: Boolean(msg.isSharing),
        });
        syncCollaboratorsToCanvas(next);
        return next;
      });
    } else if (msg.type === 'voice-speaking') {
      voiceManagerRef.current?.setRemotePeerSpeaking(msg.peerId || msg.senderId, msg.isSpeaking);
      setCollaborators((prev) => {
        const existing = prev.get(msg.senderId);
        if (existing) {
          if (existing.isVoiceSpeaking === Boolean(msg.isSpeaking)) {
            return prev;
          }
          const next = new Map(prev);
          next.set(msg.senderId, {
            ...existing,
            isVoiceSpeaking: Boolean(msg.isSpeaking),
          });
          syncCollaboratorsToCanvas(next);
          return next;
        }
        return prev;
      });
    } else if (msg.type === 'scene-request') {
      const currentApi = getAPI();
      if (currentApi) {
        const elements = currentApi.getSceneElements?.() || [];
        const scenePayload = {
          type: 'scene',
          elements,
          senderId: myProfile.id,
          username: myProfile.username,
          color: myProfile.color,
        };
        const targetConn = senderId ? connectionsRef.current.get(senderId) : null;
        if (targetConn && targetConn.open) {
          targetConn.send(scenePayload);
        } else {
          broadcastDataRef.current?.(scenePayload);
        }
      }
      const presenceAck = {
        type: 'user-joined',
        senderId: myProfile.id,
        username: myProfile.username,
        color: myProfile.color,
        isAck: true,
      };
      const targetConn = senderId ? connectionsRef.current.get(senderId) : null;
      if (targetConn && targetConn.open) {
        targetConn.send(presenceAck);
      } else {
        broadcastDataRef.current?.(presenceAck);
      }
    } else if (msg.type === 'user-joined') {
      setCollaborators((prev) => {
        const next = new Map(prev);
        next.set(msg.senderId, {
          id: msg.senderId,
          peerId: senderId,
          lastSeen: Date.now(),
          username: msg.username,
          color: msg.color,
          pointer: { x: 0, y: 0, tool: 'selection' },
          button: 'up',
        });
        syncCollaboratorsToCanvas(next);
        return next;
      });

      // Presence handshake: announce our presence back to the newcomer
      if (!msg.isAck) {
        const presenceAck = {
          type: 'user-joined',
          senderId: myProfile.id,
          username: myProfile.username,
          color: myProfile.color,
          isAck: true,
        };
        const targetConn = senderId ? connectionsRef.current.get(senderId) : null;
        if (targetConn && targetConn.open) {
          targetConn.send(presenceAck);
        } else {
          broadcastDataRef.current?.(presenceAck);
        }
      }

      const currentApi = getAPI();
      // When a user joins our room, if we have diagram elements,
      // IMMEDIATELY send our full current scene to the newcomer so both users work on the exact same canvas!
      if (currentApi) {
        const myElements = currentApi.getSceneElements?.() || [];
        if (myElements.length > 0) {
          const targetConn = senderId ? connectionsRef.current.get(senderId) : null;
          const scenePayload = {
            type: 'scene',
            elements: myElements,
            senderId: myProfile.id,
            username: myProfile.username,
            color: myProfile.color,
          };
          if (targetConn && targetConn.open) {
            targetConn.send(scenePayload);
          } else {
            broadcastDataRef.current?.(scenePayload);
          }
        }
      }

      // Two-Way Initial Scene Merge:
      // If the newcomer arrived with existing diagram elements (e.g. drawn before connecting),
      // merge them with the current canvas so no diagrams are lost!
      if (Array.isArray(msg.initialElements) && msg.initialElements.length > 0 && currentApi) {
        const currentElements = currentApi.getSceneElements?.() || [];
        const reconciliation = mergeOfflineScenes([], currentElements, msg.initialElements);
        if (reconciliation.elements.length > currentElements.length) {
          isRemoteUpdateRef.current = true;
          try {
            currentApi.updateScene({ elements: reconciliation.elements, commitToHistory: false });
            lastSyncedSceneRef.current = reconciliation.elements;
            broadcastDataRef.current?.({ type: 'scene', elements: reconciliation.elements });
          } finally {
            setTimeout(() => {
              isRemoteUpdateRef.current = false;
            }, 60);
          }
        }
      }
    } else if (msg.type === 'user-left') {
      setCollaborators((prev) => {
        const next = new Map(prev);
        next.delete(msg.senderId);
        syncCollaboratorsToCanvas(next);
        return next;
      });
    }
  }, [activeAPI, myProfile.id, syncCollaboratorsToCanvas]);

  // Broadcast data to all connected WebRTC peers, Electron IPC relay, and BroadcastChannel
  const broadcastData = useCallback((data) => {
    const payload = {
      ...data,
      senderId: myProfile.id,
      username: myProfile.username,
      color: myProfile.color,
      timestamp: Date.now(),
    };

    // 0. Electron IPC Relay (instant multi-window desktop sync)
    if (typeof window !== 'undefined' && window.electronAPI?.relayCollabMessage) {
      try {
        window.electronAPI.relayCollabMessage({
          roomId: sessionRef.current?.roomId,
          payload,
        });
      } catch (e) {
        console.warn('Electron collab relay error:', e);
      }
    }

    // 1. BroadcastChannel (local multi-window / offline)
    if (broadcastChannelRef.current) {
      try {
        broadcastChannelRef.current.postMessage(payload);
      } catch (e) {
        console.warn('BroadcastChannel error:', e);
      }
    }

    // 2. WebRTC Peer Connections
    connectionsRef.current.forEach((conn) => {
      if (conn.open) {
        try {
          conn.send(payload);
        } catch (e) {
          console.warn('WebRTC send error:', e);
        }
      }
    });
  }, [myProfile]);
  broadcastDataRef.current = broadcastData;

  // Electron IPC relay listener
  useEffect(() => {
    if (typeof window === 'undefined' || !window.electronAPI?.onCollabRelay) return;
    const unsubscribe = window.electronAPI.onCollabRelay((envelope) => {
      if (!envelope || !envelope.roomId || envelope.roomId !== sessionRef.current?.roomId) return;
      handleIncomingMessage(envelope.payload, envelope.payload?.senderId);
    });
    return unsubscribe;
  }, [handleIncomingMessage]);

  const closeTransports = useCallback(() => {
    if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current);
      connectionTimeoutRef.current = null;
    }
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    if (broadcastChannelRef.current) {
      try {
        broadcastChannelRef.current.close();
      } catch {}
      broadcastChannelRef.current = null;
    }
    connectionsRef.current.forEach((conn) => {
      try {
        conn.close();
      } catch {}
    });
    connectionsRef.current.clear();
    if (peerRef.current) {
      try {
        peerRef.current.destroy();
      } catch {}
      peerRef.current = null;
    }
    targetHostPeerIdRef.current = null;
    voiceManagerRef.current?.leaveVoice();
    screenShareManagerRef.current?.cleanup();
  }, []);

  const openBroadcastChannel = useCallback((code) => {
    if (typeof BroadcastChannel === 'undefined') return;
    try {
      const channel = new BroadcastChannel(`doodle_room_${code}`);
      channel.onmessage = (event) => {
        handleIncomingMessage(event.data, event.data?.senderId);
      };
      broadcastChannelRef.current = channel;
    } catch (error) {
      console.warn('Local collaboration channel is unavailable:', error);
    }
  }, [handleIncomingMessage]);

  const failSession = useCallback((error, generation) => {
    if (generation !== sessionGenerationRef.current) return;
    const message = error?.message || 'Could not connect to the collaboration signaling service.';
    const session = sessionRef.current;
    if (session && activeAPI) queueOfflineScene(activeAPI.getSceneElements?.() || [], session);
    sessionGenerationRef.current += 1;
    statusRef.current = 'disconnected';
    voiceManagerRef.current?.leaveVoice();
    screenShareManagerRef.current?.cleanup();
    closeTransports();
    setConnectionError(message);
    setStatus('disconnected');
    setRoomId(session?.roomId || '');
  }, [activeAPI, closeTransports, queueOfflineScene]);

  const relayToOtherPeers = useCallback((payload, sourcePeerId) => {
    connectionsRef.current.forEach((conn, peerId) => {
      if (peerId === sourcePeerId || !conn.open) return;
      try {
        conn.send(payload);
      } catch (error) {
        console.warn('Could not relay collaboration data:', error);
      }
    });
  }, []);

  // Broadcast cursor movements to peers
  const broadcastPointer = useCallback(
    (sceneX, sceneY, button = 'up', selectedElementIds = {}, tool = 'selection', laserMode = 'beam') => {
      if (status === 'disconnected') return;
      broadcastData({
        type: 'pointer',
        x: sceneX,
        y: sceneY,
        button,
        selectedElementIds,
        tool,
        laserMode,
      });
    },
    [status, broadcastData]
  );

  // Broadcast canvas scene elements mutations to peers
  const broadcastScene = useCallback(
    (elements) => {
      if (isRemoteUpdateRef.current || !elements) return;

      if (statusRef.current === 'disconnected' || pendingConflictRef.current) {
        queueOfflineScene(elements);
        return;
      }

      // Quick signature to prevent redundant flooding
      const sig = getSceneSignature(elements);
      if (lastBroadcastElementsSigRef.current === sig) return;
      lastBroadcastElementsSigRef.current = sig;

      broadcastData({
        type: 'scene',
        elements,
      });
    },
    [broadcastData, queueOfflineScene]
  );

  // Send a chat message or reaction
  const sendChatMessage = useCallback(
    (text, isReaction = false) => {
      const msg = {
        type: 'chat',
        id: `chat-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        text,
        isReaction,
      };

      setChatMessages((prev) => [
        ...prev.slice(-40),
        {
          id: msg.id,
          senderId: myProfile.id,
          senderName: myProfile.username,
          color: myProfile.color,
          text,
          isReaction,
          timestamp: Date.now(),
        },
      ]);

      broadcastData(msg);
    },
    [broadcastData, myProfile]
  );

  const joinSessionRef = useRef(null);

  // Start hosting a live collaboration room
  const startHosting = useCallback(async (customRoomCode = '') => {
    // If an active local room was discovered and user didn't specify a custom room code, join that room!
    const activeLocal = discoveredRoomRef.current;
    if (!customRoomCode && activeLocal && activeLocal.roomId) {
      console.log('Discovered active local room, auto-joining instead of conflicting host:', activeLocal.roomId);
      return joinSessionRef.current?.(activeLocal.roomId);
    }
    const code = normalizeRoomCode(customRoomCode) || `DOODLE-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    const generation = ++sessionGenerationRef.current;
    closeTransports();
    sessionRef.current = { roomId: code, role: 'hosting' };
    initializeSessionQueue(code);
    setConnectionError('');
    setRoomId(code);
    statusRef.current = 'hosting';
    setStatus('hosting');

    // 1. Setup Local BroadcastChannel
    openBroadcastChannel(code);

    // 2. Setup WebRTC Peer
    try {
      const Peer = await loadPeer();
      if (generation !== sessionGenerationRef.current) return;
      const cleanPeerId = `doodledesk-host-${code.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
      const peer = new Peer(cleanPeerId, {
        debug: 1,
        config: {
          iceServers: ROBUST_ICE_SERVERS,
        },
      });

      peer.on('open', (id) => {
        if (generation !== sessionGenerationRef.current) {
          peer.destroy();
          return;
        }
        console.log('Live Collab Peer opened with ID:', id);
        // Automatically start voice talk so host is ready to talk immediately
        startVoiceCallRef.current?.();
      });

      peer.on('call', (call) => {
        if (call.metadata?.type === 'screen-share') {
          screenShareManagerRef.current?.handleIncomingScreenCall(call);
        } else {
          voiceManagerRef.current?.handleIncomingCall(call);
        }
      });

      peer.on('connection', (conn) => {
        connectionsRef.current.set(conn.peer, conn);

        const sendHostInitialData = () => {
          if (generation !== sessionGenerationRef.current) {
            conn.close();
            return;
          }
          console.log('Peer connected to host:', conn.peer);
          // Send current scene to newcomer
          const currentApi = getAPI();
          if (currentApi) {
            const elements = currentApi.getSceneElements?.() || [];
            conn.send({
              type: 'scene',
              elements,
              senderId: myProfile.id,
              username: myProfile.username,
              color: myProfile.color,
            });
          }
          conn.send({
            type: 'user-joined',
            senderId: myProfile.id,
            username: myProfile.username,
            color: myProfile.color,
          });
          if (peerRef.current) {
            conn.send({
              type: 'voice-state',
              senderId: myProfile.id,
              username: myProfile.username,
              inVoice: voiceManagerRef.current?.inVoice ?? true,
              isMuted: voiceManagerRef.current?.isMuted ?? false,
              peerId: peerRef.current.id,
            });
            setTimeout(() => {
              if (voiceManagerRef.current?.inVoice && peerRef.current) {
                voiceManagerRef.current.callPeer(peerRef.current, conn.peer);
              }
            }, 500);
          }
          if (screenShareManagerRef.current?.isSharing && peerRef.current) {
            screenShareManagerRef.current.callPeer(peerRef.current, conn.peer, myProfile);
          }
          collaboratorsRef.current.forEach((collaborator) => {
            conn.send({
              type: 'user-joined',
              senderId: collaborator.id,
              username: collaborator.username,
              color: collaborator.color,
            });
          });
        };

        if (conn.open) {
          sendHostInitialData();
        } else {
          conn.on('open', sendHostInitialData);
        }

        conn.on('data', (data) => {
          handleIncomingMessage(data, conn.peer);
          relayToOtherPeers(data, conn.peer);
        });

        conn.on('close', () => {
          connectionsRef.current.delete(conn.peer);
          const targetSenderId = peerToSenderMapRef.current.get(conn.peer) || conn.peer;
          peerToSenderMapRef.current.delete(conn.peer);
          const leftMessage = { type: 'user-left', senderId: targetSenderId, peerId: conn.peer };
          handleIncomingMessage(leftMessage, conn.peer);
          relayToOtherPeers(leftMessage, conn.peer);
        });
      });

      peer.on('error', (err) => {
        console.warn('Peer host error:', err);
        if (collaboratorsRef.current?.size > 0 && err?.type !== 'unavailable-id') {
          console.log('Host signaling error, but session remains active with collaborators.');
          return;
        }
        failSession({
          message: err?.type === 'unavailable-id'
            ? 'That room code is already in use. Leave and create a new room.'
            : (err?.message || 'Could not connect to the collaboration signaling service.'),
        }, generation);
      });

      peerRef.current = peer;
    } catch (e) {
      console.warn('PeerJS init failed:', e);
      if (generation === sessionGenerationRef.current) {
        failSession(e, generation);
      }
    }
  }, [broadcastData, closeTransports, collaborators, failSession, handleIncomingMessage, initializeSessionQueue, openBroadcastChannel, activeAPI, myProfile, relayToOtherPeers]);

  // Join an existing room
  const joinSession = useCallback(async (targetRoomCode) => {
    const code = normalizeRoomCode(targetRoomCode);
    if (!code) return;
    const generation = ++sessionGenerationRef.current;
    closeTransports();
    sessionRef.current = { roomId: code, role: 'joined' };
    initializeSessionQueue(code);
    setConnectionError('');
    setRoomId(code);
    statusRef.current = 'joined';
    setStatus('joined');

    // 1. Setup Local BroadcastChannel
    openBroadcastChannel(code);

    // Announce join and request scene over local channel
    const currentApi = getAPI();
    broadcastData({
      type: 'user-joined',
      initialElements: currentApi?.getSceneElements?.() || [],
    });
    broadcastData({
      type: 'scene-request',
    });

    // 2. Connect to Host via WebRTC Peer
    try {
      const Peer = await loadPeer();
      if (generation !== sessionGenerationRef.current) return;
      const myPeerId = `doodledesk-peer-${Math.random().toString(36).substring(2, 9)}`;
      const targetHostPeerId = `doodledesk-host-${code.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
      targetHostPeerIdRef.current = targetHostPeerId;

      const peer = new Peer(myPeerId, {
        debug: 1,
        config: {
          iceServers: ROBUST_ICE_SERVERS,
        },
      });

      peer.on('call', (call) => {
        if (call.metadata?.type === 'screen-share') {
          screenShareManagerRef.current?.handleIncomingScreenCall(call);
        } else {
          voiceManagerRef.current?.handleIncomingCall(call);
        }
      });

      let connectAttempts = 0;
      const MAX_CONNECT_ATTEMPTS = 5;
      let isConnectedToHost = false;

      const connectToHost = () => {
        if (generation !== sessionGenerationRef.current) return;
        if (peer.destroyed || peer.disconnected) return;
        if (isConnectedToHost) return;

        connectAttempts += 1;
        const conn = peer.connect(targetHostPeerId, { reliable: true });

        const sendGuestJoin = () => {
          if (generation !== sessionGenerationRef.current) {
            conn.close();
            return;
          }
          isConnectedToHost = true;
          console.log('Connected to Host Peer:', targetHostPeerId);
          connectionsRef.current.set(targetHostPeerId, conn);
          const currentApi = getAPI();
          const initialElements = currentApi?.getSceneElements?.() || [];
          conn.send({
            type: 'user-joined',
            senderId: myProfile.id,
            username: myProfile.username,
            color: myProfile.color,
            initialElements,
          });
          // Explicitly request host scene so guest canvas matches host immediately
          conn.send({
            type: 'scene-request',
            senderId: myProfile.id,
          });
          // Automatically start voice talk so guest is ready to talk immediately
          startVoiceCallRef.current?.();
        };

        if (conn.open) {
          sendGuestJoin();
        } else {
          conn.on('open', sendGuestJoin);
        }

        conn.on('data', (data) => {
          handleIncomingMessage(data, targetHostPeerId);
        });

        conn.on('close', () => {
          connectionsRef.current.delete(targetHostPeerId);
          isConnectedToHost = false;
          const leftMessage = { type: 'user-left', senderId: targetHostPeerId, peerId: targetHostPeerId };
          handleIncomingMessage(leftMessage, targetHostPeerId);
          if (collaboratorsRef.current?.size > 0) {
            console.log('Host connection closed, but session remains active with peers.');
            return;
          }
          failSession(new Error('The host connection closed. Check the room code or network and reconnect.'), generation);
        });

        conn.on('error', (error) => {
          console.warn('Peer connection error:', error);
          if (!isConnectedToHost && connectAttempts < MAX_CONNECT_ATTEMPTS) {
            retryTimeoutRef.current = setTimeout(connectToHost, 1500);
            return;
          }
          if (collaboratorsRef.current?.size > 0) return;
          failSession(new Error(error?.message || 'Could not connect to the host. Check the room code and network.'), generation);
        });
      };

      peer.on('open', () => {
        if (generation !== sessionGenerationRef.current) {
          peer.destroy();
          return;
        }
        connectToHost();
      });

      peer.on('error', (error) => {
        console.warn('Peer join error:', error);
        if (error.type === 'peer-unavailable' && connectAttempts < MAX_CONNECT_ATTEMPTS) {
          console.log(`Host peer ${targetHostPeerId} not ready yet. Retrying in 1.5s (attempt ${connectAttempts}/${MAX_CONNECT_ATTEMPTS})...`);
          retryTimeoutRef.current = setTimeout(connectToHost, 1500);
          return;
        }
        if (collaboratorsRef.current?.size > 0) {
          console.log('Peer error occurred, but local collaborators are active. Keeping room open.');
          return;
        }
        failSession(error, generation);
      });

      peerRef.current = peer;
    } catch (e) {
      console.warn('Peer join failed:', e);
      if (generation === sessionGenerationRef.current) {
        failSession(e, generation);
      }
    }
  }, [broadcastData, closeTransports, failSession, handleIncomingMessage, initializeSessionQueue, myProfile, openBroadcastChannel]);
  joinSessionRef.current = joinSession;

  // Heartbeat & stale collaborator pruning
  useEffect(() => {
    if (status === 'disconnected') return;

    const heartbeatInterval = setInterval(() => {
      broadcastDataRef.current?.({ type: 'heartbeat' });
    }, 3000);

    const prunerInterval = setInterval(() => {
      const now = Date.now();
      setCollaborators((prev) => {
        let changed = false;
        const next = new Map(prev);
        for (const [key, collab] of next.entries()) {
          if (collab.lastSeen && now - collab.lastSeen > 8000) {
            console.log('Pruning disconnected collaborator:', collab.username, key);
            next.delete(key);
            changed = true;
          }
        }
        if (changed) {
          syncCollaboratorsToCanvas(next);
          return next;
        }
        return prev;
      });
    }, 2000);

    return () => {
      clearInterval(heartbeatInterval);
      clearInterval(prunerInterval);
    };
  }, [status, syncCollaboratorsToCanvas]);

  // Leave active session
  const leaveSession = useCallback(() => {
    if (sessionRef.current && activeAPI) {
      queueOfflineScene(activeAPI.getSceneElements?.() || []);
      persistPendingQueue();
    }
    sessionGenerationRef.current += 1;
    statusRef.current = 'disconnected';

    // 1. Remove room parameter from URL in browser address bar
    if (typeof window !== 'undefined' && window.location) {
      try {
        const url = new URL(window.location.href);
        if (url.searchParams.has('room')) {
          url.searchParams.delete('room');
          window.history.replaceState({}, document.title, url.pathname + (url.search ? url.search : '') + url.hash);
        }
      } catch (err) {
        console.warn('Could not clean room URL param:', err);
      }
    }

    // 2. Broadcast user-left with full peer ID and sender info
    const leftPayload = {
      type: 'user-left',
      senderId: myProfile.id,
      peerId: peerRef.current?.id,
      username: myProfile.username,
    };
    broadcastData(leftPayload);

    // 3. Stop voice and screen share
    try {
      voiceManagerRef.current?.leaveVoice();
    } catch {}
    try {
      screenShareManagerRef.current?.cleanup();
    } catch {}

    // 4. Close transports and destroy peer
    closeTransports();

    // 5. Reset local collaboration state immediately
    setCollaborators(new Map());
    syncCollaboratorsToCanvas(new Map());
    setConnectionError('');
    setStatus('disconnected');
    setRoomId('');
    sessionRef.current = null;
    pendingConflictRef.current = null;
    setPendingConflict(null);
  }, [activeAPI, broadcastData, closeTransports, myProfile, persistPendingQueue, queueOfflineScene, syncCollaboratorsToCanvas]);

  const reconnectSession = useCallback(() => {
    const session = sessionRef.current;
    if (!session) return;
    return session.role === 'hosting'
      ? startHosting(session.roomId)
      : joinSession(session.roomId);
  }, [joinSession, startHosting]);

  const resolveOfflineConflict = useCallback((choices) => {
    const conflict = pendingConflictRef.current;
    if (!conflict || !activeAPI) return false;

    const localElements = activeAPI.getSceneElements?.() || [];
    const reconciliation = mergeOfflineScenes(
      conflict.baseElements,
      localElements,
      conflict.remoteElements,
      choices
    );
    const unresolved = reconciliation.conflicts.filter(({ id }) => !choices?.[id]);
    if (unresolved.length > 0) {
      const nextConflict = { ...conflict, localElements, conflicts: unresolved };
      pendingConflictRef.current = nextConflict;
      setPendingConflict(nextConflict);
      return false;
    }

    isRemoteUpdateRef.current = true;
    try {
      activeAPI.updateScene({
        elements: reconciliation.elements,
        commitToHistory: true,
      });
      lastSyncedSceneRef.current = reconciliation.elements;
      clearOfflineQueue(conflict.storageKey);
      offlineQueueRef.current = null;
      offlineQueueKeyRef.current = conflict.storageKey;
      pendingQueueWriteRef.current = null;
      pendingConflictRef.current = null;
      setPendingConflict(null);
      setOfflineQueueError('');
      lastBroadcastElementsSigRef.current = getSceneSignature(reconciliation.elements);
      broadcastData({
        type: 'scene',
        elements: reconciliation.elements,
      });
      return true;
    } catch (error) {
      console.error('Could not apply offline collaboration changes:', error);
      setOfflineQueueError(`Could not apply queued changes: ${error.message}`);
      return false;
    } finally {
      isRemoteUpdateRef.current = false;
    }
  }, [activeAPI, broadcastData]);

  const leaveSessionRef = useRef(leaveSession);
  leaveSessionRef.current = leaveSession;

  // Clean up strictly on unmount and notify peers when window unloads/closes
  useEffect(() => {
    const handleUnload = () => {
      leaveSessionRef.current?.();
    };
    window.addEventListener('beforeunload', handleUnload);
    window.addEventListener('pagehide', handleUnload);
    return () => {
      window.removeEventListener('beforeunload', handleUnload);
      window.removeEventListener('pagehide', handleUnload);
      leaveSessionRef.current?.();
    };
  }, []);

  const startVoiceCall = useCallback(async () => {
    if (!voiceManagerRef.current) return false;
    setVoiceError('');
    const peerIdSet = new Set(Array.from(connectionsRef.current.keys()));
    collaboratorsRef.current.forEach((collab) => {
      if (collab.voicePeerId) peerIdSet.add(collab.voicePeerId);
    });
    if (statusRef.current === 'joined' && targetHostPeerIdRef.current) {
      peerIdSet.add(targetHostPeerIdRef.current);
    }
    const peerIds = Array.from(peerIdSet);

    const success = await voiceManagerRef.current.startVoice({
      peer: peerRef.current,
      peerIds,
    });
    if (success) {
      broadcastData({
        type: 'voice-state',
        inVoice: true,
        isMuted: false,
        peerId: peerRef.current?.id,
      });

      // Call connected peers immediately now that microphone is active
      if (peerRef.current) {
        connectionsRef.current.forEach((conn, peerId) => {
          voiceManagerRef.current.callPeer(peerRef.current, peerId);
        });
        if (targetHostPeerIdRef.current) {
          voiceManagerRef.current.callPeer(peerRef.current, targetHostPeerIdRef.current);
        }
      }
    }
    return success;
  }, [broadcastData]);
  startVoiceCallRef.current = startVoiceCall;

  const leaveVoiceCall = useCallback(() => {
    if (!voiceManagerRef.current) return;
    voiceManagerRef.current.leaveVoice();
    broadcastData({
      type: 'voice-state',
      inVoice: false,
      peerId: peerRef.current?.id,
    });
  }, [broadcastData]);

  const toggleVoiceMute = useCallback((override) => {
    if (!voiceManagerRef.current) return false;
    if (!voiceManagerRef.current.inVoice) {
      startVoiceCallRef.current?.();
      return false;
    }
    const nextMuted = voiceManagerRef.current.toggleMute(override);
    broadcastData({
      type: 'voice-state',
      inVoice: true,
      isMuted: nextMuted,
      peerId: peerRef.current?.id,
    });
    return nextMuted;
  }, [broadcastData]);

  const toggleVoiceDeafen = useCallback((override) => {
    if (!voiceManagerRef.current) return;
    return voiceManagerRef.current.toggleDeafen(override);
  }, []);

  const startScreenShare = useCallback(async () => {
    if (!screenShareManagerRef.current) return false;
    setScreenShareError('');
    const peerIds = Array.from(connectionsRef.current.keys());
    const success = await screenShareManagerRef.current.startScreenShare({
      peer: peerRef.current,
      peerIds,
      myProfile,
    });
    if (success) {
      broadcastData({
        type: 'screen-share-state',
        isSharing: true,
        peerId: peerRef.current?.id,
        username: myProfile.username,
      });
    }
    return success;
  }, [broadcastData, myProfile]);

  const stopScreenShare = useCallback(() => {
    if (!screenShareManagerRef.current) return;
    screenShareManagerRef.current.stopScreenShare();
    broadcastData({
      type: 'screen-share-state',
      isSharing: false,
      peerId: peerRef.current?.id,
      username: myProfile.username,
    });
  }, [broadcastData, myProfile]);

  const syncSceneNow = useCallback(() => {
    const currentApi = getAPI();
    if (!currentApi) return 0;
    const elements = currentApi.getSceneElements?.() || [];
    lastBroadcastElementsSigRef.current = null;
    broadcastData({
      type: 'scene',
      elements,
      force: true,
    });
    broadcastData({
      type: 'scene-request',
    });
    return elements.length;
  }, [getAPI, broadcastData]);

  return {
    status,
    connectionError,
    roomId,
    discoveredRoom,
    myProfile,
    setMyProfile,
    collaborators,
    chatMessages,
    startHosting,
    joinSession,
    leaveSession,
    broadcastPointer,
    broadcastScene,
    sendChatMessage,
    reconnectSession,
    pendingConflict,
    resolveOfflineConflict,
    offlineQueueError,
    voiceState,
    voiceError,
    startVoiceCall,
    leaveVoiceCall,
    toggleVoiceMute,
    toggleVoiceDeafen,
    isVoiceSupported: isVoiceSupported(),
    syncSceneNow,
    screenShareState,
    screenShareError,
    startScreenShare,
    stopScreenShare,
    isScreenShareSupported: isScreenShareSupported(),
  };
}

export default useLiveCollaboration;
