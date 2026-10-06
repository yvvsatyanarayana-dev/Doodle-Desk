// Export utilities — PNG via canvas and SVG vector
import { renderElement } from '../renderer/render.js';
import { getCommonBounds } from '../math/geometry.js';
import { serializeAsJSON, ELEMENT_TYPES } from '../elements.js';

const EXPORT_PADDING = 32;

// Export elements to a canvas element (for PNG / print)
export async function exportToCanvas(elements, appState = {}, files = {}, options = {}) {
  const {
    exportBackground = true,
    exportPadding = EXPORT_PADDING,
    viewBackgroundColor = '#ffffff',
    exportScale = 2,
  } = options;

  const active = elements.filter(el => !el.isDeleted);
  if (active.length === 0) return null;

  const bounds = getCommonBounds(active);
  if (!bounds) return null;

  const canvasW = Math.ceil((bounds.width + exportPadding * 2) * exportScale);
  const canvasH = Math.ceil((bounds.height + exportPadding * 2) * exportScale);

  const canvas = document.createElement('canvas');
  canvas.width = canvasW;
  canvas.height = canvasH;
  const ctx = canvas.getContext('2d');

  // Background
  if (exportBackground) {
    ctx.fillStyle = appState.viewBackgroundColor || viewBackgroundColor;
    ctx.fillRect(0, 0, canvasW, canvasH);
  }

  ctx.scale(exportScale, exportScale);
  ctx.translate(exportPadding - bounds.x, exportPadding - bounds.y);

  // Build image cache
  const imageCache = await buildImageCache(active, files);

  for (const el of active) {
    renderElement(ctx, el, imageCache);
  }

  return canvas;
}

// Export to PNG blob
export async function exportToBlob(elements, appState = {}, files = {}, options = {}) {
  const canvas = await exportToCanvas(elements, appState, files, options);
  if (!canvas) return null;
  return new Promise(resolve => canvas.toBlob(resolve, 'image/png', 1));
}

// Export to SVG string
export async function exportToSvg(elements, appState = {}, files = {}, options = {}) {
  const {
    exportBackground = true,
    viewBackgroundColor = '#ffffff',
    exportPadding = EXPORT_PADDING,
  } = options;

  const active = elements.filter(el => !el.isDeleted);
  const bounds = getCommonBounds(active) || { x: 0, y: 0, width: 800, height: 600 };

  const svgW = bounds.width + exportPadding * 2;
  const svgH = bounds.height + exportPadding * 2;
  const ox = exportPadding - bounds.x;
  const oy = exportPadding - bounds.y;

  const parts = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${svgW}" height="${svgH}" viewBox="0 0 ${svgW} ${svgH}">`,
  ];

  if (exportBackground) {
    parts.push(`<rect width="${svgW}" height="${svgH}" fill="${appState.viewBackgroundColor || viewBackgroundColor}"/>`);
  }

  parts.push(`<g transform="translate(${ox},${oy})">`);

  for (const el of active) {
    parts.push(elementToSvg(el, files));
  }

  parts.push('</g></svg>');
  return parts.join('\n');
}

function elementToSvg(el, files = {}) {
  const opacity = (el.opacity ?? 100) / 100;
  const stroke = el.strokeColor || '#1e1e1e';
  const fill = el.backgroundColor && el.backgroundColor !== 'transparent' ? el.backgroundColor : 'none';
  const sw = el.strokeWidth === 1 ? 1.5 : el.strokeWidth === 2 ? 2.5 : 4;
  const { x, y, width: w, height: h, angle = 0 } = el;
  const cx = x + w / 2, cy = y + h / 2;
  const transform = angle ? ` transform="rotate(${(angle * 180 / Math.PI).toFixed(2)} ${cx} ${cy})"` : '';
  const attrs = `stroke="${stroke}" fill="${fill}" stroke-width="${sw}" opacity="${opacity}"${transform}`;

  switch (el.type) {
    case ELEMENT_TYPES.RECTANGLE: {
      const edgeMode = Object.prototype.hasOwnProperty.call(el, 'roundness') ? el.roundness : 'round';
      const isSharp = edgeMode === 'sharp' || edgeMode === null || edgeMode === false || edgeMode === 0;
      const rxAttr = !isSharp ? ` rx="${Math.min(16, Math.min(Math.abs(w), Math.abs(h)) * 0.18)}"` : '';
      return `<rect x="${x}" y="${y}" width="${w}" height="${h}"${rxAttr} ${attrs}/>`;
    }

    case ELEMENT_TYPES.FRAME: {
      const edgeMode = Object.prototype.hasOwnProperty.call(el, 'roundness') ? el.roundness : 'round';
      const isSharp = edgeMode === 'sharp' || edgeMode === null || edgeMode === false || edgeMode === 0;
      const rxAttr = !isSharp ? ' rx="8"' : '';
      return `<rect x="${x}" y="${y}" width="${w}" height="${h}"${rxAttr} ${attrs}/>`;
    }

    case ELEMENT_TYPES.ELLIPSE:
      return `<ellipse cx="${cx}" cy="${cy}" rx="${w / 2}" ry="${h / 2}" ${attrs}/>`;

    case ELEMENT_TYPES.DIAMOND: {
      const edgeMode = Object.prototype.hasOwnProperty.call(el, 'roundness') ? el.roundness : 'round';
      const isSharp = edgeMode === 'sharp' || edgeMode === null || edgeMode === false || edgeMode === 0;
      if (isSharp) {
        const points = `${cx},${y} ${x + w},${cy} ${cx},${y + h} ${x},${cy}`;
        return `<polygon points="${points}" ${attrs}/>`;
      }
      const rw = Math.abs(w), rh = Math.abs(h);
      const halfW = rw / 2, halfH = rh / 2;
      const edgeLen = Math.hypot(halfW, halfH);
      const cr = Math.min(edgeLen * 0.28, Math.min(32, Math.max(10, edgeLen * 0.2)));
      const ux = edgeLen > 0 ? (halfW / edgeLen) * cr : 0;
      const uy = edgeLen > 0 ? (halfH / edgeLen) * cr : 0;
      const d = `M ${cx + ux} ${y + uy} L ${x + rw - ux} ${cy - uy} Q ${x + rw} ${cy} ${x + rw - ux} ${cy + uy} L ${cx + ux} ${y + rh - uy} Q ${cx} ${y + rh} ${cx - ux} ${y + rh - uy} L ${x + ux} ${cy + uy} Q ${x} ${cy} ${x + ux} ${cy - uy} L ${cx - ux} ${y + uy} Q ${cx} ${y} ${cx + ux} ${y + uy} Z`;
      return `<path d="${d}" ${attrs}/>`;
    }

    case ELEMENT_TYPES.ARROW:
    case ELEMENT_TYPES.LINE: {
      if (!el.points || el.points.length < 2) return '';
      const pts = el.points.map(([px, py]) => `${x + px},${y + py}`).join(' ');
      return `<polyline points="${pts}" ${attrs} fill="none"/>`;
    }

    case ELEMENT_TYPES.FREEDRAW: {
      if (!el.points || el.points.length < 2) return '';
      let d = `M ${x + el.points[0][0]} ${y + el.points[0][1]}`;
      for (let i = 1; i < el.points.length; i++) {
        d += ` L ${x + el.points[i][0]} ${y + el.points[i][1]}`;
      }
      return `<path d="${d}" ${attrs} fill="none"/>`;
    }

    case ELEMENT_TYPES.TEXT: {
      const { text = '', fontSize = 20, fontFamily } = el;
      const fontStack = fontFamily >= 5 ? 'cursive' : 'sans-serif';
      const lines = text.split('\n');
      const lineH = fontSize * 1.25;
      const textParts = lines.map((line, i) =>
        `<tspan x="${x}" dy="${i === 0 ? 0 : lineH}">${escapeXml(line)}</tspan>`
      ).join('');
      return `<text x="${x}" y="${y + fontSize}" font-size="${fontSize}" font-family="${fontStack}" fill="${stroke}" opacity="${opacity}"${transform}>${textParts}</text>`;
    }

    case ELEMENT_TYPES.IMAGE: {
      const cached = files[el.fileId || el.id];
      if (cached?.dataURL) {
        return `<image x="${x}" y="${y}" width="${w}" height="${h}" href="${cached.dataURL}"${transform}/>`;
      }
      return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#eee" stroke="#999" stroke-width="1"${transform}/>`;
    }

    default:
      return '';
  }
}

function escapeXml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function buildImageCache(elements, files = {}) {
  const cache = {};
  const imageEls = elements.filter(el => el.type === ELEMENT_TYPES.IMAGE);

  await Promise.all(imageEls.map(async el => {
    const fileId = el.fileId || el.id;
    const file = files[fileId];
    if (!file?.dataURL) return;

    await new Promise(resolve => {
      const img = new Image();
      img.onload = () => { cache[fileId] = img; resolve(); };
      img.onerror = resolve;
      img.src = file.dataURL;
    });
  }));

  return cache;
}

// Load scene from JSON string (Doodle format)
export function loadFromJSON(json) {
  try {
    const data = typeof json === 'string' ? JSON.parse(json) : json;
    return {
      elements: data.elements || [],
      appState: data.appState || {},
      files: data.files || {},
    };
  } catch {
    return null;
  }
}

// Load scene from a PNG blob (reads embedded scene data from PNG metadata)
export async function loadFromBlob(blob) {
  // Try to extract embedded JSON from PNG tEXt chunks
  if (blob.type === 'image/png') {
    try {
      const buffer = await blob.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      // Search for embedded scene data in the PNG binary
      const text = new TextDecoder('latin1').decode(bytes);
      const marker = text.indexOf('doodledesk') !== -1 ? text.indexOf('doodledesk') : text.indexOf('doodle');
      if (marker !== -1) {
        const jsonStart = text.lastIndexOf('{', marker);
        const jsonEnd = text.indexOf('\0', marker);
        if (jsonStart !== -1) {
          const jsonStr = text.substring(jsonStart, jsonEnd > 0 ? jsonEnd : text.length);
          try {
            const data = JSON.parse(jsonStr);
            if (data.elements) return data;
          } catch {}
        }
      }
    } catch {}
  }

  // Fallback: return empty scene
  return { elements: [], appState: {}, files: {} };
}
