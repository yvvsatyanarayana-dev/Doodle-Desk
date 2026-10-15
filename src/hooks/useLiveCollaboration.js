import { useState, useEffect, useRef, useCallback } from 'react';
import { cancelIdleTask, scheduleIdleTask } from '../utils/idleTask.js';
import {
  clearOfflineQueue,
  mergeOfflineScenes,
  offlineQueueStorageKey,
  readOfflineQueue,
  writeOfflineQueue,
} from '../engine/offlineCollaboration.js';

let peerModulePromise;
const loadPeer = () => {
  peerModulePromise ||= import('peerjs').then((module) => module.Peer);
  return peerModulePromise;
};

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

const USER_PREFS_KEY = 'doodle_collab_user_profile';

const createSessionId = () => `usr-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 9)}`;
const normalizeRoomCode = (roomCode) => String(roomCode || '').trim().toUpperCase();
const getSceneSignature = (elements) => elements
  .map((element) => `${element.id}:${element.version || 1}:${element.versionNonce || 0}:${element.isDeleted ? 1 : 0}`)
  .join('|');

export function useLiveCollaboration({ doodleAPI, canvasAPI, workspaceId, fileId }) {
  const activeAPI = doodleAPI || canvasAPI;
  const [status, setStatus] = useState('disconnected'); // 'disconnected' | 'hosting' | 'joined'
  const [connectionError, setConnectionError] = useState('');
  const [roomId, setRoomId] = useState('');
  const [collaborators, setCollaborators] = useState(new Map());
  const [chatMessages, setChatMessages] = useState([]);
  const [pendingConflict, setPendingConflict] = useState(null);
  const [offlineQueueError, setOfflineQueueError] = useState('');

  const [myProfile, setMyProfile] = useState(() => {
    try {
      const saved = localStorage.getItem(USER_PREFS_KEY);
      if (saved) return { ...JSON.parse(saved), id: createSessionId() };
    } catch {}
    const randomIdx = Math.floor(Math.random() * COLLAB_COLORS.length);
    return {
      id: createSessionId(),
      username: `Doodler ${Math.floor(100 + Math.random() * 900)}`,
      color: COLLAB_COLORS[randomIdx],
    };
  });

  const peerRef = useRef(null);
  const connectionsRef = useRef(new Map());
  const broadcastChannelRef = useRef(null);
  const isRemoteUpdateRef = useRef(false);
  const lastBroadcastElementsSigRef = useRef(null);
  const statusRef = useRef(status);
  const sessionGenerationRef = useRef(0);
  const sessionRef = useRef(null);
  const lastSyncedSceneRef = useRef(null);
  const offlineQueueRef = useRef(null);
  const offlineQueueKeyRef = useRef(null);
  const pendingConflictRef = useRef(null);
  const pendingQueueWriteRef = useRef(null);
  const pendingQueueTaskRef = useRef(null);
  const broadcastDataRef = useRef(null);
  statusRef.current = status;

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
    const handleBeforeUnload = () => persistPendingQueue();
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      persistPendingQueue();
    };
  }, [persistPendingQueue]);

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

    if (msg.type === 'pointer') {
      setCollaborators((prev) => {
        const next = new Map(prev);
        const existing = next.get(msg.senderId) || {};
        next.set(msg.senderId, {
          ...existing,
          id: msg.senderId,
          username: msg.username || existing.username || 'Collaborator',
          color: msg.color || existing.color || COLLAB_COLORS[0],
          pointer: {
            x: msg.x,
            y: msg.y,
            tool: msg.tool || 'selection',
          },
          button: msg.button || 'up',
          selectedElementIds: msg.selectedElementIds || {},
        });
        syncCollaboratorsToCanvas(next);
        return next;
      });
    } else if (msg.type === 'scene') {
      if (msg.elements && activeAPI) {
        let elementsToApply = msg.elements;
        const queue = offlineQueueRef.current;
        const queueKey = offlineQueueKeyRef.current;
        let resolvedOfflineQueue = false;
        if (queue) {
          const localElements = activeAPI.getSceneElements?.() || queue.localElements;
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

        isRemoteUpdateRef.current = true;
        try {
          activeAPI.updateScene({
            elements: elementsToApply,
            commitToHistory: resolvedOfflineQueue,
          });
          lastSyncedSceneRef.current = elementsToApply;
          if (resolvedOfflineQueue) {
            clearOfflineQueue(queueKey);
            offlineQueueRef.current = null;
            offlineQueueKeyRef.current = queueKey;
          }
        } finally {
          setTimeout(() => {
            isRemoteUpdateRef.current = false;
            if (resolvedOfflineQueue) {
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
    } else if (msg.type === 'user-joined') {
      setCollaborators((prev) => {
        const next = new Map(prev);
        next.set(msg.senderId, {
          id: msg.senderId,
          username: msg.username,
          color: msg.color,
          pointer: { x: 0, y: 0, tool: 'selection' },
          button: 'up',
        });
        syncCollaboratorsToCanvas(next);
        return next;
      });
    } else if (msg.type === 'user-left') {
      setCollaborators((prev) => {
        const next = new Map(prev);
        next.delete(msg.senderId);
        syncCollaboratorsToCanvas(next);
        return next;
      });
    }
  }, [activeAPI, myProfile.id, syncCollaboratorsToCanvas]);

  // Broadcast data to all connected WebRTC peers and BroadcastChannel
  const broadcastData = useCallback((data) => {
    const payload = {
      ...data,
      senderId: myProfile.id,
      username: myProfile.username,
      color: myProfile.color,
      timestamp: Date.now(),
    };

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

  const closeTransports = useCallback(() => {
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
    (sceneX, sceneY, button = 'up', selectedElementIds = {}) => {
      if (status === 'disconnected') return;
      broadcastData({
        type: 'pointer',
        x: sceneX,
        y: sceneY,
        button,
        selectedElementIds,
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

  // Start hosting a live collaboration room
  const startHosting = useCallback(async (customRoomCode = '') => {
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
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:global.stun.twilio.com:3478' },
          ],
        },
      });

      peer.on('open', (id) => {
        if (generation !== sessionGenerationRef.current) {
          peer.destroy();
          return;
        }
        console.log('Live Collab Peer opened with ID:', id);
      });

      peer.on('connection', (conn) => {
        connectionsRef.current.set(conn.peer, conn);

        conn.on('open', () => {
          if (generation !== sessionGenerationRef.current) {
            conn.close();
            return;
          }
          console.log('Peer connected to host:', conn.peer);
          // Send current scene to newcomer
          if (activeAPI) {
            const elements = activeAPI.getSceneElements?.() || [];
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
          collaborators.forEach((collaborator) => {
            conn.send({
              type: 'user-joined',
              senderId: collaborator.id,
              username: collaborator.username,
              color: collaborator.color,
            });
          });
        });

        conn.on('data', (data) => {
          handleIncomingMessage(data, conn.peer);
          relayToOtherPeers(data, conn.peer);
        });

        conn.on('close', () => {
          connectionsRef.current.delete(conn.peer);
          const leftMessage = { type: 'user-left', senderId: conn.peer };
          handleIncomingMessage(leftMessage, conn.peer);
          relayToOtherPeers(leftMessage, conn.peer);
        });
      });

      peer.on('error', (err) => {
        console.warn('Peer host error:', err);
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

    // Announce join over local channel
    broadcastData({ type: 'user-joined' });

    // 2. Connect to Host via WebRTC Peer
    try {
      const Peer = await loadPeer();
      if (generation !== sessionGenerationRef.current) return;
      const myPeerId = `doodledesk-peer-${Math.random().toString(36).substring(2, 9)}`;
      const targetHostPeerId = `doodledesk-host-${code.toLowerCase().replace(/[^a-z0-9]/g, '')}`;

      const peer = new Peer(myPeerId, {
        debug: 1,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:global.stun.twilio.com:3478' },
          ],
        },
      });

      peer.on('open', () => {
        if (generation !== sessionGenerationRef.current) {
          peer.destroy();
          return;
        }
        const conn = peer.connect(targetHostPeerId, { reliable: true });

        conn.on('open', () => {
          console.log('Connected to Host Peer:', targetHostPeerId);
          connectionsRef.current.set(targetHostPeerId, conn);
          conn.send({
            type: 'user-joined',
            senderId: myProfile.id,
            username: myProfile.username,
            color: myProfile.color,
          });
        });

        conn.on('data', (data) => {
          handleIncomingMessage(data, targetHostPeerId);
        });

        conn.on('close', () => {
          connectionsRef.current.delete(targetHostPeerId);
          failSession(new Error('The host connection closed. Check the room code or network and reconnect.'), generation);
        });

        conn.on('error', (error) => {
          console.warn('Peer connection error:', error);
          failSession(new Error(error?.message || 'Could not connect to the host. Check the room code and network.'), generation);
        });
      });

      peer.on('error', (error) => {
        console.warn('Peer join error:', error);
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

  // Leave active session
  const leaveSession = useCallback(() => {
    if (sessionRef.current && activeAPI) {
      queueOfflineScene(activeAPI.getSceneElements?.() || []);
      persistPendingQueue();
    }
    sessionGenerationRef.current += 1;
    statusRef.current = 'disconnected';

    broadcastData({ type: 'user-left' });
    closeTransports();

    setCollaborators(new Map());
    syncCollaboratorsToCanvas(new Map());
    setConnectionError('');
    setStatus('disconnected');
    setRoomId('');
    sessionRef.current = null;
    pendingConflictRef.current = null;
    setPendingConflict(null);
  }, [activeAPI, broadcastData, closeTransports, persistPendingQueue, queueOfflineScene, syncCollaboratorsToCanvas]);

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

  // Clean up strictly on unmount
  useEffect(() => {
    return () => {
      leaveSessionRef.current?.();
    };
  }, []);

  return {
    status,
    connectionError,
    roomId,
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
  };
}

export default useLiveCollaboration;
