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

    act(() => hook.leaveSession());
    expect(hook.status).toBe('disconnected');
    expect(peer.destroyed).toBe(true);
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
});
