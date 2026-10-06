import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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
});

describe('live collaboration overlays', () => {
  it('shows room chat as a separate floating panel and sends messages/reactions', () => {
    const sendChatMessage = vi.fn();
    act(() => {
      root.render(
        <LiveCollabChatPanel
          isConnected
          isOpen
          onToggle={() => {}}
          chatMessages={[
            { id: 'message-1', senderName: 'Sam', text: 'Hello', color: { background: '#3b82f6' } },
          ]}
          sendChatMessage={sendChatMessage}
          myProfile={{ username: 'Doodler' }}
        />
      );
    });

    expect(container.querySelector('.live-collab-chat-panel')).not.toBeNull();
    expect(container.textContent).toContain('Hello');

    const input = container.querySelector('input[aria-label="Type a room message"]');
    act(() => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
      setter.call(input, 'Thanks!');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    act(() => container.querySelector('.live-collab-chat-compose').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
    expect(sendChatMessage).toHaveBeenCalledWith('Thanks!', false);

    const reaction = Array.from(container.querySelectorAll('.live-collab-chat-reactions button'))
      .find((button) => button.textContent === '🔥');
    act(() => reaction.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    expect(sendChatMessage).toHaveBeenCalledWith('🔥', true);
  });

  it('keeps chat history out of the collaboration dropdown and offers an opener', () => {
    const onOpenLiveChat = vi.fn();
    act(() => {
      root.render(
        <LiveCollabDropdown
          status="hosting"
          roomId="DOODLE-ROOM"
          myProfile={{ username: 'Doodler', color: { background: '#3b82f6' } }}
          setMyProfile={() => {}}
          collaborators={new Map()}
          chatMessages={[{ id: 'message-1', senderName: 'Sam', text: 'Secret chat text' }]}
          onOpenLiveChat={onOpenLiveChat}
          startHosting={() => {}}
          joinSession={() => {}}
          leaveSession={() => {}}
          onFollowCollaborator={() => {}}
        />
      );
    });

    expect(container.textContent).not.toContain('Secret chat text');
    expect(container.textContent).not.toContain('Direct P2P WebRTC');
    expect(container.textContent).not.toContain('No server canvas storage');
    const openChat = Array.from(container.querySelectorAll('button')).find((button) => button.textContent.includes('Open Chat'));
    expect(openChat).toBeTruthy();
    act(() => openChat.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    expect(onOpenLiveChat).toHaveBeenCalledOnce();
  });

  it('shows only unseen incoming messages in the launcher badge and clears them on open', () => {
    const props = {
      isConnected: true,
      isOpen: false,
      onToggle: vi.fn(),
      myProfile: { id: 'me', username: 'Doodler' },
      sendChatMessage: vi.fn(),
      chatMessages: [],
    };

    act(() => root.render(<LiveCollabChatPanel {...props} />));
    expect(container.querySelector('.live-collab-chat-count')).toBeNull();

    act(() => root.render(<LiveCollabChatPanel {...props} chatMessages={[
      { id: 'incoming-1', senderId: 'peer-1', senderName: 'Sam', text: 'Hi' },
      { id: 'mine-1', senderId: 'me', senderName: 'Doodler', text: 'Hello' },
      { id: 'incoming-2', senderId: 'peer-2', senderName: 'Alex', text: 'Welcome' },
    ]} />));
    expect(container.querySelector('.live-collab-chat-count')?.textContent).toBe('2');

    act(() => root.render(<LiveCollabChatPanel {...props} isOpen chatMessages={[
      { id: 'incoming-1', senderId: 'peer-1', senderName: 'Sam', text: 'Hi' },
      { id: 'mine-1', senderId: 'me', senderName: 'Doodler', text: 'Hello' },
      { id: 'incoming-2', senderId: 'peer-2', senderName: 'Alex', text: 'Welcome' },
    ]} />));
    expect(container.querySelector('.live-collab-chat-count')).toBeNull();
  });
});
