/**
 * Universal collaboration share & clipboard utilities
 * Supports Electron desktop, web browsers, and restricted webview contexts.
 */

export const OFFICIAL_APP_COLLAB_ORIGIN = 'https://doodledesk.app';

/**
 * System desktop app deep link protocol (doodle-desk://)
 * Opens directly inside the installed Doodle Desk desktop app on Windows, macOS, or Linux.
 */
export function getRoomAppDeepLink(roomId) {
  if (!roomId) return '';
  const cleanId = String(roomId).trim().toUpperCase();
  return `doodle-desk://join?room=${encodeURIComponent(cleanId)}`;
}

/**
 * Web browser shareable invite link
 * When in local development, returns the active localhost server URL so browser opens correctly.
 * When in production, returns the official branded web app link or custom configured domain.
 */
export function getRoomInviteLink(roomId) {
  if (!roomId) return '';
  const cleanId = String(roomId).trim().toUpperCase();

  // 1. Allow custom domain override from settings if provided
  try {
    if (typeof localStorage !== 'undefined') {
      const customDomain = localStorage.getItem('doodle_collab_custom_domain');
      if (customDomain && typeof customDomain === 'string') {
        const trimmed = customDomain.trim().replace(/\/$/, '');
        if (trimmed) {
          return `${trimmed}/?room=${encodeURIComponent(cleanId)}`;
        }
      }
    }
  } catch {}

  // 2. Check current browser/dev-server location
  if (typeof window !== 'undefined' && window.location) {
    const hostname = window.location.hostname || '';
    const isLocalhost =
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '0.0.0.0' ||
      hostname.endsWith('.local');
    const isFile = window.location.protocol === 'file:';
    const isElectron = Boolean(
      window.electronAPI ||
      (typeof navigator !== 'undefined' && /electron/i.test(navigator.userAgent))
    );

    // If running with local dev server (Vite on localhost:5173), return the reachable local URL
    if (isLocalhost && !isFile && window.location.protocol.startsWith('http')) {
      const origin = window.location.origin;
      const pathname = window.location.pathname.replace(/\/$/, '');
      return `${origin}${pathname}/?room=${encodeURIComponent(cleanId)}`;
    }

    // If running in public production web browser
    if (!isLocalhost && !isFile && !isElectron && window.location.protocol.startsWith('http')) {
      const origin = window.location.origin;
      const pathname = window.location.pathname.replace(/\/$/, '');
      return `${origin}${pathname}/?room=${encodeURIComponent(cleanId)}`;
    }
  }

  // 3. Fallback to official app link
  return `${OFFICIAL_APP_COLLAB_ORIGIN}/?room=${encodeURIComponent(cleanId)}`;
}

export async function copyToClipboard(text) {
  if (!text) return false;
  const str = String(text);

  // 1. Electron native clipboard via IPC (immune to document focus restrictions)
  if (typeof window !== 'undefined' && window.electronAPI?.writeClipboardText) {
    try {
      await window.electronAPI.writeClipboardText(str);
      return true;
    } catch (e) {
      console.warn('electronAPI.writeClipboardText failed:', e);
    }
  }

  // 2. Modern navigator.clipboard API
  if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(str);
      return true;
    } catch (e) {
      console.warn('navigator.clipboard.writeText failed, using fallback:', e);
    }
  }

  // 3. Fallback: temporary textarea + document.execCommand('copy')
  if (typeof document !== 'undefined') {
    try {
      const textArea = document.createElement('textarea');
      textArea.value = str;
      textArea.setAttribute('readonly', '');
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      textArea.setSelectionRange(0, 99999);
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      if (successful) return true;
    } catch (err) {
      console.warn('execCommand copy fallback failed:', err);
    }
  }

  // 4. Prompt fallback if completely blocked
  if (typeof window !== 'undefined' && window.prompt) {
    try {
      window.prompt('Copy to clipboard: Ctrl+C, Enter', str);
      return true;
    } catch {}
  }

  return false;
}
