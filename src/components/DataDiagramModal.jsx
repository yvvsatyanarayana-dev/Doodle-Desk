import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, Database, FileUp, X, FileText, FileCode, Plus, CheckCircle2 } from 'lucide-react';
import { parseDataDiagramFile, parseMarkdownToDiagramRows } from '../utils/dataDiagram.js';

export function DataDiagramModal({
  isOpen,
  onClose,
  onImport,
  onInsertDocument,
  theme = 'dark',
}) {
  const [fileName, setFileName] = useState('');
  const [fileType, setFileType] = useState(null); // 'data' | 'markdown' | 'pdf'
  const [rows, setRows] = useState([]);
  const [markdownContent, setMarkdownContent] = useState('');
  const [docTitle, setDocTitle] = useState('');
  const [pdfDataUrl, setPdfDataUrl] = useState('');
  const [error, setError] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const inputRef = useRef(null);
  const isDark = theme !== 'light';

  useEffect(() => {
    if (!isOpen) {
      setFileName('');
      setFileType(null);
      setRows([]);
      setMarkdownContent('');
      setDocTitle('');
      setPdfDataUrl('');
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
    setMarkdownContent('');
    setPdfDataUrl('');
    setFileName(file.name);

    const lowerName = file.name.toLowerCase();

    // 1. PDF File
    if (lowerName.endsWith('.pdf')) {
      setFileType('pdf');
      setDocTitle(file.name.replace(/\.[^/.]+$/, ''));
      const reader = new FileReader();
      reader.onload = () => {
        setPdfDataUrl(reader.result || '');
      };
      reader.onerror = () => {
        setError('Could not read this PDF document.');
      };
      reader.readAsDataURL(file);
      return;
    }

    // 2. Markdown File
    if (lowerName.endsWith('.md') || lowerName.endsWith('.markdown')) {
      setFileType('markdown');
      try {
        const contents = await file.text();
        setMarkdownContent(contents);
        // Extract title from first heading or file name
        const headingMatch = contents.match(/^#\s+(.+)$/m);
        setDocTitle(headingMatch ? headingMatch[1].trim() : file.name.replace(/\.[^/.]+$/, ''));
        // Parse into diagram rows as well for optional flowchart creation
        try {
          const mdRows = parseMarkdownToDiagramRows(contents, file.name);
          setRows(mdRows);
        } catch {
          setRows([]);
        }
      } catch (err) {
        setError(err.message || 'Could not read this Markdown file.');
      }
      return;
    }

    // 3. CSV or JSON Data File
    setFileType('data');
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

  const handleInsertMarkdownCard = () => {
    if (!markdownContent.trim() || isImporting) return;
    setIsImporting(true);
    try {
      onInsertDocument?.({
        title: docTitle.trim() || fileName || 'Document Card',
        docType: 'markdown',
        markdownText: markdownContent,
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Could not insert markdown card.');
      setIsImporting(false);
    }
  };

  const handleInsertPdfCard = () => {
    if (!pdfDataUrl || isImporting) return;
    setIsImporting(true);
    try {
      onInsertDocument?.({
        title: docTitle.trim() || fileName || 'PDF Document',
        docType: 'pdf',
        pdfDataUrl,
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Could not insert PDF card.');
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
                Data & Documents to Diagram
              </h2>
              <p className="pref-subtitle" style={{ margin: '4px 0 0' }}>
                Turn CSV, JSON, Markdown, or PDF files into canvas diagrams and document cards.
              </p>
            </div>
          </div>
          <button type="button" className="pref-esc-pill" onClick={onClose} aria-label="Close dialog">
            <X size={14} /> Esc
          </button>
        </header>

        {/* Upload Dropzone */}
        <div
          onClick={() => inputRef.current?.click()}
          style={{
            padding: 18,
            border: `1px dashed ${borderColor}`,
            borderRadius: 10,
            textAlign: 'center',
            cursor: 'pointer',
            background: isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)',
            transition: 'all 0.15s ease',
          }}
        >
          <FileUp size={24} color={mutedColor} style={{ margin: '0 auto 6px' }} />
          <p style={{ margin: '4px 0 6px', fontWeight: 600, fontSize: 13, color: isDark ? '#f4f4f5' : '#18181b' }}>
            {fileName ? `File chosen: ${fileName}` : 'Choose a .csv, .json, .md, or .pdf file'}
          </p>
          <p style={{ margin: 0, color: mutedColor, fontSize: 12 }}>
            Your data & documents stay 100% private on this device.
          </p>
          <input
            ref={inputRef}
            type="file"
            accept=".csv,.json,.md,.markdown,.pdf,text/csv,application/json,text/markdown,application/pdf"
            aria-label="Choose data, markdown, or PDF file"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
        </div>

        {error && (
          <div role="alert" style={{ display: 'flex', alignItems: 'flex-start', gap: 8, color: '#ef4444', fontSize: 13 }}>
            <AlertCircle size={16} style={{ flex: '0 0 auto' }} />
            <span>{error}</span>
          </div>
        )}

        {/* 1. Preview for CSV / JSON Table Data */}
        {fileType === 'data' && rows.length > 0 && (
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

        {/* 2. Preview for Markdown Document */}
        {fileType === 'markdown' && markdownContent && (
          <div style={{ minHeight: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <FileText size={16} style={{ color: '#10b981' }} />
                <strong style={{ fontSize: 13 }}>{fileName}</strong>
              </div>
              <span style={{ color: '#34d399', fontSize: 12, fontWeight: 600 }}>
                {markdownContent.split('\n').length} lines · {markdownContent.length} chars
              </span>
            </div>
            <div
              style={{
                maxHeight: 180,
                overflow: 'auto',
                padding: '10px 14px',
                borderRadius: 8,
                border: `1px solid ${borderColor}`,
                background: isDark ? '#141417' : '#f8fafc',
                fontFamily: 'monospace',
                fontSize: 12,
                lineHeight: 1.5,
                color: isDark ? '#e4e4e7' : '#18181b',
                whiteSpace: 'pre-wrap',
              }}
            >
              {markdownContent.slice(0, 800) + (markdownContent.length > 800 ? '\n\n... (truncated preview)' : '')}
            </div>
            <p style={{ margin: '8px 0 0', color: mutedColor, fontSize: 12 }}>
              Insert as a live scrollable Markdown Card, or convert its sections directly into connected diagram shapes.
            </p>
          </div>
        )}

        {/* 3. Preview for PDF Document */}
        {fileType === 'pdf' && pdfDataUrl && (
          <div
            style={{
              padding: '16px',
              borderRadius: 8,
              background: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <FileCode size={22} style={{ color: '#ef4444' }} />
              <div>
                <strong style={{ fontSize: 13, color: '#f87171' }}>{fileName}</strong>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: mutedColor }}>
                  PDF document is ready to be embedded as an interactive canvas card.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons Footer */}
        <footer className="data-diagram-modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button type="button" onClick={onClose}>Cancel</button>

          {/* If Markdown: provide both Insert Card and Generate Diagram */}
          {fileType === 'markdown' && (
            <>
              {rows.length > 0 && (
                <button
                  type="button"
                  className="help-dialog-btn secondary"
                  onClick={handleImport}
                  disabled={isImporting}
                  style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <Database size={14} /> Convert to Diagram ({rows.length} nodes)
                </button>
              )}
              <button
                type="button"
                className="data-diagram-primary-action"
                onClick={handleInsertMarkdownCard}
                disabled={!markdownContent.trim() || isImporting}
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <Plus size={14} /> Insert Markdown Card
              </button>
            </>
          )}

          {/* If PDF: provide Insert PDF Card */}
          {fileType === 'pdf' && (
            <button
              type="button"
              className="data-diagram-primary-action"
              onClick={handleInsertPdfCard}
              disabled={!pdfDataUrl || isImporting}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <Plus size={14} /> Insert PDF Card
            </button>
          )}

          {/* If Data (CSV / JSON): standard Create Diagram */}
          {(!fileType || fileType === 'data') && (
            <button
              type="button"
              className="data-diagram-primary-action"
              onClick={handleImport}
              disabled={!rows.length || isImporting}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <Database size={14} /> Create diagram
            </button>
          )}
        </footer>
      </section>
    </div>
  );
}

export default DataDiagramModal;
