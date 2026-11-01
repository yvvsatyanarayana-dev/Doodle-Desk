import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { copyToClipboard, getRoomInviteLink, getRoomAppDeepLink } from '../src/utils/collabShare.js';

describe('Collaboration Share & Clipboard', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('getRoomAppDeepLink', () => {
    it('returns empty string if no roomId', () => {
      expect(getRoomAppDeepLink('')).toBe('');
      expect(getRoomAppDeepLink(null)).toBe('');
    });

    it('generates system protocol deep link (doodle-desk://)', () => {
      const link = getRoomAppDeepLink('DOODLE-GTZMSH');
      expect(link).toBe('doodle-desk://join?room=DOODLE-GTZMSH');
    });

    it('encodes special characters in roomId', () => {
      const link = getRoomAppDeepLink('ROOM 123');
      expect(link).toBe('doodle-desk://join?room=ROOM%20123');
    });
  });

  describe('getRoomInviteLink', () => {
    it('returns empty string if no roomId', () => {
      expect(getRoomInviteLink('')).toBe('');
      expect(getRoomInviteLink(null)).toBe('');
    });

    it('generates clean invite link with room parameter', () => {
      const link = getRoomInviteLink('DOODLE-123456');
      expect(link).toContain('?room=DOODLE-123456');
    });

    it('uses custom domain override if configured in localStorage', () => {
      localStorage.setItem('doodle_collab_custom_domain', 'https://whiteboard.myteam.com');
      const link = getRoomInviteLink('DOODLE-TEAM99');
      expect(link).toBe('https://whiteboard.myteam.com/?room=DOODLE-TEAM99');
      localStorage.removeItem('doodle_collab_custom_domain');
    });

    it('encodes special characters in roomId', () => {
      const link = getRoomInviteLink('TEAM ALPHA');
      expect(link).toContain('?room=TEAM%20ALPHA');
    });
  });

  describe('copyToClipboard', () => {
    it('uses window.electronAPI.writeClipboardText when available', async () => {
      const writeClipboardText = vi.fn().mockResolvedValue(true);
      window.electronAPI = { writeClipboardText };

      const result = await copyToClipboard('DOODLE-TEST-ROOM');
      expect(result).toBe(true);
      expect(writeClipboardText).toHaveBeenCalledWith('DOODLE-TEST-ROOM');

      delete window.electronAPI;
    });

    it('falls back to navigator.clipboard.writeText if electronAPI not available', async () => {
      delete window.electronAPI;
      const writeText = vi.fn().mockResolvedValue(undefined);
      Object.assign(navigator, {
        clipboard: { writeText },
      });

      const result = await copyToClipboard('DOODLE-WEB-ROOM');
      expect(result).toBe(true);
      expect(writeText).toHaveBeenCalledWith('DOODLE-WEB-ROOM');
    });

    it('falls back to document.execCommand when navigator.clipboard fails', async () => {
      delete window.electronAPI;
      Object.assign(navigator, {
        clipboard: {
          writeText: vi.fn().mockRejectedValue(new Error('Permission denied')),
        },
      });

      const execCommand = vi.fn().mockReturnValue(true);
      document.execCommand = execCommand;

      const result = await copyToClipboard('FALLBACK-ROOM');
      expect(result).toBe(true);
      expect(execCommand).toHaveBeenCalledWith('copy');
    });
  });
});
