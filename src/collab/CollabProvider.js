/**
 * CollabProvider Adapter Interface
 *
 * Doodle Desk real-time peer-to-peer collaboration and cursor sync.
 *
 * This adapter defines the interface where a future self-hosted backend or WebRTC/WebSocket
 * collaboration server can plug into the desktop client.
 *
 * TODO: Implement self-hosted room backend integration via CollabProvider.
 */

export class CollabProvider {
  constructor(options = {}) {
    this.roomId = options.roomId || null;
    this.roomKey = options.roomKey || null;
    this.isConnected = false;
    this.listeners = new Map();
  }

  /**
   * Connect to a collaboration room
   * @param {string} roomId
   * @param {string} roomKey
   */
  async connect(roomId, roomKey) {
    console.warn('[CollabProvider] Real-time collaboration is disabled in desktop offline mode.');
    this.roomId = roomId;
    this.roomKey = roomKey;
    this.isConnected = false;
    this.emit('status-changed', { isConnected: false, reason: 'offline_mode' });
    return false;
  }

  /**
   * Disconnect from collaboration session
   */
  async disconnect() {
    this.isConnected = false;
    this.emit('status-changed', { isConnected: false });
  }

  /**
   * Broadcast local scene changes
   */
  broadcastScene(elements, appState) {
    // TODO: Connect to WebSocket relay
  }

  /**
   * Broadcast cursor movements
   */
  broadcastCursor(pointer) {
    // TODO: Relay pointer coordinates
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
    return () => this.listeners.get(event)?.delete(callback);
  }

  emit(event, data) {
    const handlers = this.listeners.get(event);
    if (handlers) {
      for (const handler of handlers) {
        try {
          handler(data);
        } catch (e) {
          console.error('[CollabProvider] error in event handler:', e);
        }
      }
    }
  }
}

export const defaultCollabProvider = new CollabProvider();
