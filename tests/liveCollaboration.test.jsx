import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useLiveCollaboration } from '../src/hooks/useLiveCollaboration';
import LiveCollabModal from '../src/components/LiveCollabModal';

const mocks = vi.hoisted(() => {
  class FakeConnection {
    constructor(peer) {
      this.peer = peer;
      this.open = false;
      this.handlers = new Map();
      this.sent = [];
      FakeConnection.instances.push(this);
    }

    on(event, callback) {
      const handlers = this.handlers.get(event) || [];
      handlers.push(callback);
      this.handlers.set(event, handlers);
      return this;
    }

    emit(event, value) {
      for (const callback of this.handlers.get(event) || []) callback(value);
    }

    send(value) {
      this.sent.push(value);
    }

    close() {
      this.emit('close');
    }
  }
  FakeConnection.instances = [];

  class FakePeer {
    constructor(id, options) {
      this.id = id;
      this.options = options;
      this.handlers = new Map();
      FakePeer.instances.push(this);
    }

    on(event, callback) {
      const handlers = this.handlers.get(event) || [];
      handlers.push(callback);
      this.handlers.set(event, handlers);
      return this;
    }

    emit(event, value) {
      for (const callback of this.handlers.get(event) || []) callback(value);
    }

    connect(peerId) {
      const connection = new FakeConnection(peerId);
      this.connection = connection;
      return connection;
    }

    call(peerId, stream) {
      const mediaConn = {
        peer: peerId,
        open: true,
        handlers: new Map(),
        on(event, callback) {
          const handlers = this.handlers.get(event) || [];
          handlers.push(callback);
          this.handlers.set(event, handlers);
          return this;
        },
        emit(event, value) {
          for (const callback of this.handlers.get(event) || []) callback(value);
        },
        answer: vi.fn(),
        close: vi.fn(),
      };
      return mediaConn;
    }

    destroy() {
      this.destroyed = true;
    }
  }
  FakePeer.instances = [];

  return { FakePeer, FakeConnection };
});

vi.mock('peerjs', () => ({ Peer: mocks.FakePeer }));

let root;
let hook;
let container;

function HookHarness({ api }) {
  hook = useLiveCollaboration({ doodleAPI: api });
  return null;
}

class FakeBroadcastChannel {
  static instances = [];

  constructor(name) {
    this.name = name;
    this.messages = [];
    FakeBroadcastChannel.instances.push(this);
  }

  postMessage(message) {
    this.messages.push(message);
  }

  close() {
    this.closed = true;
  }
}

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  globalThis.BroadcastChannel = FakeBroadcastChannel;
  FakeBroadcastChannel.instances = [];
  mocks.FakePeer.instances = [];
  mocks.FakeConnection.instances = [];
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  hook = null;
});

afterEach(() => {
  if (root) {
    act(() => root.unmount());
  }
  container?.remove();
  delete globalThis.BroadcastChannel;
  delete globalThis.IS_REACT_ACT_ENVIRONMENT;
});

describe('live collaboration', () => {
  it('starts hosting without passing the click event as a room code', () => {
    const startHosting = vi.fn();
    const api = {
      getSceneElements: () => [],
      updateScene: vi.fn(),
    };

    act(() => {
      root.render(
        <LiveCollabModal
          isOpen
          onClose={() => {}}
          status="disconnected"
          roomId=""
          myProfile={{ id: 'local-user', username: 'Doodler', color: { background: '#3b82f6' } }}
          setMyProfile={() => {}}
          collaborators={new Map()}
          chatMessages={[]}
          startHosting={startHosting}
          joinSession={() => {}}
          leaveSession={() => {}}
          sendChatMessage={() => {}}
          onFollowCollaborator={() => {}}
        />
      );
    });

    const hostButton = Array.from(container.querySelectorAll('button')).find((button) => button.textContent.includes('Create Live Room'));
    expect(hostButton).toBeTruthy();
    act(() => hostButton.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    expect(startHosting).toHaveBeenCalledOnce();
    expect(startHosting).toHaveBeenCalledWith();
  });

  it('starts a normalized room and relays peer messages to the other guests', async () => {
    const api = {
      getSceneElements: () => [{ id: 'shape-1', version: 1 }],
      updateScene: vi.fn(),
    };

    act(() => {
      root.render(<HookHarness api={api} />);
    });

    await act(async () => {
      await hook.startHosting('  Team Alpha  ');
    });

    expect(hook.status).toBe('hosting');
    expect(hook.roomId).toBe('TEAM ALPHA');
    expect(mocks.FakePeer.instances[0].id).toBe('doodledesk-host-teamalpha');

    const peer = mocks.FakePeer.instances[0];
    const firstGuest = new mocks.FakeConnection('guest-1');
    const secondGuest = new mocks.FakeConnection('guest-2');

    await act(async () => {
      peer.emit('connection', firstGuest);
      firstGuest.open = true;
      firstGuest.emit('open');
      peer.emit('connection', secondGuest);
      secondGuest.open = true;
      secondGuest.emit('open');
    });

    expect(secondGuest.sent).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'scene' }),
      expect.objectContaining({ type: 'user-joined', senderId: hook.myProfile.id }),
    ]));

    await act(async () => {
      secondGuest.emit('data', {
        type: 'chat',
        id: 'chat-from-guest',
        senderId: 'guest-2',
        username: 'Guest Two',
        text: 'Hello room',
      });
    });

    expect(firstGuest.sent).toContainEqual(expect.objectContaining({
      type: 'chat',
      id: 'chat-from-guest',
      senderId: 'guest-2',
    }));
    expect(hook.chatMessages).toContainEqual(expect.objectContaining({ text: 'Hello room' }));

    await act(async () => {
      secondGuest.emit('data', {
        type: 'voice-state',
        senderId: 'guest-2',
        inVoice: true,
        isMuted: false,
        isSpeaking: true,
        peerId: 'guest-2-peer',
      });
    });

    expect(hook.collaborators.get('guest-2')).toEqual(expect.objectContaining({
      inVoice: true,
      isVoiceSpeaking: true,
      voicePeerId: 'guest-2-peer',
    }));

    act(() => hook.leaveSession());
    expect(hook.status).toBe('disconnected');
    expect(peer.destroyed).toBe(true);
  });

  it('merges incoming guest initial elements so neither friend loses their diagrams', async () => {
    const api = {
      getSceneElements: vi.fn(() => [{ id: 'host-scribble-1', type: 'freedraw', version: 1 }]),
      updateScene: vi.fn(),
    };

    act(() => {
      root.render(<HookHarness api={api} />);
    });

    await act(async () => {
      await hook.startHosting('DIAGRAM-ROOM');
    });

    const peer = mocks.FakePeer.instances[0];
    const guestConn = new mocks.FakeConnection('guest-friend');

    await act(async () => {
      peer.emit('connection', guestConn);
      guestConn.open = true;
      guestConn.emit('open');
    });

    // Guest joins with diagrams already drawn on their canvas ("Requirements", "Easy UI")
    await act(async () => {
      guestConn.emit('data', {
        type: 'user-joined',
        senderId: 'guest-friend',
        username: 'Alex',
        initialElements: [
          { id: 'guest-rect-1', type: 'rectangle', version: 1 },
          { id: 'guest-text-1', type: 'text', text: 'Requirements', version: 1 },
        ],
      });
    });

    // Host should have called updateScene merging host-scribble-1 and guest diagrams!
    expect(api.updateScene).toHaveBeenCalledWith(
      expect.objectContaining({
        elements: expect.arrayContaining([
          expect.objectContaining({ id: 'host-scribble-1' }),
          expect.objectContaining({ id: 'guest-rect-1' }),
          expect.objectContaining({ id: 'guest-text-1' }),
        ]),
      })
    );

    // Host should also relay the newly merged scene back to the guest
    expect(guestConn.sent).toContainEqual(
      expect.objectContaining({
        type: 'scene',
        elements: expect.arrayContaining([
          expect.objectContaining({ id: 'guest-rect-1' }),
        ]),
      })
    );

    // syncSceneNow forces re-broadcast and scene-request
    act(() => {
      const count = hook.syncSceneNow();
      expect(count).toBeGreaterThanOrEqual(1);
    });

    expect(guestConn.sent).toContainEqual(expect.objectContaining({ type: 'scene-request' }));
  });

  it('joins room correctly from code, query URL, hash link, and schemeless URL', async () => {
    const api = {
      getSceneElements: vi.fn(() => []),
      updateScene: vi.fn(),
    };

    act(() => {
      root.render(<HookHarness api={api} />);
    });

    // 1. Join with URL containing query ?room=
    await act(async () => {
      await hook.joinSession('http://localhost:5173/?room=DOODLE-QUERY123');
    });
    expect(hook.status).toBe('joined');
    expect(hook.roomId).toBe('DOODLE-QUERY123');
    await act(async () => {
      mocks.FakePeer.instances[0].emit('open');
    });
    expect(mocks.FakePeer.instances[0].connection.peer).toBe('doodledesk-host-doodlequery123');

    // 2. Join with URL containing hash #room=
    await act(async () => {
      await hook.joinSession('https://doodle-desk.app/#room=DOODLE-HASH456');
    });
    expect(hook.status).toBe('joined');
    expect(hook.roomId).toBe('DOODLE-HASH456');
    await act(async () => {
      mocks.FakePeer.instances[1].emit('open');
    });
    expect(mocks.FakePeer.instances[1].connection.peer).toBe('doodledesk-host-doodlehash456');

    // 3. Join with schemeless URL and spaces
    await act(async () => {
      await hook.joinSession('  localhost:5173/#room=DOODLE-SCHEME789  ');
    });
    expect(hook.status).toBe('joined');
    expect(hook.roomId).toBe('DOODLE-SCHEME789');
    await act(async () => {
      mocks.FakePeer.instances[2].emit('open');
    });
    expect(mocks.FakePeer.instances[2].connection.peer).toBe('doodledesk-host-doodlescheme789');

    // Verify Guest sends user-joined and scene-request on connection
    const guestPeer = mocks.FakePeer.instances[2];
    const hostConn = guestPeer.connection;
    await act(async () => {
      hostConn.open = true;
      hostConn.emit('open');
    });

    expect(hostConn.sent).toContainEqual(expect.objectContaining({ type: 'user-joined' }));
    expect(hostConn.sent).toContainEqual(expect.objectContaining({ type: 'scene-request' }));

    // When host sends user-joined / presence ack, guest registers host as collaborator
    await act(async () => {
      hostConn.emit('data', {
        type: 'user-joined',
        senderId: 'host-user-id',
        username: 'Room Host',
        color: { background: '#ef4444' },
      });
    });

    expect(hook.collaborators.has('host-user-id')).toBe(true);
    expect(hook.collaborators.get('host-user-id')).toEqual(expect.objectContaining({
      username: 'Room Host',
    }));
  });

  it('retries connecting on peer-unavailable without immediately dropping the session', async () => {
    vi.useFakeTimers();
    try {
      const api = {
        getSceneElements: vi.fn(() => []),
        updateScene: vi.fn(),
      };

      act(() => {
        root.render(<HookHarness api={api} />);
      });

      await act(async () => {
        await hook.joinSession('DOODLE-RETRY999');
      });

      const guestPeer = mocks.FakePeer.instances[0];

      // Simulate PeerJS signaling peer-unavailable error before host is registered
      await act(async () => {
        guestPeer.emit('error', { type: 'peer-unavailable', message: 'Peer unavailable' });
      });

      // Hook should NOT have dropped to disconnected immediately; it should remain in joined and retry
      expect(hook.status).toBe('joined');

      // Advance timer for retry
      await act(async () => {
        vi.advanceTimersByTime(1600);
      });

      // Status still joined after retry attempt
      expect(hook.status).toBe('joined');
    } finally {
      vi.useRealTimers();
    }
  });

  it('auto-discovers local active room and connects automatically', async () => {
    localStorage.setItem('doodle_active_host_session', JSON.stringify({
      roomId: 'DOODLE-LOCALHOST',
      hostName: 'Clever Fox',
      hostId: 'other-user-999',
      timestamp: Date.now(),
    }));

    const api = {
      getSceneElements: vi.fn(() => []),
      updateScene: vi.fn(),
    };

    act(() => {
      root.render(<HookHarness api={api} />);
    });

    expect(hook.discoveredRoom).toEqual(expect.objectContaining({
      roomId: 'DOODLE-LOCALHOST',
      hostName: 'Clever Fox',
    }));

    // Calling startHosting without custom code automatically joins the active local room!
    await act(async () => {
      await hook.startHosting();
    });

    expect(hook.status).toBe('joined');
    expect(hook.roomId).toBe('DOODLE-LOCALHOST');

    localStorage.removeItem('doodle_active_host_session');
  });

  it('does not create a peer if the user leaves while PeerJS is loading', async () => {
    act(() => {
      root.render(<HookHarness api={null} />);
    });

    await act(async () => {
      void hook.startHosting('cancelled-room');
      hook.leaveSession();
      await Promise.resolve();
    });

    expect(hook.status).toBe('disconnected');
    expect(mocks.FakePeer.instances).toHaveLength(0);
  });

  it('broadcasts and receives collaborator laser pointer and trail physics mode', async () => {
    const api = {
      getSceneElements: () => [],
      updateScene: vi.fn(),
    };

    act(() => {
      root.render(<HookHarness api={api} />);
    });

    await act(async () => {
      await hook.startHosting('LASER-ROOM');
    });

    const peer = mocks.FakePeer.instances[0];
    const guest = new mocks.FakeConnection('guest-presenter');

    await act(async () => {
      peer.emit('connection', guest);
      guest.open = true;
      guest.emit('open');
    });

    // 1. Receiving a laser pointer update from guest
    await act(async () => {
      guest.emit('data', {
        type: 'pointer',
        senderId: 'guest-presenter',
        username: 'Laser Host',
        color: '#f43f5e',
        x: 450,
        y: 280,
        button: 'down',
        tool: 'laser',
        laserMode: 'sparks',
      });
    });

    expect(hook.collaborators.get('guest-presenter')).toEqual(
      expect.objectContaining({
        pointer: {
          x: 450,
          y: 280,
          tool: 'laser',
          laserMode: 'sparks',
        },
        button: 'down',
      })
    );
    expect(api.updateScene).toHaveBeenCalledWith(
      expect.objectContaining({
        collaborators: expect.any(Map),
      })
    );

    // 2. Broadcasting our own laser pointer to peers
    await act(async () => {
      hook.broadcastPointer(500, 300, 'down', {}, 'laser', 'sparks');
    });

    expect(guest.sent).toContainEqual(
      expect.objectContaining({
        type: 'pointer',
        x: 500,
        y: 300,
        button: 'down',
        tool: 'laser',
        laserMode: 'sparks',
      })
    );

    act(() => hook.leaveSession());
  });
});
