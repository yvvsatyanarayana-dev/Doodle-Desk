import React, { useState, useRef, useEffect } from 'react';
import {
  Play,
  RotateCcw,
  Trash2,
  Terminal,
  Code,
  Sparkles,
  Check,
  ChevronDown,
  Copy,
  FilePlus,
  Pencil,
  FileText,
  CornerDownRight,
} from 'lucide-react';
import { executeCodeSafely, CODE_PRESETS } from '../utils/codeRunner.js';

export function ExecutableCodeCard({
  element,
  doodleAPI,
  isDark = true,
}) {
  const initialCode = element.codeSnippet || element.customData?.codeSnippet || `// Write your own offline JavaScript code here!
const numbers = [12, 45, 78, 23, 56];
const doubled = numbers.map(n => n * 2);

console.log("Original array:", numbers);
console.log("Doubled array:", doubled);

return { count: numbers.length, sum: doubled.reduce((a, b) => a + b, 0) };`;

  const [code, setCode] = useState(initialCode);
  const [title, setTitle] = useState(element.name || element.title || 'JavaScript Scratchpad');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [logs, setLogs] = useState([]);
  const [result, setResult] = useState(undefined);
  const [error, setError] = useState(null);
  const [durationMs, setDurationMs] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isPresetsOpen, setIsPresetsOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isStamped, setIsStamped] = useState(false);
  const textareaRef = useRef(null);

  // Sync code changes to element scene data
  const handleCodeChange = (newCode) => {
    setCode(newCode);
    if (doodleAPI) {
      const allElements = doodleAPI.getSceneElements?.() || [];
      const updated = allElements.map((el) =>
        el.id === element.id
          ? {
              ...el,
              codeSnippet: newCode,
              version: (el.version || 1) + 1,
              versionNonce: Math.floor(Math.random() * 100000),
            }
          : el
      );
      doodleAPI.updateScene({ elements: updated, commitToHistory: false });
    }
  };

  const handleTitleSave = (newTitle) => {
    setTitle(newTitle);
    setIsEditingTitle(false);
    if (doodleAPI) {
      const allElements = doodleAPI.getSceneElements?.() || [];
      const updated = allElements.map((el) =>
        el.id === element.id
          ? {
              ...el,
              name: newTitle,
              title: newTitle,
              version: (el.version || 1) + 1,
              versionNonce: Math.floor(Math.random() * 100000),
            }
          : el
      );
      doodleAPI.updateScene({ elements: updated, commitToHistory: true });
    }
  };

  const handleRun = async (e) => {
    e?.stopPropagation?.();
    setIsRunning(true);
    setError(null);
    try {
      const outcome = await executeCodeSafely(code);
      setLogs(outcome.logs || []);
      setResult(outcome.result ?? outcome.returnValue);
      setError(outcome.error);
      setDurationMs(outcome.durationMs ?? outcome.executionTimeMs ?? 0);
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setIsRunning(false);
    }
  };

  const handleClearConsole = (e) => {
    e?.stopPropagation?.();
    setLogs([]);
    setResult(undefined);
    setError(null);
    setDurationMs(0);
  };

  const handleNewScript = (e) => {
    e?.stopPropagation?.();
    const blankCode = `// New Blank JavaScript Script\n// Write your calculations or algorithms below:\n\n`;
    handleCodeChange(blankCode);
    handleClearConsole();
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 50);
  };

  const handleSelectPreset = (preset) => {
    handleCodeChange(preset.code);
    setIsPresetsOpen(false);
    handleClearConsole();
  };

  const handleCopyCode = async (e) => {
    e?.stopPropagation?.();
    try {
      await navigator.clipboard.writeText(code);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  // Stamp code and console output directly as real Doodle Canvas text elements
  const handleStampToCanvas = (e) => {
    e?.stopPropagation?.();
    if (!doodleAPI) return;
    const allElements = doodleAPI.getSceneElements?.() || [];
    const spawnX = (element.x || 100) + (element.width || 420) + 40;
    const spawnY = element.y || 100;

    const logOutputs = logs.map((l) => l.text || l.message).join('\n');
    const resultOutput = result !== undefined ? `↳ Result: ${typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result)}` : '';
    const fullText = `// ─── ${title} ───\n${code}\n\n// ─── Output ───\n${logOutputs || '(No console logs)'}\n${resultOutput}`.trim();

    const textEl = {
      id: `code_stamp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      type: 'text',
      x: spawnX,
      y: spawnY,
      width: Math.min(500, Math.max(300, element.width || 420)),
      height: 240,
      text: fullText,
      fontSize: 14,
      fontFamily: 3, // Monospace
      strokeColor: isDark ? '#e4e4e7' : '#18181b',
      backgroundColor: 'transparent',
      isDeleted: false,
      version: 1,
      versionNonce: Math.floor(Math.random() * 100000),
    };

    doodleAPI.updateScene({ elements: [...allElements, textEl], commitToHistory: true });
    doodleAPI.setSelectedElements?.({ [textEl.id]: true });
    doodleAPI.onToast?.('Stamped code & output as canvas text!');
    setIsStamped(true);
    setTimeout(() => setIsStamped(false), 2000);
  };

  const handleDelete = (e) => {
    e?.stopPropagation?.();
    e?.preventDefault?.();
    if (doodleAPI) {
      const allElements = doodleAPI.getSceneElements?.() || [];
      const updated = allElements.map((el) =>
        el.id === element.id
          ? { ...el, isDeleted: true, version: (el.version || 1) + 1, versionNonce: Math.floor(Math.random() * 100000) }
          : el
      );
      doodleAPI.updateScene({ elements: updated, commitToHistory: true });
      doodleAPI.setSelectedElements?.({});
    }
  };

  // Allow tab key indentation inside textarea
  const handleKeyDown = (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = e.target.selectionStart;
      const end = e.target.selectionEnd;
      const updated = code.substring(0, start) + '  ' + code.substring(end);
      handleCodeChange(updated);
      window.requestAnimationFrame(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + 2;
        }
      });
    }
    // Ctrl+Enter or Cmd+Enter to run
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleRun();
    }
  };

  const borderColor = isDark ? 'rgba(255, 255, 255, 0.12)' : '#e4e4e7';
  const cardBg = isDark ? '#141418' : '#ffffff';

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: cardBg,
        borderRadius: '8px',
        color: isDark ? '#f4f4f5' : '#18181b',
        boxSizing: 'border-box',
        overflow: 'hidden',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.35)',
        border: `1px solid ${borderColor}`,
        pointerEvents: 'auto',
      }}
      onPointerDown={(e) => {
        // Stop propagation so canvas doesn't steal drag if interacting inside card
        if (['textarea', 'input', 'button'].includes(e.target.tagName?.toLowerCase())) {
          e.stopPropagation();
        }
      }}
      onClick={(e) => {
        if (!['textarea', 'button', 'input'].includes(e.target.tagName?.toLowerCase())) {
          doodleAPI?.setSelectedElements?.({ [element.id]: true });
        }
      }}
    >
      {/* Card Header */}
      <div
        style={{
          padding: '8px 12px',
          background: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
          borderBottom: `1px solid ${borderColor}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
          gap: '8px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
          <Code size={15} style={{ color: '#818cf8', flexShrink: 0 }} />

          {/* Editable Title */}
          {isEditingTitle ? (
            <input
              type="text"
              autoFocus
              defaultValue={title}
              onBlur={(e) => handleTitleSave(e.target.value.trim() || 'JavaScript Scratchpad')}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleTitleSave(e.target.value.trim() || 'JavaScript Scratchpad');
                if (e.key === 'Escape') setIsEditingTitle(false);
              }}
              style={{
                fontSize: '12px',
                fontWeight: 700,
                background: isDark ? '#1f1f28' : '#f1f5f9',
                color: isDark ? '#f4f4f5' : '#18181b',
                border: '1px solid #6366f1',
                borderRadius: '4px',
                padding: '2px 6px',
                outline: 'none',
              }}
              onPointerDown={(e) => e.stopPropagation()}
            />
          ) : (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                cursor: 'pointer',
                overflow: 'hidden',
              }}
              onClick={() => setIsEditingTitle(true)}
              title="Click to rename script"
            >
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  color: isDark ? '#f4f4f5' : '#18181b',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {title}
              </span>
              <Pencil size={11} style={{ opacity: 0.5, flexShrink: 0 }} />
            </div>
          )}

          <span
            style={{
              fontSize: '10px',
              fontWeight: 600,
              padding: '1px 6px',
              borderRadius: '4px',
              background: 'rgba(99, 102, 241, 0.15)',
              color: '#818cf8',
              flexShrink: 0,
            }}
          >
            JS Live
          </span>
        </div>

        {/* Toolbar Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
          {/* New Script Button */}
          <button
            type="button"
            onClick={handleNewScript}
            style={{
              background: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
              border: `1px solid ${borderColor}`,
              borderRadius: '5px',
              padding: '4px 7px',
              fontSize: '11px',
              color: isDark ? '#e4e4e7' : '#27272a',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
            title="Start a new blank JavaScript script"
          >
            <FilePlus size={12} style={{ color: '#10b981' }} />
            <span>New</span>
          </button>

          {/* Preset dropdown */}
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsPresetsOpen(!isPresetsOpen);
              }}
              style={{
                background: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
                border: `1px solid ${borderColor}`,
                borderRadius: '5px',
                padding: '4px 8px',
                fontSize: '11px',
                color: isDark ? '#e4e4e7' : '#27272a',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
              title="Select Example Code Presets"
            >
              <Sparkles size={11} style={{ color: '#a78bfa' }} />
              <span>Presets</span>
              <ChevronDown size={11} />
            </button>

            {isPresetsOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: '4px',
                  width: '210px',
                  background: isDark ? '#1c1c22' : '#ffffff',
                  border: `1px solid ${borderColor}`,
                  borderRadius: '6px',
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
                  zIndex: 20,
                  overflow: 'hidden',
                }}
                onClick={(e) => e.stopPropagation()}
              >
                {CODE_PRESETS.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => handleSelectPreset(p)}
                    style={{
                      padding: '8px 12px',
                      fontSize: '11px',
                      color: isDark ? '#e4e4e7' : '#27272a',
                      cursor: 'pointer',
                      borderBottom: isDark ? '1px solid rgba(255,255,255,0.05)' : '1px solid #f4f4f5',
                      transition: 'background 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    {p.name}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Copy Code */}
          <button
            type="button"
            onClick={handleCopyCode}
            style={{
              background: 'transparent',
              border: `1px solid ${borderColor}`,
              borderRadius: '5px',
              padding: '4px 6px',
              color: isCopied ? '#10b981' : isDark ? '#a1a1aa' : '#71717a',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
            }}
            title="Copy code to clipboard"
          >
            {isCopied ? <Check size={12} /> : <Copy size={12} />}
          </button>

          {/* Stamp to Canvas */}
          <button
            type="button"
            onClick={handleStampToCanvas}
            style={{
              background: isStamped ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
              border: `1px solid ${borderColor}`,
              borderRadius: '5px',
              padding: '4px 6px',
              color: isStamped ? '#10b981' : isDark ? '#a1a1aa' : '#71717a',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '11px',
            }}
            title="Stamp code & output directly onto the canvas as Doodle text"
          >
            <FileText size={12} />
            <span style={{ fontSize: '10px' }}>Stamp</span>
          </button>

          {/* Run button */}
          <button
            type="button"
            onClick={handleRun}
            disabled={isRunning}
            style={{
              background: '#4f46e5',
              border: 'none',
              borderRadius: '5px',
              padding: '4px 10px',
              fontSize: '11px',
              fontWeight: 600,
              color: '#ffffff',
              cursor: isRunning ? 'wait' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              boxShadow: '0 2px 8px rgba(79, 70, 229, 0.35)',
              transition: 'background 0.15s ease',
            }}
            title="Run JavaScript (Ctrl+Enter)"
          >
            <Play size={11} fill="currentColor" />
            <span>{isRunning ? 'Running...' : 'Run'}</span>
          </button>

          {/* Delete card */}
          <button
            type="button"
            onClick={handleDelete}
            style={{
              background: 'transparent',
              border: 'none',
              borderRadius: '4px',
              color: '#a1a1aa',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              transition: 'all 0.15s ease',
            }}
            title="Delete card from canvas"
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#ef4444';
              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.12)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#a1a1aa';
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Editor & Console Split Body */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        {/* Code Editor */}
        <div style={{ flex: '1 1 55%', minHeight: '130px', position: 'relative' }}>
          <textarea
            ref={textareaRef}
            value={code}
            onChange={(e) => handleCodeChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onPointerDown={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            placeholder="// Type or paste your own JavaScript code here..."
            spellCheck={false}
            style={{
              width: '100%',
              height: '100%',
              padding: '10px 14px',
              border: 'none',
              background: isDark ? '#111114' : '#fafafa',
              color: isDark ? '#e4e4e7' : '#18181b',
              fontFamily: '"Fira Code", "Cascadia Code", Consolas, monospace',
              fontSize: '12px',
              lineHeight: '1.5',
              resize: 'none',
              boxSizing: 'border-box',
              outline: 'none',
              userSelect: 'text',
              pointerEvents: 'auto',
            }}
          />
        </div>

        {/* Console Header Bar */}
        <div
          style={{
            padding: '4px 12px',
            background: isDark ? '#1a1a20' : '#f1f5f9',
            borderTop: `1px solid ${borderColor}`,
            borderBottom: `1px solid ${borderColor}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '10.5px',
            color: isDark ? '#a1a1aa' : '#64748b',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Terminal size={12} />
            <span style={{ fontWeight: 600 }}>Console Output</span>
            {durationMs > 0 && (
              <span style={{ color: '#10b981', fontWeight: 600 }}>
                ({durationMs}ms)
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={handleClearConsole}
            style={{
              background: 'transparent',
              border: 'none',
              color: isDark ? '#a1a1aa' : '#64748b',
              fontSize: '10.5px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '3px',
            }}
            title="Clear console"
          >
            <RotateCcw size={10} />
            <span>Clear</span>
          </button>
        </div>

        {/* Console Output Viewer */}
        <div
          style={{
            flex: '1 1 45%',
            minHeight: '80px',
            maxHeight: '180px',
            overflowY: 'auto',
            padding: '8px 12px',
            background: isDark ? '#0c0c0e' : '#f8fafc',
            fontFamily: '"Fira Code", "Cascadia Code", Consolas, monospace',
            fontSize: '11px',
            lineHeight: '1.4',
            userSelect: 'text',
            boxSizing: 'border-box',
            pointerEvents: 'auto',
          }}
          onPointerDown={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {error && (
            <div
              style={{
                padding: '6px 8px',
                borderRadius: '4px',
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#f87171',
                marginBottom: '6px',
                fontSize: '11px',
              }}
            >
              <strong>Error:</strong> {error}
            </div>
          )}

          {logs.length === 0 && !error && result === undefined && (
            <div style={{ color: isDark ? '#52525b' : '#94a3b8', fontStyle: 'italic', padding: '6px 0' }}>
              Hit "Run" (or Ctrl+Enter) to execute code and view output.
            </div>
          )}

          {logs.map((log, i) => (
            <div
              key={i}
              style={{
                color: log.type === 'error' ? '#f87171' : log.type === 'warn' ? '#fbbf24' : (isDark ? '#e4e4e7' : '#18181b'),
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
                marginBottom: '4px',
              }}
            >
              {log.text || log.message}
            </div>
          ))}

          {result !== undefined && (
            <div
              style={{
                marginTop: '6px',
                paddingTop: '6px',
                borderTop: isDark ? '1px dashed rgba(255,255,255,0.1)' : '1px dashed #e2e8f0',
                color: '#38bdf8',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
              }}
            >
              <strong>↳ Return:</strong> {typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ExecutableCodeCard;
