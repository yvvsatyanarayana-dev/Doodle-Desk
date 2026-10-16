import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, Database, FileUp, X } from 'lucide-react';
import { parseDataDiagramFile } from '../utils/dataDiagram.js';

export function DataDiagramModal({ isOpen, onClose, onImport, theme = 'dark' }) {
  const [fileName, setFileName] = useState('');
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const inputRef = useRef(null);
  const isDark = theme !== 'light';

  useEffect(() => {
    if (!isOpen) {
      setFileName('');
      setRows([]);
      setError('');
      setIsImporting(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setError('');
    setRows([]);
    setFileName(file.name);
    try {
      const contents = await file.text();
      setRows(parseDataDiagramFile(contents, file.name));
    } catch (importError) {
      setError(importError.message || 'Could not read this data file.');
    }
  };

  const handleImport = () => {
    if (!rows.length || isImporting) return;
    setIsImporting(true);
    setError('');
    try {
      onImport(rows);
      onClose();
    } catch (importError) {
      setError(importError.message || 'Could not create a diagram from this file.');
      setIsImporting(false);
    }
  };

  const headers = rows.length ? Object.keys(rows[0]) : [];
  const previewRows = rows.slice(0, 3);
  const borderColor = isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0';
  const mutedColor = isDark ? '#a1a1aa' : '#64748b';

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      style={{ zIndex: 99999 }}
    >
      <section
        className="pref-modal-content help-style-dialog data-diagram-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="data-diagram-title"
        onClick={(event) => event.stopPropagation()}
        style={{
          width: 'min(780px, 94vw)',
          maxHeight: '88vh',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          padding: 24,
          overflow: 'auto',
        }}
      >
        <header className="pref-header" style={{ marginBottom: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="help-dialog-icon-badge"><Database size={16} /></span>
            <div>
              <h2 id="data-diagram-title" className="pref-title" style={{ fontSize: 18, margin: 0 }}>
                Data to Diagram
              </h2>
              <p className="pref-subtitle" style={{ margin: '4px 0 0' }}>
                Turn CSV or JSON records into editable, connected canvas shapes.
              </p>
            </div>
          </div>
          <button type="button" className="pref-esc-pill" onClick={onClose} aria-label="Close dialog">
            <X size={14} /> Esc
          </button>
        </header>

        <div
          style={{
            padding: 16,
            border: `1px dashed ${borderColor}`,
            borderRadius: 10,
            textAlign: 'center',
          }}
        >
          <FileUp size={22} color={mutedColor} />
          <p style={{ margin: '8px 0 12px', color: mutedColor, fontSize: 13 }}>
            Choose a .csv or .json file. Your data stays on this device.
          </p>
          <input
            ref={inputRef}
            type="file"
            accept=".csv,.json,text/csv,application/json"
            aria-label="Choose CSV or JSON data file"
            onChange={handleFileChange}
          />
        </div>

        {error && (
          <div role="alert" style={{ display: 'flex', alignItems: 'flex-start', gap: 8, color: '#ef4444', fontSize: 13 }}>
            <AlertCircle size={16} style={{ flex: '0 0 auto' }} />
            <span>{error}</span>
          </div>
        )}

        {rows.length > 0 && (
          <div style={{ minHeight: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
              <strong style={{ fontSize: 13 }}>{fileName}</strong>
              <span style={{ color: mutedColor, fontSize: 12 }}>
                {rows.length} {rows.length === 1 ? 'record' : 'records'} · up to 500 per import
              </span>
            </div>
            <div style={{ overflow: 'auto', maxHeight: 200, border: `1px solid ${borderColor}`, borderRadius: 8 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr>
                    {headers.map((header) => (
                      <th key={header} scope="col" style={{ padding: '8px 10px', textAlign: 'left', borderBottom: `1px solid ${borderColor}`, whiteSpace: 'nowrap' }}>
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((row, rowIndex) => (
                    <tr key={`${fileName}:${rowIndex}`}>
                      {headers.map((header) => (
                        <td key={header} style={{ maxWidth: 220, padding: '7px 10px', borderBottom: `1px solid ${borderColor}`, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {String(row[header] ?? '')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p style={{ margin: '10px 0 0', color: mutedColor, fontSize: 12 }}>
              Relationships are inferred from source/target, from/to, parent, or dependency fields.
            </p>
          </div>
        )}

        <footer className="data-diagram-modal-actions">
          <button type="button" onClick={onClose}>Cancel</button>
          <button
            type="button"
            className="data-diagram-primary-action"
            onClick={handleImport}
            disabled={!rows.length || isImporting}
          >
            <Database size={14} /> Create diagram
          </button>
        </footer>
      </section>
    </div>
  );
}
