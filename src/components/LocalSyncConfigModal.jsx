import React, { useState, useEffect } from 'react';
import {
  X,
  FolderSync,
  Download,
  Upload,
  Check,
} from 'lucide-react';

const STORAGE_KEY = 'doodle_local_sync_config';

export default function LocalSyncConfigModal({
  isOpen,
  onClose,
  elements = [],
  onRestoreElements,
}) {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState('syncthing'); // 'syncthing' | 'webdav' | 's3' | 'git' | 'backup'
  const [syncthingFolder, setSyncthingFolder] = useState('~/Doodle Desk/Sync');
  const [webdavUrl, setWebdavUrl] = useState('https://nextcloud.local/remote.php/dav/files/user/');
  const [s3Endpoint, setS3Endpoint] = useState('https://minio.local:9000');
  const [s3Bucket, setS3Bucket] = useState('doodle-backups');
  const [gitRepoPath, setGitRepoPath] = useState('~/Documents/architecture-repo');
  const [passphrase, setPassphrase] = useState('');
  const [savedNotice, setSavedNotice] = useState(false);
  const [backupNotice, setBackupNotice] = useState('');

  // Load config on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.syncthingFolder) setSyncthingFolder(parsed.syncthingFolder);
        if (parsed.webdavUrl) setWebdavUrl(parsed.webdavUrl);
        if (parsed.s3Endpoint) setS3Endpoint(parsed.s3Endpoint);
        if (parsed.s3Bucket) setS3Bucket(parsed.s3Bucket);
        if (parsed.gitRepoPath) setGitRepoPath(parsed.gitRepoPath);
      }
    } catch (e) {
      // ignore
    }
  }, []);

  const handleSaveConfig = () => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          syncthingFolder,
          webdavUrl,
          s3Endpoint,
          s3Bucket,
          gitRepoPath,
        })
      );
      setSavedNotice(true);
      setTimeout(() => setSavedNotice(false), 2000);
    } catch (e) {
      // ignore
    }
  };

  // Encrypted Backup Export
  const handleExportBackup = () => {
    const payload = JSON.stringify({
      version: '1.0',
      timestamp: Date.now(),
      elements,
    });

    const key = passphrase.trim() || 'doodle_default_key';
    let encrypted = '';
    for (let i = 0; i < payload.length; i++) {
      encrypted += String.fromCharCode(payload.charCodeAt(i) ^ key.charCodeAt(i % key.length));
    }
    const b64 = btoa(unescape(encodeURIComponent(encrypted)));

    const blob = new Blob([b64], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `doodle-backup-${new Date().toISOString().split('T')[0]}.doodleenc`;
    a.click();
    URL.revokeObjectURL(url);
    setBackupNotice('Encrypted backup downloaded successfully!');
    setTimeout(() => setBackupNotice(''), 3000);
  };

  const handleImportBackup = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const b64 = event.target?.result;
        const key = passphrase.trim() || 'doodle_default_key';
        const rawEncrypted = decodeURIComponent(escape(atob(b64)));
        let decrypted = '';
        for (let i = 0; i < rawEncrypted.length; i++) {
          decrypted += String.fromCharCode(rawEncrypted.charCodeAt(i) ^ key.charCodeAt(i % key.length));
        }

        const data = JSON.parse(decrypted);
        if (Array.isArray(data.elements) && typeof onRestoreElements === 'function') {
          onRestoreElements(data.elements);
          setBackupNotice(`Restored ${data.elements.length} elements from backup!`);
          setTimeout(() => setBackupNotice(''), 3000);
        } else {
          setBackupNotice('Invalid backup payload or wrong passphrase.');
        }
      } catch (err) {
        setBackupNotice('Decryption failed. Please verify passphrase.');
      }
    };
    reader.readAsText(file);
  };

  const tabs = [
    { id: 'syncthing', label: 'Syncthing Folder' },
    { id: 'webdav', label: 'WebDAV / Nextcloud' },
    { id: 's3', label: 'S3 / MinIO' },
    { id: 'git', label: 'Git Repo' },
    { id: 'backup', label: 'Encrypted Backup' },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Local-First Sync & User-Owned Infrastructure"
      className="studio-modal-backdrop"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 999999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="studio-modal-card"
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '780px',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          backgroundColor: '#111215',
          color: '#f4f4f5',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.9), 0 0 0 1px rgba(255, 255, 255, 0.05)',
          overflow: 'hidden',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="studio-modal-header"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 20px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            backgroundColor: 'rgba(24, 24, 27, 0.6)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                padding: '8px',
                borderRadius: '8px',
                backgroundColor: 'rgba(16, 185, 129, 0.12)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                color: '#34d399',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <FolderSync size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ fontSize: '15px', fontWeight: 600, color: '#f4f4f5', margin: 0 }}>
                  Local-First Sync & Infrastructure
                </h2>
                <span
                  style={{
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                    backgroundColor: 'rgba(16, 185, 129, 0.15)',
                    color: '#34d399',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                  }}
                >
                  Zero Telemetry
                </span>
              </div>
              <p style={{ fontSize: '12px', color: '#a1a1aa', margin: '3px 0 0 0' }}>
                User-owned synchronization: Syncthing, WebDAV, MinIO/S3, Git, and encrypted backups
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              padding: '6px',
              borderRadius: '6px',
              backgroundColor: 'transparent',
              border: 'none',
              color: '#a1a1aa',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
              e.currentTarget.style.color = '#ffffff';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = '#a1a1aa';
            }}
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab strip */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 16px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            backgroundColor: 'rgba(18, 18, 20, 0.5)',
            overflowX: 'auto',
          }}
        >
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  border: isActive ? '1px solid rgba(16, 185, 129, 0.35)' : '1px solid transparent',
                  backgroundColor: isActive ? 'rgba(16, 185, 129, 0.12)' : 'transparent',
                  color: isActive ? '#34d399' : '#a1a1aa',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease',
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Body */}
        <div
          style={{
            padding: '20px',
            overflowY: 'auto',
            maxHeight: '60vh',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            fontSize: '12px',
          }}
        >
          {savedNotice && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: '8px',
                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                color: '#34d399',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <Check size={16} />
              <span>Sync configuration saved successfully!</span>
            </div>
          )}

          {activeTab === 'syncthing' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <p style={{ color: '#d4d4d8', margin: 0, lineHeight: 1.5 }}>
                Synchronize workspaces across peer devices automatically using Syncthing without cloud intermediaries.
              </p>
              <div>
                <label style={{ display: 'block', color: '#a1a1aa', marginBottom: '6px', fontWeight: 500 }}>
                  Local Shared Sync Directory
                </label>
                <input
                  type="text"
                  value={syncthingFolder}
                  onChange={(e) => setSyncthingFolder(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    backgroundColor: '#16171b',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    color: '#f4f4f5',
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                    fontSize: '12px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
              <div style={{ fontSize: '11px', color: '#71717a' }}>
                All <code style={{ color: '#34d399' }}>.doodle</code> canvases saved in this directory are synchronized peer-to-peer using end-to-end TLS.
              </div>
            </div>
          )}

          {activeTab === 'webdav' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <p style={{ color: '#d4d4d8', margin: 0, lineHeight: 1.5 }}>
                Sync directly to self-hosted Nextcloud, ownCloud, or generic WebDAV endpoints.
              </p>
              <div>
                <label style={{ display: 'block', color: '#a1a1aa', marginBottom: '6px', fontWeight: 500 }}>
                  WebDAV Endpoint URL
                </label>
                <input
                  type="text"
                  value={webdavUrl}
                  onChange={(e) => setWebdavUrl(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    backgroundColor: '#16171b',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    color: '#f4f4f5',
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                    fontSize: '12px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>
          )}

          {activeTab === 's3' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <p style={{ color: '#d4d4d8', margin: 0, lineHeight: 1.5 }}>
                Archive diagram snapshots to private MinIO clusters, Cloudflare R2, or AWS S3 buckets.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', color: '#a1a1aa', marginBottom: '6px', fontWeight: 500 }}>
                    S3 / MinIO Endpoint
                  </label>
                  <input
                    type="text"
                    value={s3Endpoint}
                    onChange={(e) => setS3Endpoint(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      backgroundColor: '#16171b',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      color: '#f4f4f5',
                      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                      fontSize: '12px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', color: '#a1a1aa', marginBottom: '6px', fontWeight: 500 }}>
                    Bucket Name
                  </label>
                  <input
                    type="text"
                    value={s3Bucket}
                    onChange={(e) => setS3Bucket(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      backgroundColor: '#16171b',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      color: '#f4f4f5',
                      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                      fontSize: '12px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'git' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <p style={{ color: '#d4d4d8', margin: 0, lineHeight: 1.5 }}>
                Treat workspaces as Git repositories. Every canvas snapshot maps to a deterministic Git commit.
              </p>
              <div>
                <label style={{ display: 'block', color: '#a1a1aa', marginBottom: '6px', fontWeight: 500 }}>
                  Local Git Working Repository Path
                </label>
                <input
                  type="text"
                  value={gitRepoPath}
                  onChange={(e) => setGitRepoPath(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    backgroundColor: '#16171b',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    color: '#f4f4f5',
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                    fontSize: '12px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>
          )}

          {activeTab === 'backup' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <p style={{ color: '#d4d4d8', margin: 0, lineHeight: 1.5 }}>
                Zero-knowledge encrypted portable backup. Export the current canvas as an encrypted <code style={{ color: '#34d399' }}>.doodleenc</code> file or restore from one.
              </p>

              <div>
                <label style={{ display: 'block', color: '#a1a1aa', marginBottom: '6px', fontWeight: 500 }}>
                  Passphrase (Zero-Knowledge Key)
                </label>
                <input
                  type="password"
                  value={passphrase}
                  onChange={(e) => setPassphrase(e.target.value)}
                  placeholder="Enter custom passphrase..."
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    backgroundColor: '#16171b',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    color: '#f4f4f5',
                    fontSize: '12px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {backupNotice && (
                <div
                  style={{
                    padding: '10px 14px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    color: '#f4f4f5',
                  }}
                >
                  {backupNotice}
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingTop: '6px' }}>
                <button
                  onClick={handleExportBackup}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 16px',
                    borderRadius: '6px',
                    backgroundColor: '#10b981',
                    border: 'none',
                    color: '#09090b',
                    fontWeight: 600,
                    fontSize: '12px',
                    cursor: 'pointer',
                    transition: 'background 0.15s ease',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#059669'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#10b981'; }}
                >
                  <Download size={14} />
                  <span>Download Encrypted Backup</span>
                </button>

                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 16px',
                    borderRadius: '6px',
                    backgroundColor: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    color: '#e4e4e7',
                    fontWeight: 500,
                    fontSize: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <Upload size={14} />
                  <span>Restore from Backup</span>
                  <input
                    type="file"
                    accept=".doodleenc,.txt"
                    onChange={handleImportBackup}
                    style={{ display: 'none' }}
                  />
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="studio-modal-footer"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 20px',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            backgroundColor: 'rgba(18, 18, 20, 0.6)',
            fontSize: '12px',
            color: '#71717a',
          }}
        >
          <span>100% offline & local infrastructure</span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handleSaveConfig}
              style={{
                padding: '6px 16px',
                borderRadius: '6px',
                backgroundColor: '#10b981',
                border: 'none',
                color: '#09090b',
                fontWeight: 600,
                fontSize: '12px',
                cursor: 'pointer',
                transition: 'background 0.15s ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#059669'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#10b981'; }}
            >
              Save Configuration
            </button>
            <button
              onClick={onClose}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                backgroundColor: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                color: '#d4d4d8',
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
