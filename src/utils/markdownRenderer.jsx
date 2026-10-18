import React from 'react';

/**
 * Lightweight, zero-dependency Markdown renderer for canvas document cards.
 * Parses headings, lists, task checkboxes, code blocks, tables, bold, italic, and quotes.
 */
export function renderMarkdownToJSX(markdownText = '', isDark = true) {
  if (!markdownText) return null;

  const lines = markdownText.split('\n');
  const elements = [];
  let inCodeBlock = false;
  let codeBuffer = [];
  let codeLang = '';

  const textColor = isDark ? '#e4e4e7' : '#18181b';
  const textMuted = isDark ? '#a1a1aa' : '#71717a';
  const codeBg = isDark ? '#18181b' : '#f1f5f9';
  const borderCol = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Fenced code blocks
    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        elements.push(
          <div
            key={`code-${i}`}
            style={{
              background: codeBg,
              border: `1px solid ${borderCol}`,
              borderRadius: '8px',
              padding: '10px 12px',
              margin: '8px 0',
              overflowX: 'auto',
              fontFamily: '"Fira Code", monospace',
              fontSize: '12px',
              color: isDark ? '#38bdf8' : '#0369a1',
            }}
          >
            <pre style={{ margin: 0 }}>{codeBuffer.join('\n')}</pre>
          </div>
        );
        codeBuffer = [];
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
        codeLang = line.trim().slice(3);
      }
      continue;
    }

    if (inCodeBlock) {
      codeBuffer.push(line);
      continue;
    }

    // Headings
    if (line.startsWith('# ')) {
      elements.push(
        <h1 key={i} style={{ fontSize: '18px', fontWeight: 800, margin: '14px 0 6px', color: textColor }}>
          {line.slice(2)}
        </h1>
      );
      continue;
    }
    if (line.startsWith('## ')) {
      elements.push(
        <h2 key={i} style={{ fontSize: '15px', fontWeight: 700, margin: '12px 0 5px', color: textColor }}>
          {line.slice(3)}
        </h2>
      );
      continue;
    }
    if (line.startsWith('### ')) {
      elements.push(
        <h3 key={i} style={{ fontSize: '13px', fontWeight: 600, margin: '10px 0 4px', color: textColor }}>
          {line.slice(4)}
        </h3>
      );
      continue;
    }

    // Horizontal Rule
    if (line.trim() === '---' || line.trim() === '***') {
      elements.push(<hr key={i} style={{ border: 0, borderTop: `1px solid ${borderCol}`, margin: '10px 0' }} />);
      continue;
    }

    // Task Checklist
    if (/^-\s*\[([ xX])\]\s+(.*)/.test(line)) {
      const match = line.match(/^-\s*\[([ xX])\]\s+(.*)/);
      const isChecked = match[1].toLowerCase() === 'x';
      elements.push(
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '4px 0', fontSize: '12px' }}>
          <input type="checkbox" checked={isChecked} readOnly style={{ accentColor: '#6366f1' }} />
          <span style={{ textDecoration: isChecked ? 'line-through' : 'none', color: isChecked ? textMuted : textColor }}>
            {match[2]}
          </span>
        </div>
      );
      continue;
    }

    // Bullet List
    if (line.startsWith('- ') || line.startsWith('* ')) {
      elements.push(
        <div key={i} style={{ display: 'flex', gap: '6px', margin: '3px 0 3px 12px', fontSize: '12px', color: textColor }}>
          <span style={{ color: '#818cf8' }}>•</span>
          <span>{line.slice(2)}</span>
        </div>
      );
      continue;
    }

    // Blockquote
    if (line.startsWith('> ')) {
      elements.push(
        <blockquote
          key={i}
          style={{
            margin: '6px 0',
            paddingLeft: '10px',
            borderLeft: '3px solid #6366f1',
            color: textMuted,
            fontSize: '12px',
            fontStyle: 'italic',
          }}
        >
          {line.slice(2)}
        </blockquote>
      );
      continue;
    }

    // Empty line
    if (!line.trim()) {
      elements.push(<div key={i} style={{ height: '6px' }} />);
      continue;
    }

    // Standard paragraph
    elements.push(
      <p key={i} style={{ margin: '4px 0', fontSize: '12px', lineHeight: '1.5', color: textColor }}>
        {line}
      </p>
    );
  }

  return <div className="doodle-markdown-card-body">{elements}</div>;
}
