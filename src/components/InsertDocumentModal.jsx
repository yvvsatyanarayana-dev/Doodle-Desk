import React, { useState, useEffect, useRef } from 'react';
import { FileText, Upload, Plus, FileCode, CheckCircle2 } from 'lucide-react';

export function InsertDocumentModal({
  isOpen,
  onClose,
  onInsertDocument,
  theme = 'dark',
}) {
  const isDark = theme !== 'light';
  const [docTitle, setDocTitle] = useState('');
  const [docContent, setDocContent] = useState('');
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [pdfData, setPdfData] = useState(null);
  const fileInputRef = useRef(null);

  // Reset when dialog opens/closes
  useEffect(() => {
    if (!isOpen) {
      setDocTitle('');
      setDocContent('');
      setUploadedFileName('');
      setPdfData(null);
    }
  }, [isOpen]);

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

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const baseTitle = file.name.replace(/\.[^/.]+$/, '');
    setDocTitle(baseTitle);
    setUploadedFileName(file.name);

    if (file.name.toLowerCase().endsWith('.pdf')) {
      const reader = new FileReader();
      reader.onload = () => {
        setPdfData({
          title: file.name,
          pdfDataUrl: reader.result,
        });
      };
      reader.readAsDataURL(file);
      return;
    }

    setPdfData(null);
    const reader = new FileReader();
    reader.onload = () => {
      setDocContent(reader.result || '');
    };
    reader.readAsText(file);
  };

  const handleInsertPdf = () => {
    if (!pdfData) return;
    onInsertDocument?.({
      title: docTitle.trim() || pdfData.title,
      docType: 'pdf',
      pdfDataUrl: pdfData.pdfDataUrl,
    });
    onClose();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (pdfData) {
      handleInsertPdf();
      return;
    }
    if (!docContent.trim()) return;

    onInsertDocument?.({
      title: docTitle.trim() || 'Document Card',
      docType: 'markdown',
      markdownText: docContent,
    });
    onClose();
  };

  const borderColor = isDark ? 'rgba(255, 255, 255, 0.1)' : '#e4e4e7';

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 99999 }}>
      <div
        className="pref-modal-content help-style-dialog"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '680px',
          width: '94vw',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
        }}
      >
        {/* Header matching Doodle Desk Dialog System */}
        <div className="pref-header" style={{ marginBottom: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="help-dialog-icon-badge">
              <FileText size={16} />
            </div>
            <div>
              <h2 className="pref-title" style={{ fontSize: '18px', fontWeight: 600 }}>
                Insert Document Card
              </h2>
            </div>
          </div>
          <button
            type="button"
            className="pref-esc-pill"
            onClick={onClose}
            aria-label="Close dialog"
          >
            Esc to close
          </button>
        </div>

        {/* Subtitle */}
        <h3 className="pref-subtitle" style={{ margin: '0 0 2px 0' }}>
          Embed Scrollable Markdown or Local PDF Cards On Canvas
        </h3>

        {/* Upload Zone (Single prominent upload action, zero pre-templates) */}
        <div
          onClick={() => fileInputRef.current?.click()}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            padding: '14px 18px',
            borderRadius: '10px',
            border: `1px dashed ${borderColor}`,
            background: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '8px',
                background: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: isDark ? '#ffffff' : '#18181b',
              }}
            >
              <Upload size={18} />
            </div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: isDark ? '#f4f4f5' : '#18181b' }}>
                {uploadedFileName ? `Selected: ${uploadedFileName}` : 'Upload Markdown (.md) or PDF (.pdf) file'}
              </div>
              <div style={{ fontSize: '12px', color: isDark ? '#a1a1aa' : '#71717a', marginTop: '2px' }}>
                {uploadedFileName ? 'Click to change file' : 'Click to browse or drop file here'}
              </div>
            </div>
          </div>

          <button
            type="button"
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              background: isDark ? '#27272a' : '#f4f4f5',
              border: `1px solid ${borderColor}`,
              color: isDark ? '#f4f4f5' : '#18181b',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Upload size={13} />
            <span>Browse</span>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".md,.markdown,.txt,.pdf"
            style={{ display: 'none' }}
            onChange={handleFileUpload}
          />
        </div>

        {/* If a PDF is uploaded, display ready confirmation */}
        {pdfData && (
          <div
            style={{
              padding: '12px 16px',
              borderRadius: '8px',
              background: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileCode size={18} style={{ color: '#ef4444' }} />
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#f87171' }}>
                  PDF Document Ready to Embed
                </div>
                <div style={{ fontSize: '11px', color: isDark ? '#a1a1aa' : '#71717a' }}>
                  {uploadedFileName}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={handleInsertPdf}
              className="help-dialog-btn primary"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                fontSize: '12px',
              }}
            >
              <Plus size={14} />
              <span>Insert PDF Card</span>
            </button>
          </div>
        )}

        {/* Form Body for Markdown or Manual Entry */}
        {!pdfData && (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '11px',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  color: isDark ? '#a1a1aa' : '#71717a',
                  marginBottom: '4px',
                }}
              >
                Card Title
              </label>
              <input
                type="text"
                value={docTitle}
                onChange={(e) => setDocTitle(e.target.value)}
                placeholder="e.g., Architecture Notes or Sprint Tasks"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: `1px solid ${borderColor}`,
                  background: isDark ? '#18181b' : '#ffffff',
                  color: isDark ? '#ffffff' : '#18181b',
                  fontSize: '13px',
                  boxSizing: 'border-box',
                  outline: 'none',
                }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '11px',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  color: isDark ? '#a1a1aa' : '#71717a',
                  marginBottom: '4px',
                }}
              >
                Markdown Content
              </label>
              <textarea
                value={docContent}
                onChange={(e) => setDocContent(e.target.value)}
                placeholder="# Type, paste, or upload markdown content here..."
                style={{
                  minHeight: '220px',
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: `1px solid ${borderColor}`,
                  background: isDark ? '#18181b' : '#ffffff',
                  color: isDark ? '#e4e4e7' : '#18181b',
                  fontFamily: '"Fira Code", Cascadia, monospace',
                  fontSize: '12px',
                  lineHeight: '1.5',
                  resize: 'vertical',
                  boxSizing: 'border-box',
                  outline: 'none',
                }}
              />
            </div>

            {/* Footer Actions */}
            <div className="help-dialog-actions" style={{ marginTop: '4px' }}>
              <button
                type="button"
                className="help-dialog-btn secondary"
                onClick={onClose}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!docContent.trim()}
                className="help-dialog-btn primary"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  opacity: !docContent.trim() ? 0.5 : 1,
                  cursor: !docContent.trim() ? 'not-allowed' : 'pointer',
                }}
              >
                <Plus size={14} />
                <span>Insert Markdown Card</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default InsertDocumentModal;
