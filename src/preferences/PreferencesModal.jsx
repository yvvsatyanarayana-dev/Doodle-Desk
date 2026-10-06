import React, { useState, useEffect } from 'react';
import { RotateCcw, Check, Monitor, Sun, Moon, Settings, X, Sliders } from 'lucide-react';
import { ThemedConfirmDialog } from '../components/ThemedConfirmDialog';

export function PreferencesModal({ isOpen, onClose, currentTheme, onThemeChange }) {
  const [settings, setSettings] = useState({
    theme: 'system',
    autoSaveMode: 'interval',
    autoSaveIntervalSec: 5,
    defaultExportScale: 2,
    defaultExportBg: true,
    defaultExportDarkMode: false,
    defaultExportEmbedScene: true,
    trayEnabled: false,
    openAtLogin: false,
    hardwareAcceleration: true,
    spellcheck: true,
  });

  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Sync settings when opened
  useEffect(() => {
    if (isOpen) {
      if (currentTheme) {
        setSettings(prev => ({ ...prev, theme: currentTheme }));
      }
      if (window.electronAPI) {
        window.electronAPI.getSettings().then(stored => {
          if (stored) setSettings(prev => ({ ...prev, ...stored, ...(currentTheme ? { theme: currentTheme } : {}) }));
        });
      }
    }
  }, [isOpen, currentTheme]);

  // Handle Escape key to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const updateSetting = (key, val) => {
    setSettings(prev => ({ ...prev, [key]: val }));
    if (window.electronAPI) {
      window.electronAPI.setSetting(key, val);
    }
    if (key === 'theme' && onThemeChange) {
      onThemeChange(val);
    }
  };

  const handleConfirmReset = async () => {
    if (window.electronAPI) {
      const defaults = await window.electronAPI.resetSettings();
      setSettings(defaults);
      if (onThemeChange) onThemeChange('system');
    }
    setShowResetConfirm(false);
  };

  return (
    <>
      {/* Light subtle backdrop overlay that closes sidebar on canvas click */}
      <div className="settings-sidebar-overlay" onClick={onClose} />

      {/* Right-docked Settings Sidebar Panel matching Native Library Sidebar */}
      <aside className="settings-sidebar-panel" onClick={e => e.stopPropagation()}>
        {/* Sidebar Header */}
        <div className="settings-sidebar-header">
          <div className="settings-sidebar-title-group">
            <div className="settings-sidebar-icon">
              <Settings size={16} />
            </div>
            <div>
              <h3 className="settings-sidebar-title">Preferences</h3>
              <span className="settings-sidebar-subtitle">Application Settings</span>
            </div>
          </div>

          <div className="settings-sidebar-actions">
            <button
              className="settings-sidebar-action-btn"
              onClick={() => setShowResetConfirm(true)}
              title="Reset to Defaults"
              aria-label="Reset to Defaults"
            >
              <RotateCcw size={14} />
            </button>
            <button
              className="settings-sidebar-action-btn"
              onClick={onClose}
              title="Close Preferences (Esc)"
              aria-label="Close preferences"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="settings-sidebar-content">
          {/* Appearance & Theme */}
          <div className="pref-sidebar-section">
            <h4 className="pref-sidebar-section-title">Appearance & Theme</h4>
            <div className="pref-sidebar-row">
              <span className="pref-sidebar-label">Color Theme</span>
              <div className="pref-segmented-control">
                <button
                  className={`pref-segment-btn ${settings.theme === 'system' ? 'active' : ''}`}
                  onClick={() => updateSetting('theme', 'system')}
                  title="Follow System Theme"
                >
                  <Monitor size={12} />
                  <span>System</span>
                </button>
                <button
                  className={`pref-segment-btn ${settings.theme === 'light' ? 'active' : ''}`}
                  onClick={() => updateSetting('theme', 'light')}
                  title="Light Theme"
                >
                  <Sun size={12} />
                  <span>Light</span>
                </button>
                <button
                  className={`pref-segment-btn ${settings.theme === 'dark' ? 'active' : ''}`}
                  onClick={() => updateSetting('theme', 'dark')}
                  title="Dark Theme"
                >
                  <Moon size={12} />
                  <span>Dark</span>
                </button>
              </div>
            </div>
          </div>

          {/* Backup & Recovery */}
          <div className="pref-sidebar-section">
            <h4 className="pref-sidebar-section-title">Backup & Recovery</h4>
            <div className="pref-sidebar-row">
              <span className="pref-sidebar-label">Auto-save Mode</span>
              <select
                className="pref-select"
                value={settings.autoSaveMode}
                onChange={e => updateSetting('autoSaveMode', e.target.value)}
              >
                <option value="interval">Crash Recovery Snapshots</option>
                <option value="direct">Direct File Auto-Save</option>
                <option value="off">Disabled</option>
              </select>
            </div>
            <div className="pref-sidebar-row">
              <span className="pref-sidebar-label">Snapshot Interval</span>
              <select
                className="pref-select"
                value={settings.autoSaveIntervalSec}
                onChange={e => updateSetting('autoSaveIntervalSec', Number(e.target.value))}
              >
                <option value="3">3 seconds (Real-time)</option>
                <option value="5">5 seconds (Recommended)</option>
                <option value="10">10 seconds</option>
                <option value="30">30 seconds</option>
              </select>
            </div>
          </div>

          {/* Desktop & System */}
          <div className="pref-sidebar-section">
            <h4 className="pref-sidebar-section-title">Desktop & System</h4>
            <div className="pref-sidebar-row">
              <span className="pref-sidebar-label">System Tray Icon</span>
              <label className="pref-toggle">
                <input
                  type="checkbox"
                  checked={settings.trayEnabled}
                  onChange={e => updateSetting('trayEnabled', e.target.checked)}
                />
                <span className="pref-slider"></span>
              </label>
            </div>
            <div className="pref-sidebar-row">
              <span className="pref-sidebar-label">Launch on Startup</span>
              <label className="pref-toggle">
                <input
                  type="checkbox"
                  checked={settings.openAtLogin}
                  onChange={e => updateSetting('openAtLogin', e.target.checked)}
                />
                <span className="pref-slider"></span>
              </label>
            </div>
            <div className="pref-sidebar-row">
              <span className="pref-sidebar-label">Hardware Acceleration</span>
              <label className="pref-toggle">
                <input
                  type="checkbox"
                  checked={settings.hardwareAcceleration}
                  onChange={e => updateSetting('hardwareAcceleration', e.target.checked)}
                />
                <span className="pref-slider"></span>
              </label>
            </div>
            <div className="pref-sidebar-row">
              <span className="pref-sidebar-label">Spellcheck in Text</span>
              <label className="pref-toggle">
                <input
                  type="checkbox"
                  checked={settings.spellcheck}
                  onChange={e => updateSetting('spellcheck', e.target.checked)}
                />
                <span className="pref-slider"></span>
              </label>
            </div>
          </div>

          {/* Export Presets */}
          <div className="pref-sidebar-section">
            <h4 className="pref-sidebar-section-title">Export Presets</h4>
            <div className="pref-sidebar-row">
              <span className="pref-sidebar-label">Default Resolution</span>
              <select
                className="pref-select"
                value={settings.defaultExportScale}
                onChange={e => updateSetting('defaultExportScale', Number(e.target.value))}
              >
                <option value="1">1x (Standard)</option>
                <option value="2">2x (High Res Retina)</option>
                <option value="3">3x (Ultra Print)</option>
              </select>
            </div>
            <div className="pref-sidebar-row">
              <span className="pref-sidebar-label">Export with Background</span>
              <label className="pref-toggle">
                <input
                  type="checkbox"
                  checked={settings.defaultExportBg}
                  onChange={e => updateSetting('defaultExportBg', e.target.checked)}
                />
                <span className="pref-slider"></span>
              </label>
            </div>
            <div className="pref-sidebar-row">
              <span className="pref-sidebar-label">Export in Dark Mode</span>
              <label className="pref-toggle">
                <input
                  type="checkbox"
                  checked={settings.defaultExportDarkMode}
                  onChange={e => updateSetting('defaultExportDarkMode', e.target.checked)}
                />
                <span className="pref-slider"></span>
              </label>
            </div>
            <div className="pref-sidebar-row">
              <span className="pref-sidebar-label">Embed Diagram Scene</span>
              <label className="pref-toggle">
                <input
                  type="checkbox"
                  checked={settings.defaultExportEmbedScene}
                  onChange={e => updateSetting('defaultExportEmbedScene', e.target.checked)}
                />
                <span className="pref-slider"></span>
              </label>
            </div>
          </div>
        </div>

        {/* Sidebar Footer */}
        <div className="settings-sidebar-footer">
          <span className="settings-sidebar-status">Changes saved automatically</span>
          <button className="settings-sidebar-done-btn" onClick={onClose}>
            <Check size={13} />
            <span>Done</span>
          </button>
        </div>
      </aside>

      {showResetConfirm && (
        <ThemedConfirmDialog
          isOpen={showResetConfirm}
          title="Reset Preferences"
          subtitle="Confirm Action"
          message="Reset all application preferences to factory defaults?"
          confirmText="Reset to Defaults"
          cancelText="Cancel"
          danger={false}
          onConfirm={handleConfirmReset}
          onCancel={() => setShowResetConfirm(false)}
        />
      )}
    </>
  );
}
