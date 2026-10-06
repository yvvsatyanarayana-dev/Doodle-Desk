import { useState, useEffect, useCallback } from 'react';

export function useTheme() {
  const [themeSetting, setThemeSetting] = useState('dark'); // 'system' | 'light' | 'dark'
  const [systemIsDark, setSystemIsDark] = useState(true);

  // Load initial setting
  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.getSetting('theme', 'dark').then(val => {
        if (val) setThemeSetting(val);
      });

      const cleanupTheme = window.electronAPI.on('theme:system-changed', ({ shouldUseDarkColors }) => {
        setSystemIsDark(shouldUseDarkColors);
      });

      const cleanupToggle = window.electronAPI.on('view:toggle-theme', () => {
        setThemeSetting(prev => {
          const next = prev === 'dark' ? 'light' : prev === 'light' ? 'dark' : (systemIsDark ? 'light' : 'dark');
          window.electronAPI.setSetting('theme', next);
          return next;
        });
      });

      return () => {
        cleanupTheme();
        cleanupToggle();
      };
    }
  }, [systemIsDark]);

  // Determine effective theme ('light' | 'dark')
  const effectiveTheme = themeSetting === 'system'
    ? (systemIsDark ? 'dark' : 'light')
    : themeSetting;

  // Apply to DOM attribute
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', effectiveTheme);
  }, [effectiveTheme]);

  const changeTheme = useCallback((newTheme) => {
    setThemeSetting(newTheme);
    if (window.electronAPI) {
      window.electronAPI.setSetting('theme', newTheme);
    }
  }, []);

  return {
    themeSetting,
    effectiveTheme,
    changeTheme,
  };
}
