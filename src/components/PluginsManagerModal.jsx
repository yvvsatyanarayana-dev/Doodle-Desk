import React, { useState } from 'react';
import {
  X,
  Package,
  ToggleLeft,
  ToggleRight,
  Code2,
} from 'lucide-react';
import {
  getInstalledPlugins,
  togglePlugin,
  exportPluginManifestTemplate,
} from '../utils/pluginManager.js';

export default function PluginsManagerModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  const [plugins, setPlugins] = useState(() => getInstalledPlugins());
  const [selectedPlugin, setSelectedPlugin] = useState(plugins[0] || null);
  const [copiedTemplate, setCopiedTemplate] = useState(false);

  const handleToggle = (id) => {
    const updated = togglePlugin(id);
    setPlugins(updated);
    if (selectedPlugin && selectedPlugin.id === id) {
      setSelectedPlugin(updated.find((p) => p.id === id));
    }
  };

  const handleExportTemplate = () => {
    const tpl = exportPluginManifestTemplate();
    navigator.clipboard.writeText(tpl);
    setCopiedTemplate(true);
    setTimeout(() => setCopiedTemplate(false), 2000);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="WASM Plugin Ecosystem"
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
          maxWidth: '880px',
          height: '80vh',
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
              <Package size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ fontSize: '15px', fontWeight: 600, color: '#f4f4f5', margin: 0 }}>
                  WASM Plugin Ecosystem
                </h2>
                <span
                  style={{
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                    backgroundColor: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#a1a1aa',
                  }}
                >
                  {plugins.filter((p) => p.enabled).length} Enabled / {plugins.length} Installed
                </span>
              </div>
              <p style={{ fontSize: '12px', color: '#a1a1aa', margin: '3px 0 0 0' }}>
                100% Offline, sandboxed WASM extensions for custom shapes, simulators, and exporters
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

        {/* Action bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 16px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            backgroundColor: 'rgba(18, 18, 20, 0.5)',
            fontSize: '12px',
          }}
        >
          <span style={{ color: '#a1a1aa' }}>
            Plugin directory: <code style={{ color: '#34d399', backgroundColor: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px' }}>~/Doodle Desk/plugins/</code>
          </span>
          <button
            onClick={handleExportTemplate}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              borderRadius: '6px',
              backgroundColor: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              color: copiedTemplate ? '#34d399' : '#e4e4e7',
              fontSize: '11px',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <Code2 size={13} />
            <span>{copiedTemplate ? 'Copied Manifest!' : 'Copy Plugin Template'}</span>
          </button>
        </div>

        {/* Content split */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {/* Plugin list */}
          <div
            style={{
              width: '300px',
              borderRight: '1px solid rgba(255, 255, 255, 0.08)',
              backgroundColor: 'rgba(20, 21, 24, 0.3)',
              padding: '12px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            {plugins.map((plugin) => {
              const isSelected = selectedPlugin?.id === plugin.id;
              return (
                <div
                  key={plugin.id}
                  onClick={() => setSelectedPlugin(plugin)}
                  style={{
                    padding: '12px',
                    borderRadius: '8px',
                    border: isSelected
                      ? '1px solid rgba(16, 185, 129, 0.5)'
                      : '1px solid rgba(255, 255, 255, 0.06)',
                    backgroundColor: isSelected
                      ? 'rgba(16, 185, 129, 0.08)'
                      : 'rgba(255, 255, 255, 0.02)',
                    fontSize: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 600, color: '#f4f4f5' }}>{plugin.name}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggle(plugin.id);
                      }}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: plugin.enabled ? '#34d399' : '#71717a',
                        cursor: 'pointer',
                        padding: 0,
                        display: 'flex',
                        alignItems: 'center',
                      }}
                      title={plugin.enabled ? 'Click to disable' : 'Click to enable'}
                    >
                      {plugin.enabled ? (
                        <ToggleRight size={20} color="#34d399" />
                      ) : (
                        <ToggleLeft size={20} color="#71717a" />
                      )}
                    </button>
                  </div>
                  <p style={{ fontSize: '11px', color: '#a1a1aa', margin: '0 0 8px 0', lineHeight: 1.4 }}>
                    {plugin.description}
                  </p>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '10px',
                      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                      color: '#71717a',
                    }}
                  >
                    <span>v{plugin.version}</span>
                    <span style={{ textTransform: 'capitalize' }}>{plugin.type}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Plugin details */}
          <div style={{ flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {selectedPlugin && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingBottom: '14px',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                  }}
                >
                  <div>
                    <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#f4f4f5', margin: 0 }}>
                      {selectedPlugin.name}
                    </h3>
                    <p style={{ fontSize: '12px', color: '#a1a1aa', margin: '3px 0 0 0' }}>
                      Author: {selectedPlugin.author}
                    </p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      onClick={() => handleToggle(selectedPlugin.id)}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 600,
                        border: selectedPlugin.enabled
                          ? '1px solid rgba(239, 68, 68, 0.3)'
                          : 'none',
                        backgroundColor: selectedPlugin.enabled
                          ? 'rgba(239, 68, 68, 0.15)'
                          : '#10b981',
                        color: selectedPlugin.enabled ? '#fca5a5' : '#09090b',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {selectedPlugin.enabled ? 'Disable Plugin' : 'Enable Plugin'}
                    </button>
                  </div>
                </div>

                <div style={{ fontSize: '13px', color: '#d4d4d8', lineHeight: 1.6 }}>
                  {selectedPlugin.description}
                </div>

                <div
                  style={{
                    padding: '16px',
                    borderRadius: '10px',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    backgroundColor: 'rgba(24, 24, 27, 0.6)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    fontSize: '12px',
                  }}
                >
                  <div style={{ fontWeight: 600, color: '#e4e4e7' }}>WASM Runtime Manifest</div>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '8px',
                      color: '#a1a1aa',
                      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                      fontSize: '11px',
                    }}
                  >
                    <div>ID: <span style={{ color: '#f4f4f5' }}>{selectedPlugin.id}</span></div>
                    <div>Version: <span style={{ color: '#f4f4f5' }}>{selectedPlugin.version}</span></div>
                    <div>Entry binary: <span style={{ color: '#f4f4f5' }}>{selectedPlugin.entry}</span></div>
                    <div>Type: <span style={{ color: '#f4f4f5' }}>{selectedPlugin.type}</span></div>
                  </div>
                </div>

                <div
                  style={{
                    padding: '16px',
                    borderRadius: '10px',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    backgroundColor: 'rgba(24, 24, 27, 0.6)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    fontSize: '12px',
                  }}
                >
                  <div style={{ fontWeight: 600, color: '#e4e4e7' }}>Sandbox Permissions</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {selectedPlugin.permissions.map((perm) => (
                      <span
                        key={perm}
                        style={{
                          padding: '3px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                          backgroundColor: 'rgba(16, 185, 129, 0.12)',
                          color: '#34d399',
                          border: '1px solid rgba(16, 185, 129, 0.25)',
                        }}
                      >
                        {perm}
                      </span>
                    ))}
                  </div>
                  <div style={{ fontSize: '11px', color: '#71717a', marginTop: '4px' }}>
                    Strict memory isolation: Plugins execute in isolated WASM memory with zero ambient network access.
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
