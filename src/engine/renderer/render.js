// Canvas renderer — draws all element types to a 2D canvas context
import {
  sketchyLine, sketchyRect, sketchyRoundedRect, sketchyEllipse, sketchyDiamond,
  sketchyFill, solidFill, crossHatchFill
} from './sketchy.js';
import { STROKE_WIDTHS, ELEMENT_TYPES } from '../elements.js';
import { getArrowheadPoints, rotatePoint, getElementCenter, getBoundsFromPoints } from '../math/geometry.js';

// Font stack for each family
const FONT_STACKS = {
  5: '"Doodlefont", "Virgil", cursive',
  3: '"Virgil", cursive',
  2: '"Cascadia Code", "Fira Code", monospace',
  1: 'Helvetica, Arial, sans-serif',
  6: '"Nunito", sans-serif',
  7: '"Comic Shanns", cursive',
  8: '"Patrick Hand", cursive',
};

function getFontStack(fontFamily) {
  return FONT_STACKS[fontFamily] || FONT_STACKS[5];
}

function applyBaseStyle(ctx, el) {
  const strokeWidth = STROKE_WIDTHS[el.strokeWidth] ?? el.strokeWidth ?? 2;
  ctx.lineWidth = strokeWidth;
  ctx.strokeStyle = el.strokeColor || '#1e1e1e';
  ctx.globalAlpha = (el.opacity ?? 100) / 100;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (el.strokeStyle === 'dashed') {
    ctx.setLineDash([strokeWidth * 6, strokeWidth * 4]);
  } else if (el.strokeStyle === 'dotted') {
    ctx.setLineDash([strokeWidth * 1.5, strokeWidth * 3]);
  } else {
    ctx.setLineDash([]);
  }
}

function applyFill(ctx, el, polygon) {
  if (!el.backgroundColor || el.backgroundColor === 'transparent') return;
  ctx.fillStyle = el.backgroundColor;

  const fillStyle = el.fillStyle || 'hachure';
  if (fillStyle === 'solid') {
    solidFill(ctx, polygon);
  } else if (fillStyle === 'hachure') {
    ctx.save();
    ctx.strokeStyle = el.backgroundColor;
    ctx.lineWidth = Math.max(0.8, (STROKE_WIDTHS[el.strokeWidth] ?? 2) * 0.6);
    ctx.setLineDash([]);
    sketchyFill(ctx, polygon, el.seed || 0, el.roughness ?? 1);
    ctx.restore();
  } else if (fillStyle === 'cross-hatch') {
    ctx.save();
    ctx.strokeStyle = el.backgroundColor;
    ctx.lineWidth = Math.max(0.8, (STROKE_WIDTHS[el.strokeWidth] ?? 2) * 0.6);
    ctx.setLineDash([]);
    crossHatchFill(ctx, polygon, el.seed || 0);
    ctx.restore();
  }
}

// Draw a single element to the canvas context
export function renderElement(ctx, el, imageCache = {}) {
  if (el.isDeleted) return;
  if ((el.opacity ?? 100) === 0) return;

  ctx.save();

  // Apply rotation if needed
  if (el.angle && Math.abs(el.angle) > 0.0001) {
    const [cx, cy] = getElementCenter(el);
    ctx.translate(cx, cy);
    ctx.rotate(el.angle);
    ctx.translate(-cx, -cy);
  }

  applyBaseStyle(ctx, el);

  const { type, x, y, width: w, height: h, seed = 0, roughness = 1 } = el;

  switch (type) {
    case ELEMENT_TYPES.RECTANGLE: {
      const rx = w < 0 ? x + w : x;
      const ry = h < 0 ? y + h : y;
      const rw = Math.max(0.1, Math.abs(w));
      const rh = Math.max(0.1, Math.abs(h));
      const edgeMode = Object.prototype.hasOwnProperty.call(el, 'roundness') ? el.roundness : 'round';
      const isSharp = edgeMode === 'sharp' || edgeMode === null || edgeMode === false || edgeMode === 0;
      const roundRadius = isSharp
        ? 0
        : Math.min(rw / 2, rh / 2, typeof edgeMode === 'number' ? edgeMode : Math.min(32, Math.max(12, Math.min(rw, rh) * 0.18)));

      const poly = [[rx, ry], [rx + rw, ry], [rx + rw, ry + rh], [rx, ry + rh]];

      // If rounded, clip background fill so hachure/solid never bleeds outside round corners
      if (roundRadius > 0 && el.backgroundColor && el.backgroundColor !== 'transparent') {
        ctx.save();
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(rx, ry, rw, rh, roundRadius);
        } else {
          ctx.moveTo(rx + roundRadius, ry);
          ctx.lineTo(rx + rw - roundRadius, ry);
          ctx.quadraticCurveTo(rx + rw, ry, rx + rw, ry + roundRadius);
          ctx.lineTo(rx + rw, ry + rh - roundRadius);
          ctx.quadraticCurveTo(rx + rw, ry + rh, rx + rw - roundRadius, ry + rh);
          ctx.lineTo(rx + roundRadius, ry + rh);
          ctx.quadraticCurveTo(rx, ry + rh, rx, ry + rh - roundRadius);
          ctx.lineTo(rx, ry + roundRadius);
          ctx.quadraticCurveTo(rx, ry, rx + roundRadius, ry);
          ctx.closePath();
        }
        ctx.clip();
        applyFill(ctx, el, poly);
        ctx.restore();
      } else {
        applyFill(ctx, el, poly);
      }
      if (roughness > 0 && roundRadius > 0) {
        sketchyRoundedRect(ctx, rx, ry, rw, rh, roundRadius, seed, roughness);
      } else if (roughness > 0) {
        sketchyRect(ctx, rx, ry, rw, rh, seed, roughness);
      } else {
        ctx.beginPath();
        if (roundRadius > 0) {
          ctx.moveTo(rx + roundRadius, ry);
          ctx.lineTo(rx + rw - roundRadius, ry);
          ctx.quadraticCurveTo(rx + rw, ry, rx + rw, ry + roundRadius);
          ctx.lineTo(rx + rw, ry + rh - roundRadius);
          ctx.quadraticCurveTo(rx + rw, ry + rh, rx + rw - roundRadius, ry + rh);
          ctx.lineTo(rx + roundRadius, ry + rh);
          ctx.quadraticCurveTo(rx, ry + rh, rx, ry + rh - roundRadius);
          ctx.lineTo(rx, ry + roundRadius);
          ctx.quadraticCurveTo(rx, ry, rx + roundRadius, ry);
          ctx.closePath();
        } else {
          ctx.rect(rx, ry, rw, rh);
        }
        ctx.stroke();
      }
      break;
    }

    case ELEMENT_TYPES.ELLIPSE: {
      const rw = Math.max(0.1, Math.abs(w));
      const rh = Math.max(0.1, Math.abs(h));
      const rx = rw / 2;
      const ry = rh / 2;
      const cx = (w < 0 ? x + w : x) + rx;
      const cy = (h < 0 ? y + h : y) + ry;
      const steps = Math.max(32, Math.ceil(Math.PI * (rx + ry) / 6));
      const poly = Array.from({ length: steps }, (_, i) => {
        const t = (i / steps) * Math.PI * 2;
        return [cx + rx * Math.cos(t), cy + ry * Math.sin(t)];
      });
      applyFill(ctx, el, poly);
      sketchyEllipse(ctx, cx, cy, rx, ry, seed, roughness);
      break;
    }

    case ELEMENT_TYPES.DIAMOND: {
      const rw = Math.max(0.1, Math.abs(w));
      const rh = Math.max(0.1, Math.abs(h));
      const dx = w < 0 ? x + w : x;
      const dy = h < 0 ? y + h : y;
      const cx2 = dx + rw / 2;
      const cy2 = dy + rh / 2;

      const edgeMode = el.roundness;
      const isSharp = !edgeMode || edgeMode === 'sharp' || edgeMode === false || edgeMode === 0;

      const halfW = rw / 2;
      const halfH = rh / 2;
      const edgeLen = Math.hypot(halfW, halfH);
      const cr = isSharp ? 0 : Math.min(edgeLen * 0.28, Math.min(32, Math.max(10, edgeLen * 0.2)));
      const ux = edgeLen > 0 ? (halfW / edgeLen) * cr : 0;
      const uy = edgeLen > 0 ? (halfH / edgeLen) * cr : 0;

      const T_in = [cx2 - ux, dy + uy];
      const T_out = [cx2 + ux, dy + uy];
      const R_in = [dx + rw - ux, cy2 - uy];
      const R_out = [dx + rw - ux, cy2 + uy];
      const B_in = [cx2 + ux, dy + rh - uy];
      const B_out = [cx2 - ux, dy + rh - uy];
      const L_in = [dx + ux, cy2 + uy];
      const L_out = [dx + ux, cy2 - uy];

      const poly2 = !isSharp && cr > 0
        ? [T_out, R_in, R_out, B_in, B_out, L_in, L_out, T_in]
        : [[cx2, dy], [dx + rw, cy2], [cx2, dy + rh], [dx, cy2]];

      if (!isSharp && cr > 0 && el.backgroundColor && el.backgroundColor !== 'transparent') {
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(T_out[0], T_out[1]);
        ctx.lineTo(R_in[0], R_in[1]);
        ctx.quadraticCurveTo(dx + rw, cy2, R_out[0], R_out[1]);
        ctx.lineTo(B_in[0], B_in[1]);
        ctx.quadraticCurveTo(cx2, dy + rh, B_out[0], B_out[1]);
        ctx.lineTo(L_in[0], L_in[1]);
        ctx.quadraticCurveTo(dx, cy2, L_out[0], L_out[1]);
        ctx.lineTo(T_in[0], T_in[1]);
        ctx.quadraticCurveTo(cx2, dy, T_out[0], T_out[1]);
        ctx.closePath();
        ctx.clip();
        applyFill(ctx, el, poly2);
        ctx.restore();
      } else {
        applyFill(ctx, el, poly2);
      }

      if (roughness === 0) {
        ctx.beginPath();
        if (!isSharp && cr > 0) {
          ctx.moveTo(T_out[0], T_out[1]);
          ctx.lineTo(R_in[0], R_in[1]);
          ctx.quadraticCurveTo(dx + rw, cy2, R_out[0], R_out[1]);
          ctx.lineTo(B_in[0], B_in[1]);
          ctx.quadraticCurveTo(cx2, dy + rh, B_out[0], B_out[1]);
          ctx.lineTo(L_in[0], L_in[1]);
          ctx.quadraticCurveTo(dx, cy2, L_out[0], L_out[1]);
          ctx.lineTo(T_in[0], T_in[1]);
          ctx.quadraticCurveTo(cx2, dy, T_out[0], T_out[1]);
          ctx.closePath();
        } else {
          ctx.moveTo(cx2, dy);
          ctx.lineTo(dx + rw, cy2);
          ctx.lineTo(cx2, dy + rh);
          ctx.lineTo(dx, cy2);
          ctx.closePath();
        }
        ctx.stroke();
      } else {
        sketchyDiamond(ctx, dx, dy, rw, rh, seed, roughness, !isSharp && cr > 0);
      }
      break;
    }

    case ELEMENT_TYPES.ARROW:
    case ELEMENT_TYPES.LINE: {
      if (!el.points || el.points.length < 2) break;
      const pts = el.points;
      const edgeMode = el.roundness;
      const isSharp = !edgeMode || edgeMode === 'sharp' || edgeMode === false || edgeMode === 0;

      if (!isSharp && pts.length >= 3) {
        ctx.beginPath();
        ctx.moveTo(x + pts[0][0], y + pts[0][1]);
        for (let i = 1; i < pts.length - 1; i++) {
          const xc = (x + pts[i][0] + x + pts[i + 1][0]) / 2;
          const yc = (y + pts[i][1] + y + pts[i + 1][1]) / 2;
          ctx.quadraticCurveTo(x + pts[i][0], y + pts[i][1], xc, yc);
        }
        ctx.lineTo(x + pts[pts.length - 1][0], y + pts[pts.length - 1][1]);
        ctx.stroke();
      } else {
        // Draw line segments
        for (let i = 0; i < pts.length - 1; i++) {
          const ax = x + pts[i][0], ay = y + pts[i][1];
          const bx = x + pts[i + 1][0], by = y + pts[i + 1][1];
          sketchyLine(ctx, ax, ay, bx, by, seed + i * 7, roughness);
        }
      }

      // Draw arrowhead if arrow type
      if (type === ELEMENT_TYPES.ARROW) {
        const last = pts[pts.length - 1];
        const prev = pts[pts.length - 2];
        const tip = [x + last[0], y + last[1]];
        const before = [x + prev[0], y + prev[1]];
        const arrowSize = Math.max(10, (STROKE_WIDTHS[el.strokeWidth] ?? 2) * 5);

        const headPts = getArrowheadPoints(before[0], before[1], tip[0], tip[1], arrowSize);
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(headPts[1][0], headPts[1][1]);
        ctx.lineTo(headPts[0][0], headPts[0][1]);
        ctx.lineTo(headPts[2][0], headPts[2][1]);
        ctx.fillStyle = el.strokeColor || '#1e1e1e';
        ctx.fill();
        ctx.stroke();

        // Start arrowhead if bidirectional
        if (el.startArrowhead === 'arrow') {
          const first = pts[0];
          const second = pts[1];
          const tipS = [x + first[0], y + first[1]];
          const beforeS = [x + second[0], y + second[1]];
          const headS = getArrowheadPoints(beforeS[0], beforeS[1], tipS[0], tipS[1], arrowSize);
          ctx.beginPath();
          ctx.moveTo(headS[1][0], headS[1][1]);
          ctx.lineTo(headS[0][0], headS[0][1]);
          ctx.lineTo(headS[2][0], headS[2][1]);
          ctx.fill();
          ctx.stroke();
        }
      }
      break;
    }

    case ELEMENT_TYPES.FREEDRAW: {
      if (!el.points || el.points.length < 2) break;
      const pts = el.points;
      const pressures = el.pressures || [];
      const baseWidth = STROKE_WIDTHS[el.strokeWidth] ?? 2;

      // Build smooth polyline using midpoints
      const smoothPts = [];
      for (let i = 0; i < pts.length - 1; i++) {
        const ax = x + pts[i][0], ay = y + pts[i][1];
        const bx = x + pts[i + 1][0], by = y + pts[i + 1][1];
        smoothPts.push([ax, ay, (ax + bx) / 2, (ay + by) / 2]);
      }
      const lastPt = pts[pts.length - 1];
      smoothPts.push([x + lastPt[0], y + lastPt[1], x + lastPt[0], y + lastPt[1]]);

      if (el.simulatePressure !== false && pressures.length >= 2) {
        // Variable-width stroke using pressure data
        ctx.save();
        ctx.fillStyle = el.strokeColor || '#1e1e1e';
        ctx.globalAlpha = (el.opacity ?? 100) / 100;

        for (let i = 0; i < smoothPts.length - 1; i++) {
          const [ax, ay, mx, my] = smoothPts[i];
          const [bx, by] = smoothPts[i + 1];

          // Simulate tapering: pressure peaks at 30% and tapers at ends
          const t = i / Math.max(1, smoothPts.length - 1);
          const taper = Math.sin(Math.PI * Math.min(t * 3, 1)) * 0.5 + 0.5;
          const p = pressures[i] ?? 0.5;
          const w = Math.max(0.5, baseWidth * (p * 0.8 + 0.2) * taper);

          // Direction vector for perpendicular offsets
          const dx = bx - ax, dy = by - ay;
          const len = Math.sqrt(dx * dx + dy * dy) || 1;
          const nx = (-dy / len) * w, ny = (dx / len) * w;

          ctx.beginPath();
          ctx.moveTo(ax + nx, ay + ny);
          ctx.quadraticCurveTo(mx + nx, my + ny, bx + nx, by + ny);
          ctx.quadraticCurveTo(mx - nx, my - ny, ax - nx, ay - ny);
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();
      } else {
        // Simple smooth stroke without pressure variation
        ctx.beginPath();
        ctx.moveTo(x + pts[0][0], y + pts[0][1]);
        for (let i = 1; i < pts.length; i++) {
          const prevX = x + pts[i - 1][0];
          const prevY = y + pts[i - 1][1];
          const currX = x + pts[i][0];
          const currY = y + pts[i][1];
          const mx = (prevX + currX) / 2;
          const my = (prevY + currY) / 2;
          ctx.quadraticCurveTo(prevX, prevY, mx, my);
        }
        ctx.lineTo(x + lastPt[0], y + lastPt[1]);
        ctx.stroke();
      }
      break;
    }


    case ELEMENT_TYPES.TEXT: {
      const { text, fontSize = 20, fontFamily = 5, textAlign = 'left', lineHeight = 1.25, strokeColor = '#1e1e1e', width: w } = el;
      if (!text) break;

      ctx.font = `${fontSize}px ${getFontStack(fontFamily)}`;
      ctx.fillStyle = strokeColor;
      ctx.textBaseline = 'top';
      ctx.textAlign = textAlign;

      // Automatically wrap text to container/element width if defined and positive
      const maxW = w && w > 0 ? w : 0;
      const lines = maxW > 0 ? wrapText(ctx, text, maxW) : text.split('\n');
      const lineH = fontSize * lineHeight;
      let baseX = x;
      if (textAlign === 'center') baseX = x + (w || 0) / 2;
      else if (textAlign === 'right') baseX = x + (w || 0);

      ctx.setLineDash([]);
      for (let i = 0; i < lines.length; i++) {
        ctx.fillText(lines[i], baseX, y + i * lineH);
      }
      break;
    }

    case ELEMENT_TYPES.IMAGE: {
      const cached = imageCache[el.fileId || el.id];
      if (cached && cached.complete) {
        ctx.drawImage(cached, x, y, w, h);
      } else {
        // Draw placeholder
        ctx.strokeStyle = '#aaa';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, w, h);
        ctx.fillStyle = '#f0f0f0';
        ctx.fillRect(x, y, w, h);
        ctx.fillStyle = '#999';
        ctx.font = '14px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Image', x + w / 2, y + h / 2);
      }
      break;
    }

    case ELEMENT_TYPES.IFRAME: {
      // Draw placeholder for iframes/embeds
      ctx.fillStyle = '#111113';
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = el.strokeColor || '#d4d4d8';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([]);
      ctx.strokeRect(x, y, w, h);
      ctx.fillStyle = '#a1a1aa';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(el.link || 'Web Frame', x + w / 2, y + h / 2);
      break;
    }

    case ELEMENT_TYPES.FRAME: {
      const rx = w < 0 ? x + w : x;
      const ry = h < 0 ? y + h : y;
      const rw = Math.max(1, Math.abs(w));
      const rh = Math.max(1, Math.abs(h));

      ctx.save();
      const strokeW = STROKE_WIDTHS[el.strokeWidth] ?? el.strokeWidth ?? 1.5;
      ctx.strokeStyle = el.strokeColor || '#71717a';
      ctx.lineWidth = strokeW;

      // Respect user's selected strokeStyle: solid, dashed, or dotted
      if (el.strokeStyle === 'dotted') {
        ctx.setLineDash([strokeW * 1.5, strokeW * 3]);
      } else if (el.strokeStyle === 'dashed') {
        ctx.setLineDash([strokeW * 4 + 4, strokeW * 3 + 3]);
      } else {
        ctx.setLineDash([]); // Straight solid line!
      }

      const edgeMode = Object.prototype.hasOwnProperty.call(el, 'roundness') ? el.roundness : 'round';
      const isSharp = edgeMode === 'sharp' || edgeMode === null || edgeMode === false || edgeMode === 0;
      const frameRadius = isSharp ? 0 : Math.min(rw / 2, rh / 2, typeof edgeMode === 'number' ? edgeMode : 8);

      ctx.beginPath();
      if (frameRadius > 0 && typeof ctx.roundRect === 'function') {
        ctx.roundRect(rx, ry, rw, rh, frameRadius);
      } else if (frameRadius > 0) {
        ctx.moveTo(rx + frameRadius, ry);
        ctx.lineTo(rx + rw - frameRadius, ry);
        ctx.quadraticCurveTo(rx + rw, ry, rx + rw, ry + frameRadius);
        ctx.lineTo(rx + rw, ry + rh - frameRadius);
        ctx.quadraticCurveTo(rx + rw, ry + rh, rx + rw - frameRadius, ry + rh);
        ctx.lineTo(rx + frameRadius, ry + rh);
        ctx.quadraticCurveTo(rx, ry + rh, rx, ry + rh - frameRadius);
        ctx.lineTo(rx, ry + frameRadius);
        ctx.quadraticCurveTo(rx, ry, rx + frameRadius, ry);
        ctx.closePath();
      } else {
        ctx.rect(rx, ry, rw, rh);
      }

      if (el.backgroundColor && el.backgroundColor !== 'transparent') {
        ctx.fillStyle = el.backgroundColor;
        ctx.fill();
      }

      ctx.stroke();
      ctx.setLineDash([]);

      // Frame Name Pill / Header tag
      const name = el.name || 'Frame';
      ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      const textMetrics = ctx.measureText(name);
      const pillWidth = Math.max(54, textMetrics.width + 16);
      const pillHeight = 22;
      const pillX = rx;
      const pillY = ry - pillHeight - 4;

      const isLight = typeof document !== 'undefined' && document.documentElement.getAttribute('data-theme') === 'light';
      const radius = 5;
      ctx.fillStyle = isLight ? '#f4f4f5' : '#1e1e24';
      ctx.strokeStyle = el.strokeColor || (isLight ? '#d4d4d8' : '#3f3f46');
      ctx.lineWidth = 1;
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(pillX, pillY, pillWidth, pillHeight, radius);
      } else {
        ctx.rect(pillX, pillY, pillWidth, pillHeight);
      }
      ctx.fill();
      ctx.stroke();

      // Draw tag text
      ctx.fillStyle = isLight ? '#18181b' : '#e4e4e7';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(name, pillX + 8, pillY + pillHeight / 2);
      ctx.restore();
      break;
    }

    default:
      break;
  }

  ctx.restore();
}

// Wrap text cleanly to fit within maxWidth
export function wrapText(ctx, text, maxWidth) {
  if (!text) return [];
  if (!maxWidth || maxWidth <= 0) return text.split('\n');

  const paragraphs = text.split('\n');
  const resultLines = [];

  for (const para of paragraphs) {
    if (!para.trim()) {
      resultLines.push('');
      continue;
    }
    const words = para.split(/\s+/);
    let currentLine = '';

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const metrics = ctx.measureText(testLine);

      if (metrics.width <= maxWidth) {
        currentLine = testLine;
      } else {
        if (currentLine) {
          resultLines.push(currentLine);
          currentLine = word;
        } else {
          // Word itself exceeds maxWidth: character-level wrap
          let subWord = '';
          for (const char of word) {
            const testChar = subWord + char;
            if (ctx.measureText(testChar).width <= maxWidth) {
              subWord = testChar;
            } else {
              if (subWord) resultLines.push(subWord);
              subWord = char;
            }
          }
          currentLine = subWord;
        }
      }
    }
    if (currentLine) {
      resultLines.push(currentLine);
    }
  }

  return resultLines;
}

// Measure text element dimensions
export function measureText(text, fontSize, fontFamily = 5, maxWidth = null) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  ctx.font = `${fontSize}px ${getFontStack(fontFamily)}`;
  const lines = maxWidth && maxWidth > 0 ? wrapText(ctx, text, maxWidth) : text.split('\n');
  let maxW = 0;
  for (const line of lines) {
    const m = ctx.measureText(line || ' ');
    if (m.width > maxW) maxW = m.width;
  }
  return {
    width: Math.ceil(maxWidth && maxWidth > 0 ? Math.min(maxWidth, maxW) : maxW) + 2,
    height: Math.ceil(lines.length * fontSize * 1.25) + 2,
    lines,
  };
}

// Render hit-test overlay (selection box + handles)
export function renderSelectionOverlay(ctx, elements, zoom = 1) {
  for (const el of elements) {
    if (el.isDeleted) continue;
    ctx.save();

    const pointBounds = el.type === ELEMENT_TYPES.FREEDRAW && el.points?.length
      ? getBoundsFromPoints(el.points)
      : null;
    const localBounds = pointBounds
      ? { x: el.x + pointBounds.x, y: el.y + pointBounds.y, width: pointBounds.width, height: pointBounds.height }
      : { x: el.x, y: el.y, width: el.width, height: el.height };

    if (el.angle && Math.abs(el.angle) > 0.0001) {
      const [cx, cy] = [localBounds.x + localBounds.width / 2, localBounds.y + localBounds.height / 2];
      ctx.translate(cx, cy);
      ctx.rotate(el.angle);
      ctx.translate(-cx, -cy);
    }

    const padding = 4 / zoom;
    const rx = localBounds.x - padding;
    const ry = localBounds.y - padding;
    const rw = localBounds.width + padding * 2;
    const rh = localBounds.height + padding * 2;

    // Dedicated linear selection handles for Arrow & Line (Doodle style: Start circle, Midpoint filled purple circle, End circle - NO bounding box or corner squares!)
    if (el.type === ELEMENT_TYPES.ARROW || el.type === ELEMENT_TYPES.LINE) {
      if (el.points?.length >= 2) {
        const isLight = typeof document !== 'undefined' && document.documentElement.getAttribute('data-theme') === 'light';
        const handleBg = isLight ? '#ffffff' : '#232329';
        const primaryColor = '#6965db';
        const strokeW = 1.8 / zoom;
        const pts = el.points;
        const startX = el.x + pts[0][0];
        const startY = el.y + pts[0][1];
        const endX = el.x + pts[pts.length - 1][0];
        const endY = el.y + pts[pts.length - 1][1];

        // 1. Start handle: hollow circular handle with theme bg
        ctx.fillStyle = handleBg;
        ctx.strokeStyle = primaryColor;
        ctx.lineWidth = strokeW;
        ctx.beginPath();
        ctx.arc(startX, startY, 5.5 / zoom, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // 2. Midpoint handle(s): solid filled purple circle ● as shown in screenshot
        for (let i = 0; i < pts.length - 1; i++) {
          const p1x = el.x + pts[i][0];
          const p1y = el.y + pts[i][1];
          const p2x = el.x + pts[i + 1][0];
          const p2y = el.y + pts[i + 1][1];
          const mx = (p1x + p2x) / 2;
          const my = (p1y + p2y) / 2;

          ctx.fillStyle = primaryColor;
          ctx.beginPath();
          ctx.arc(mx, my, 4.5 / zoom, 0, Math.PI * 2);
          ctx.fill();
        }

        // Intermediate vertex handles if multi-point arrow/line
        for (let i = 1; i < pts.length - 1; i++) {
          const vx = el.x + pts[i][0];
          const vy = el.y + pts[i][1];
          ctx.fillStyle = handleBg;
          ctx.strokeStyle = primaryColor;
          ctx.lineWidth = strokeW;
          ctx.beginPath();
          ctx.arc(vx, vy, 5.5 / zoom, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }

        // 3. End handle: hollow circular handle with theme bg
        ctx.fillStyle = handleBg;
        ctx.strokeStyle = primaryColor;
        ctx.lineWidth = strokeW;
        ctx.beginPath();
        ctx.arc(endX, endY, 5.5 / zoom, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      ctx.restore();
      continue;
    }

    // Selection box for shapes, text, frames, freedraw
    ctx.strokeStyle = '#6965db';
    ctx.lineWidth = 1.5 / zoom;
    ctx.setLineDash([]);
    ctx.strokeRect(rx, ry, rw, rh);

    // Corner handles
    const handleSize = 8 / zoom;
    const corners = [[rx, ry], [rx + rw, ry], [rx, ry + rh], [rx + rw, ry + rh]];

    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#6965db';
    ctx.lineWidth = 1.5 / zoom;
    for (const [hx, hy] of corners) {
      ctx.fillRect(hx - handleSize / 2, hy - handleSize / 2, handleSize, handleSize);
      ctx.strokeRect(hx - handleSize / 2, hy - handleSize / 2, handleSize, handleSize);
    }

    // Rotation handle (frames cannot be rotated)
    if (el.type !== ELEMENT_TYPES.FRAME) {
      const rotHandleX = rx + rw / 2;
      const rotHandleY = ry - 20 / zoom;
      ctx.strokeStyle = '#6965db';
      ctx.lineWidth = 1 / zoom;
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(rx + rw / 2, ry);
      ctx.lineTo(rotHandleX, rotHandleY);
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#6965db';
      ctx.beginPath();
      ctx.arc(rotHandleX, rotHandleY, 5 / zoom, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    // For selected frames, highlight the tag pill with purple selection outline
    if (el.type === ELEMENT_TYPES.FRAME) {
      const name = el.name || 'Frame';
      ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      const textMetrics = ctx.measureText(name);
      const pillWidth = Math.max(54, textMetrics.width + 16);
      const pillHeight = 22;
      const pillX = localBounds.x;
      const pillY = localBounds.y - pillHeight - 4;
      ctx.strokeStyle = '#6965db';
      ctx.lineWidth = 1.5 / zoom;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(pillX, pillY, pillWidth, pillHeight, 5);
      else ctx.rect(pillX, pillY, pillWidth, pillHeight);
      ctx.stroke();
    }

    ctx.restore();
  }
}
