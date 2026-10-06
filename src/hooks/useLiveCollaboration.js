import { useState, useEffect, useRef, useCallback } from 'react';

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

export function useLiveCollaboration({ doodleAPI, canvasAPI }) {
  const activeAPI = doodleAPI || canvasAPI;
  const [status, setStatus] = useState('disconnected'); // 'disconnected' | 'hosting' | 'joined'
  const [connectionError, setConnectionError] = useState('');
  const [roomId, setRoomId] = useState('');
  const [collaborators, setCollaborators] = useState(new Map());
  const [chatMessages, setChatMessages] = useState([]);

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
  statusRef.current = status;

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
        isRemoteUpdateRef.current = true;
        try {
          activeAPI.updateScene({
            elements: msg.elements,
            commitToHistory: false,
          });
        } finally {
          setTimeout(() => {
            isRemoteUpdateRef.current = false;
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
    sessionGenerationRef.current += 1;
    statusRef.current = 'disconnected';
    closeTransports();
    setConnectionError(message);
    setStatus('disconnected');
    setRoomId('');
  }, [closeTransports]);

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
      if (status === 'disconnected' || isRemoteUpdateRef.current || !elements) return;

      // Quick signature to prevent redundant flooding
      const sig = getSceneSignature(elements);
      if (lastBroadcastElementsSigRef.current === sig) return;
      lastBroadcastElementsSigRef.current = sig;

      broadcastData({
        type: 'scene',
        elements,
      });
    },
    [status, broadcastData]
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
  }, [broadcastData, closeTransports, collaborators, failSession, handleIncomingMessage, openBroadcastChannel, activeAPI, myProfile, relayToOtherPeers]);

  // Join an existing room
  const joinSession = useCallback(async (targetRoomCode) => {
    const code = normalizeRoomCode(targetRoomCode);
    if (!code) return;
    const generation = ++sessionGenerationRef.current;
    closeTransports();
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
  }, [broadcastData, closeTransports, failSession, handleIncomingMessage, myProfile, openBroadcastChannel]);

  // Leave active session
  const leaveSession = useCallback(() => {
    if (statusRef.current === 'disconnected') return;
    sessionGenerationRef.current += 1;
    statusRef.current = 'disconnected';

    broadcastData({ type: 'user-left' });
    closeTransports();

    setCollaborators(new Map());
    syncCollaboratorsToCanvas(new Map());
    setConnectionError('');
    setStatus('disconnected');
    setRoomId('');
  }, [broadcastData, closeTransports, syncCollaboratorsToCanvas]);

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
  };
}

export default useLiveCollaboration;
