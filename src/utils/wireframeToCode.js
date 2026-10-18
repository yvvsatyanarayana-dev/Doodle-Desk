/**
 * wireframeToCode.js
 * Analyzes Doodle Desk canvas wireframe elements and synthesizes clean, semantic
 * React + Tailwind CSS components and HTML markup with responsive layout and live preview.
 */

// Helper to determine if element A contains element B
function isInside(child, parent) {
  if (child.id === parent.id) return false;
  return (
    child.x >= parent.x - 4 &&
    child.y >= parent.y - 4 &&
    child.x + (child.width || 0) <= parent.x + (parent.width || 0) + 8 &&
    child.y + (child.height || 0) <= parent.y + (parent.height || 0) + 8
  );
}

// Convert hex color to Tailwind shade or custom color class
function mapColorToTailwind(hex, type = 'text') {
  if (!hex || hex === 'transparent') return type === 'bg' ? 'bg-transparent' : 'text-current';
  const h = hex.toLowerCase();
  
  if (h === '#1e1e1e' || h === '#121212' || h === '#000000') {
    return type === 'bg' ? 'bg-zinc-900 text-white' : (type === 'border' ? 'border-zinc-700' : 'text-zinc-900 dark:text-zinc-100');
  }
  if (h === '#ffffff' || h === '#f8fafc' || h === '#f4f4f5' || h === '#fff') {
    return type === 'bg' ? 'bg-white dark:bg-zinc-800' : (type === 'border' ? 'border-white/80 dark:border-white/80' : 'text-white');
  }
  if (h.includes('31') || h.includes('e0') || h.includes('c2255c') || h.includes('red')) {
    return type === 'bg' ? 'bg-red-500 text-white' : (type === 'border' ? 'border-red-500' : 'text-red-500');
  }
  if (h.includes('9e') || h.includes('2f') || h.includes('099268') || h.includes('green')) {
    return type === 'bg' ? 'bg-emerald-600 text-white' : (type === 'border' ? 'border-emerald-500' : 'text-emerald-600');
  }
  if (h.includes('71') || h.includes('19') || h.includes('5c7cfa') || h.includes('blue')) {
    return type === 'bg' ? 'bg-blue-600 text-white' : (type === 'border' ? 'border-blue-500' : 'text-blue-600');
  }
  if (h.includes('8c') || h.includes('f0') || h.includes('e8590c') || h.includes('orange')) {
    return type === 'bg' ? 'bg-amber-500 text-white' : (type === 'border' ? 'border-amber-500' : 'text-amber-500');
  }
  if (h.includes('36') || h.includes('9c') || h.includes('purple')) {
    return type === 'bg' ? 'bg-purple-600 text-white' : (type === 'border' ? 'border-purple-500' : 'text-purple-600');
  }
  return type === 'bg' ? 'bg-indigo-600 text-white' : (type === 'border' ? 'border-indigo-500' : 'text-indigo-600');
}

/**
 * Determine max width class and container styling based on real card dimensions
 */
function getCardDimensions(width) {
  if (width >= 1150) return { maxWidth: 'max-w-7xl', padding: 'p-8 md:p-12', rounded: 'rounded-3xl', gap: 'space-y-8' };
  if (width >= 850) return { maxWidth: 'max-w-5xl', padding: 'p-8 md:p-10', rounded: 'rounded-3xl', gap: 'space-y-6' };
  if (width >= 620) return { maxWidth: 'max-w-3xl', padding: 'p-6 md:p-8', rounded: 'rounded-2xl', gap: 'space-y-6' };
  if (width >= 460) return { maxWidth: 'max-w-xl', padding: 'p-6', rounded: 'rounded-2xl', gap: 'space-y-4' };
  if (width >= 340) return { maxWidth: 'max-w-md', padding: 'p-6', rounded: 'rounded-2xl', gap: 'space-y-4' };
  return { maxWidth: 'max-w-sm', padding: 'p-4', rounded: 'rounded-xl', gap: 'space-y-3' };
}

/**
 * Classify element into semantic UI role
 */
function classifyElement(el, allElements) {
  const { type, width = 0, height = 0 } = el;

  if (type === 'text') {
    const fontSize = el.fontSize || 16;
    if (fontSize >= 28) return 'heading-1';
    if (fontSize >= 22) return 'heading-2';
    if (fontSize >= 18) return 'heading-3';
    return 'paragraph';
  }

  if (type === 'diamond') {
    return 'diamond';
  }

  if (type === 'rectangle' || type === 'frame') {
    const textsInside = allElements.filter(other => other.type === 'text' && isInside(other, el));
    const isSmall = height >= 24 && height <= 58 && width >= 40 && width <= 280;

    if (isSmall) {
      const lowerText = (textsInside[0]?.text || '').toLowerCase();
      if (lowerText.includes('search') || lowerText.includes('enter') || lowerText.includes('type') || lowerText.includes('email') || lowerText.includes('name')) {
        return 'input';
      }
      return 'button';
    }

    if (width <= 140 && height <= 38) {
      return 'badge';
    }

    return 'card';
  }

  if (type === 'ellipse') {
    if (width <= 48 && height <= 48) return 'avatar';
    if (width <= 26 && height <= 26) return 'badge';
    return 'ellipse';
  }

  if (type === 'line' || type === 'arrow') {
    return 'divider';
  }

  if (type === 'image') {
    return 'image';
  }

  return 'generic';
}

/**
 * Cluster child elements into rows by similar Y positions
 */
function clusterChildrenIntoRows(children) {
  if (children.length <= 1) return children.map(c => [c]);

  const sorted = [...children].sort((a, b) => {
    const diff = a.y - b.y;
    if (Math.abs(diff) > 22) return diff;
    return a.x - b.x;
  });

  const rows = [];
  let currentRow = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const item = sorted[i];
    const prev = currentRow[0];
    if (Math.abs(item.y - prev.y) <= 22) {
      currentRow.push(item);
    } else {
      currentRow.sort((a, b) => a.x - b.x);
      rows.push(currentRow);
      currentRow = [item];
    }
  }
  if (currentRow.length > 0) {
    currentRow.sort((a, b) => a.x - b.x);
    rows.push(currentRow);
  }

  return rows;
}

/**
 * Main Wireframe-to-Code generator
 */
export function generateWireframeCode(elements) {
  // Filter active elements and remove empty / ghost text nodes
  const activeEls = (elements || []).filter(el => {
    if (el.isDeleted || el.isHidden || (el.opacity ?? 100) <= 0) return false;
    if (el.type === 'text' && (!el.text || !el.text.trim())) return false;
    return true;
  });

  if (activeEls.length === 0) {
    return {
      jsx: `// No elements selected to generate code from.\nexport default function EmptyWireframe() {\n  return (\n    <div className="p-8 text-center text-gray-500">\n      No elements selected.\n    </div>\n  );\n}`,
      html: `<!-- No elements selected -->\n<div class="p-8 text-center text-gray-500">No elements selected</div>`,
      previewHtml: `<!DOCTYPE html><html><body style="font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;color:#71717a;background:#09090b;">No elements selected</body></html>`,
      componentName: 'EmptyWireframe',
      elementCount: 0,
    };
  }

  // Sort elements by spatial top-to-bottom, left-to-right order
  const sorted = [...activeEls].sort((a, b) => {
    const rowDiff = a.y - b.y;
    if (Math.abs(rowDiff) > 30) return rowDiff;
    return a.x - b.x;
  });

  // Identify container elements (cards, frames)
  const containers = sorted.filter(el => {
    const role = classifyElement(el, sorted);
    return role === 'card' || el.type === 'frame';
  });

  // Build tree of elements
  const topLevel = [];
  const assigned = new Set();

  for (const container of containers) {
    const children = sorted.filter(other => other.id !== container.id && isInside(other, container));
    children.forEach(c => assigned.add(c.id));
  }

  for (const el of sorted) {
    if (!assigned.has(el.id)) {
      topLevel.push(el);
    }
  }

  function renderElementJSX(el, indent = '      ') {
    const role = classifyElement(el, sorted);
    const textInside = sorted.find(other => other.type === 'text' && other.id !== el.id && isInside(other, el))?.text || el.text || '';
    const cleanText = textInside.replace(/["\\]/g, '\\$&').replace(/\n/g, ' ').trim();

    switch (role) {
      case 'heading-1':
        return `${indent}<h1 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white mb-2">\n${indent}  ${cleanText || 'Heading Title'}\n${indent}</h1>`;
      case 'heading-2':
        return `${indent}<h2 className="text-2xl font-bold tracking-tight text-gray-800 dark:text-gray-100 mb-2">\n${indent}  ${cleanText || 'Section Header'}\n${indent}</h2>`;
      case 'heading-3':
        return `${indent}<h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-1">\n${indent}  ${cleanText || 'Subsection'}\n${indent}</h3>`;
      case 'paragraph':
        return `${indent}<p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-3">\n${indent}  ${cleanText || 'Description text goes here.'}\n${indent}</p>`;
      case 'button': {
        const bgClass = el.backgroundColor && el.backgroundColor !== 'transparent'
          ? mapColorToTailwind(el.backgroundColor, 'bg')
          : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm';
        return `${indent}<button className="inline-flex items-center justify-center px-4 py-2.5 text-sm font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${bgClass}">\n${indent}  ${cleanText || 'Button'}\n${indent}</button>`;
      }
      case 'input':
        return `${indent}<div className="w-full max-w-sm mb-3">\n${indent}  <input\n${indent}    type="text"\n${indent}    placeholder="${cleanText || 'Enter text...'}"\n${indent}    className="w-full px-3.5 py-2 text-sm bg-white dark:bg-zinc-800 border border-gray-300 dark:border-zinc-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"\n${indent}  />\n${indent}</div>`;
      case 'badge':
        return `${indent}<span className="inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">\n${indent}  ${cleanText || 'Tag'}\n${indent}</span>`;
      case 'avatar':
        return `${indent}<div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm shadow-sm ring-2 ring-white dark:ring-zinc-900">\n${indent}  ${(cleanText[0] || 'U').toUpperCase()}\n${indent}</div>`;
      case 'diamond': {
        const w = Math.round(el.width || 120);
        const h = Math.round(el.height || 120);
        const stroke = el.strokeColor || '#ffffff';
        const bg = el.backgroundColor && el.backgroundColor !== 'transparent' ? el.backgroundColor : 'transparent';
        const sw = Math.max(1, Math.round(el.strokeWidth || 2));
        const halfW = Math.round(w / 2);
        const halfH = Math.round(h / 2);
        const inset = Math.max(sw, 2);
        return `${indent}<div className="flex items-center justify-center my-4">\n` +
               `${indent}  <svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" className="overflow-visible">\n` +
               `${indent}    <polygon points="${halfW},${inset} ${w - inset},${halfH} ${halfW},${h - inset} ${inset},${halfH}" fill="${bg}" stroke="${stroke}" strokeWidth="${sw}" strokeLinejoin="round" />\n` +
               `${indent}  </svg>\n` +
               `${indent}</div>`;
      }
      case 'ellipse': {
        const w = Math.round(el.width || 80);
        const h = Math.round(el.height || 80);
        const stroke = el.strokeColor || '#ffffff';
        const bg = el.backgroundColor && el.backgroundColor !== 'transparent' ? el.backgroundColor : 'transparent';
        const sw = Math.max(1, Math.round(el.strokeWidth || 2));
        return `${indent}<div className="flex items-center justify-center my-4">\n` +
               `${indent}  <svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">\n` +
               `${indent}    <ellipse cx="${w / 2}" cy="${h / 2}" rx="${(w - sw * 2) / 2}" ry="${(h - sw * 2) / 2}" fill="${bg}" stroke="${stroke}" strokeWidth="${sw}" />\n` +
               `${indent}  </svg>\n` +
               `${indent}</div>`;
      }
      case 'divider': {
        const stroke = el.strokeColor || '#ffffff';
        const isWhite = stroke.toLowerCase() === '#ffffff' || stroke.toLowerCase() === '#fff';
        const borderClass = isWhite ? 'border-white/80 dark:border-white/80' : 'border-gray-200 dark:border-zinc-800';
        return `${indent}<hr className="my-4 ${borderClass} w-full" />`;
      }
      case 'image':
        return `${indent}<div className="w-full h-44 rounded-xl bg-gray-100 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 flex items-center justify-center text-gray-400 overflow-hidden mb-3">\n${indent}  <span className="text-xs font-medium">${cleanText || 'Image Placeholder'}</span>\n${indent}</div>`;
      case 'card': {
        const { maxWidth, padding, rounded, gap } = getCardDimensions(el.width || 400);
        const children = sorted.filter(c => c.id !== el.id && isInside(c, el));
        
        // Match visual stroke color and aspect ratio
        const strokeColor = el.strokeColor || '#ffffff';
        const isWhiteStroke = strokeColor.toLowerCase() === '#ffffff' || strokeColor.toLowerCase() === '#fff';
        const borderClass = isWhiteStroke ? 'border-2 border-white/80 dark:border-white/80' : 'border border-gray-200 dark:border-zinc-800';
        
        const isPortrait = (el.height || 0) > (el.width || 0) * 1.15;
        const portraitClasses = isPortrait ? `min-h-[${Math.min(Math.round(el.height), 540)}px] flex flex-col justify-between items-center` : '';
        
        let renderedChildren = '';
        if (children.length > 0) {
          const rows = clusterChildrenIntoRows(children);
          renderedChildren = rows.map(row => {
            if (row.length === 1) {
              return renderElementJSX(row[0], indent + '  ');
            }
            const cols = Math.min(row.length, 4);
            const inner = row.map(c => renderElementJSX(c, indent + '    ')).join('\n');
            return `${indent}  <div className="grid grid-cols-1 md:grid-cols-${cols} gap-4 w-full items-center">\n${inner}\n${indent}  </div>`;
          }).join('\n');
        } else {
          renderedChildren = cleanText
            ? `${indent}  <div className="text-sm font-medium text-gray-700 dark:text-gray-300">${cleanText}</div>`
            : `${indent}  <div className="p-4 bg-gray-50 dark:bg-zinc-800/50 border border-dashed border-gray-200 dark:border-zinc-700 rounded-lg text-xs text-gray-500 text-center">Card Content</div>`;
        }

        return `${indent}<div className="${padding} bg-white dark:bg-zinc-900 ${borderClass} ${rounded} shadow-sm ${gap} ${maxWidth} ${portraitClasses} w-full">\n${renderedChildren}\n${indent}</div>`;
      }
      default:
        return `${indent}<div className="p-3 bg-gray-50 dark:bg-zinc-800 rounded-lg text-xs text-gray-600 dark:text-gray-400">\n${indent}  ${cleanText || 'Content Element'}\n${indent}</div>`;
    }
  }

  const componentBody = topLevel.map(el => renderElementJSX(el, '      ')).join('\n\n');

  const jsxCode = `import React, { useState } from 'react';

export default function GeneratedWireframe() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 p-6 md:p-12 flex flex-col items-center justify-center gap-6 font-sans antialiased text-gray-900 dark:text-zinc-100">
${componentBody}
    </div>
  );
}`;

  // Clean HTML markup without React wrappers
  const rawHtmlChildren = componentBody
    .replace(/className=/g, 'class=')
    .replace(/\{`([^`]+)`\}/g, '$1');

  // Clean HTML file for user copy & download (pure semantic HTML without inline CSS dumps)
  const htmlCode = `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Wireframe Preview</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="min-h-screen bg-gray-50 dark:bg-zinc-950 p-6 md:p-12 flex flex-col items-center justify-center gap-6 font-sans antialiased text-gray-900 dark:text-zinc-100">
${rawHtmlChildren}
</body>
</html>`;

  // Complete offline-ready stylesheet with custom scrollbars for the sandbox iframe preview
  const previewEmbeddedCSS = `
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html {
      height: 100%;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      line-height: 1.5;
      -webkit-font-smoothing: antialiased;
      min-height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 2rem 1.25rem;
      gap: 1.5rem;
      background-color: #09090b;
      color: #f4f4f5;
    }
    html.light body {
      background-color: #f8fafc;
      color: #09090b;
    }
    /* Themed Sleek Scrollbars matching Doodle Desk */
    ::-webkit-scrollbar {
      width: 6px;
      height: 6px;
    }
    ::-webkit-scrollbar-track {
      background: transparent;
    }
    ::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.2);
      border-radius: 999px;
    }
    ::-webkit-scrollbar-thumb:hover {
      background: rgba(255, 255, 255, 0.38);
    }
    html.light ::-webkit-scrollbar-thumb {
      background: rgba(0, 0, 0, 0.22);
    }
    html.light ::-webkit-scrollbar-thumb:hover {
      background: rgba(0, 0, 0, 0.38);
    }

    .min-h-screen { min-height: 100%; }
    .w-full { width: 100%; }
    .max-w-sm { max-width: 24rem; }
    .max-w-md { max-width: 28rem; }
    .max-w-xl { max-width: 36rem; }
    .max-w-3xl { max-width: 48rem; }
    .max-w-5xl { max-width: 64rem; }
    .max-w-7xl { max-width: 80rem; }
    .p-3 { padding: 0.75rem; }
    .p-4 { padding: 1rem; }
    .p-5 { padding: 1.25rem; }
    .p-6 { padding: 1.5rem; }
    .p-8 { padding: 2rem; }
    .px-2\\.5 { padding-left: 0.625rem; padding-right: 0.625rem; }
    .px-3\\.5 { padding-left: 0.875rem; padding-right: 0.875rem; }
    .px-4 { padding-left: 1rem; padding-right: 1rem; }
    .py-1 { padding-top: 0.25rem; padding-bottom: 0.25rem; }
    .py-2 { padding-top: 0.5rem; padding-bottom: 0.5rem; }
    .py-2\\.5 { padding-top: 0.625rem; padding-bottom: 0.625rem; }
    .mb-1 { margin-bottom: 0.25rem; }
    .mb-2 { margin-bottom: 0.5rem; }
    .mb-3 { margin-bottom: 0.75rem; }
    .my-4 { margin-top: 1rem; margin-bottom: 1rem; }
    .space-y-3 > :not([hidden]) ~ :not([hidden]) { margin-top: 0.75rem; }
    .space-y-4 > :not([hidden]) ~ :not([hidden]) { margin-top: 1rem; }
    .space-y-6 > :not([hidden]) ~ :not([hidden]) { margin-top: 1.5rem; }
    .space-y-8 > :not([hidden]) ~ :not([hidden]) { margin-top: 2rem; }
    .flex { display: flex; }
    .flex-col { flex-direction: column; }
    .flex-wrap { flex-wrap: wrap; }
    .items-center { align-items: center; }
    .justify-center { justify-content: center; }
    .justify-between { justify-content: space-between; }
    .grid { display: grid; }
    .grid-cols-1 { grid-template-columns: repeat(1, minmax(0, 1fr)); }
    .gap-4 { gap: 1rem; }
    .gap-6 { gap: 1.5rem; }
    @media (min-width: 768px) {
      .md\\:grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .md\\:grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
      .md\\:grid-cols-4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }
      .md\\:p-8 { padding: 2rem; }
      .md\\:p-10 { padding: 2.5rem; }
      .md\\:p-12 { padding: 3rem; }
    }
    .rounded-lg { border-radius: 0.5rem; }
    .rounded-xl { border-radius: 0.75rem; }
    .rounded-2xl { border-radius: 1rem; }
    .rounded-3xl { border-radius: 1.5rem; }
    .rounded-full { border-radius: 9999px; }
    .shadow-sm { box-shadow: 0 1px 3px rgba(0,0,0,0.25); }
    .border { border: 1px solid rgba(255, 255, 255, 0.1); }
    .border-2 { border-width: 2px; border-style: solid; }
    .border-white\\/80 { border-color: rgba(255, 255, 255, 0.8); }
    html.light .border-white\\/80 { border-color: #18181b; }
    html.light .border { border: 1px solid #e2e8f0; }
    .bg-white { background-color: #18181b; }
    html.light .bg-white { background-color: #ffffff; }
    .dark\\:bg-zinc-900 { background-color: #18181b; }
    .dark\\:bg-zinc-800 { background-color: #27272a; }
    .dark\\:text-white { color: #ffffff; }
    .dark\\:text-zinc-100 { color: #f4f4f5; }
    .dark\\:border-zinc-800 { border-color: rgba(255, 255, 255, 0.1); }
    .dark\\:border-zinc-700 { border-color: rgba(255, 255, 255, 0.16); }
    .bg-indigo-600 { background-color: #4f46e5; color: #ffffff; }
    .bg-indigo-600:hover { background-color: #4338ca; }
    .bg-indigo-50 { background-color: rgba(79, 70, 229, 0.15); }
    .text-indigo-700 { color: #818cf8; }
    .border-indigo-200 { border-color: rgba(129, 140, 248, 0.3); }
    .font-extrabold { font-weight: 800; }
    .font-bold { font-weight: 700; }
    .font-semibold { font-weight: 600; }
    .font-medium { font-weight: 500; }
    .text-xs { font-size: 0.75rem; }
    .text-sm { font-size: 0.875rem; }
    .text-lg { font-size: 1.125rem; }
    .text-2xl { font-size: 1.5rem; }
    .text-3xl { font-size: 1.875rem; }
    .text-gray-900 { color: #f4f4f5; }
    html.light .text-gray-900 { color: #09090b; }
    .text-gray-800 { color: #e4e4e7; }
    html.light .text-gray-800 { color: #18181b; }
    .text-gray-600 { color: #a1a1aa; }
    html.light .text-gray-600 { color: #475569; }
    .text-gray-500 { color: #71717a; }
    .text-gray-400 { color: #a1a1aa; }
    input {
      font-family: inherit;
      border: 1px solid rgba(255, 255, 255, 0.14);
      background: #27272a;
      color: #f4f4f5;
    }
    html.light input {
      border: 1px solid #cbd5e1;
      background: #ffffff;
      color: #09090b;
    }
    button {
      font-family: inherit;
      cursor: pointer;
      border: none;
    }
    hr {
      border: none;
      border-top: 1px solid rgba(255, 255, 255, 0.8);
    }
    html.light hr {
      border-top: 1px solid #18181b;
    }
  `;

  const previewHtml = `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Wireframe Sandbox Preview</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>${previewEmbeddedCSS}</style>
</head>
<body class="min-h-screen bg-gray-50 dark:bg-zinc-950 p-6 md:p-12 flex flex-col items-center justify-center gap-6 font-sans antialiased text-gray-900 dark:text-zinc-100">
${rawHtmlChildren}
</body>
</html>`;

  return {
    jsx: jsxCode,
    html: htmlCode,
    previewHtml: previewHtml,
    componentName: 'GeneratedWireframe',
    elementCount: activeEls.length,
  };
}
