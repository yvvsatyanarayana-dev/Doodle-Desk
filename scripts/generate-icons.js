const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const buildDir = path.join(__dirname, '..', 'build');
const publicDir = path.join(__dirname, '..', 'public');

if (!fs.existsSync(buildDir)) fs.mkdirSync(buildDir, { recursive: true });
if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });

// Read source icon from public/icon.png
const srcPath = path.join(publicDir, 'icon.png');
if (!fs.existsSync(srcPath)) {
  console.error('Source icon not found at', srcPath);
  process.exit(1);
}

const rawPng = PNG.sync.read(fs.readFileSync(srcPath));
const { width: origW, height: origH } = rawPng;

// 1. Remove outer white background using boundary flood fill
const visited = new Uint8Array(origW * origH);
const queue = [];

for (let x = 0; x < origW; x++) {
  queue.push(x);
  queue.push((origH - 1) * origW + x);
  visited[x] = 1;
  visited[(origH - 1) * origW + x] = 1;
}
for (let y = 0; y < origH; y++) {
  queue.push(y * origW);
  queue.push(y * origW + (origW - 1));
  visited[y * origW] = 1;
  visited[y * origW + (origW - 1)] = 1;
}

while (queue.length > 0) {
  const curr = queue.pop();
  const x = curr % origW;
  const y = Math.floor(curr / origW);
  const idx = curr * 4;

  const r = rawPng.data[idx];
  const g = rawPng.data[idx + 1];
  const b = rawPng.data[idx + 2];

  // If pixel is outer white background
  if (r > 150 && g > 150 && b > 150) {
    const neighbors = [
      x > 0 ? curr - 1 : -1,
      x < origW - 1 ? curr + 1 : -1,
      y > 0 ? curr - origW : -1,
      y < origH - 1 ? curr + origW : -1,
    ];
    for (const n of neighbors) {
      if (n >= 0 && !visited[n]) {
        visited[n] = 1;
        const nIdx = n * 4;
        if (rawPng.data[nIdx] > 140 && rawPng.data[nIdx + 1] > 140 && rawPng.data[nIdx + 2] > 140) {
          queue.push(n);
        }
      }
    }
  }
}

// Convert visited outer white to transparent with defringed anti-aliasing
for (let y = 0; y < origH; y++) {
  for (let x = 0; x < origW; x++) {
    const pos = y * origW + x;
    const idx = pos * 4;
    if (visited[pos]) {
      const r = rawPng.data[idx];
      if (r > 240) {
        rawPng.data[idx] = 0;
        rawPng.data[idx + 1] = 0;
        rawPng.data[idx + 2] = 0;
        rawPng.data[idx + 3] = 0;
      } else {
        // Anti-aliasing at the curved black boundary
        const alpha = Math.max(0, Math.min(255, 255 - r));
        rawPng.data[idx] = 0;
        rawPng.data[idx + 1] = 0;
        rawPng.data[idx + 2] = 0;
        rawPng.data[idx + 3] = alpha;
      }
    }
  }
}

// 2. Find bounding box of the non-transparent round black icon
let minX = origW, maxX = 0, minY = origH, maxY = 0;
for (let y = 0; y < origH; y++) {
  for (let x = 0; x < origW; x++) {
    const idx = (y * origW + x) * 4;
    if (rawPng.data[idx + 3] > 10) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
}

const bboxW = maxX - minX + 1;
const bboxH = maxY - minY + 1;
console.log('Detected icon content bbox:', { minX, maxX, minY, maxY, bboxW, bboxH });

// 3. Create master 1024x1024 canvas with standard ~48px padding (90.6% icon width for ideal desktop & taskbar framing)
const masterSize = 1024;
const targetPadding = 48;
const targetIconSize = masterSize - targetPadding * 2; // 928px
const scale = targetIconSize / Math.max(bboxW, bboxH);

const masterPng = new PNG({ width: masterSize, height: masterSize });
// Fill with transparent
masterPng.data.fill(0);

const offsetX = Math.round((masterSize - bboxW * scale) / 2);
const offsetY = Math.round((masterSize - bboxH * scale) / 2);

// Bilinear sampling to place cropped icon into masterPng
for (let my = 0; my < masterSize; my++) {
  for (let mx = 0; mx < masterSize; mx++) {
    const srcX = minX + (mx - offsetX) / scale;
    const srcY = minY + (my - offsetY) / scale;

    if (srcX >= 0 && srcX < origW - 1 && srcY >= 0 && srcY < origH - 1) {
      const x0 = Math.floor(srcX);
      const x1 = x0 + 1;
      const y0 = Math.floor(srcY);
      const y1 = y0 + 1;

      const wx = srcX - x0;
      const wy = srcY - y0;

      const idx00 = (y0 * origW + x0) * 4;
      const idx10 = (y0 * origW + x1) * 4;
      const idx01 = (y1 * origW + x0) * 4;
      const idx11 = (y1 * origW + x1) * 4;

      const midx = (my * masterSize + mx) * 4;
      for (let c = 0; c < 4; c++) {
        const top = rawPng.data[idx00 + c] * (1 - wx) + rawPng.data[idx10 + c] * wx;
        const bot = rawPng.data[idx01 + c] * (1 - wx) + rawPng.data[idx11 + c] * wx;
        masterPng.data[midx + c] = Math.round(top * (1 - wy) + bot * wy);
      }
    }
  }
}

// 4. High-quality box-filtering / area-averaging resize function for icons
function resizeIcon(targetSize) {
  if (targetSize === masterSize) {
    return PNG.sync.write(masterPng);
  }

  const out = new PNG({ width: targetSize, height: targetSize });
  const ratio = masterSize / targetSize;

  for (let ty = 0; ty < targetSize; ty++) {
    for (let tx = 0; tx < targetSize; tx++) {
      const startX = Math.floor(tx * ratio);
      const endX = Math.min(masterSize, Math.ceil((tx + 1) * ratio));
      const startY = Math.floor(ty * ratio);
      const endY = Math.min(masterSize, Math.ceil((ty + 1) * ratio));

      let totalA = 0;
      let totalR = 0;
      let totalG = 0;
      let totalB = 0;
      let pixelCount = 0;

      for (let sy = startY; sy < endY; sy++) {
        for (let sx = startX; sx < endX; sx++) {
          const idx = (sy * masterSize + sx) * 4;
          const a = masterPng.data[idx + 3] / 255;
          totalR += masterPng.data[idx] * a;
          totalG += masterPng.data[idx + 1] * a;
          totalB += masterPng.data[idx + 2] * a;
          totalA += masterPng.data[idx + 3];
          pixelCount++;
        }
      }

      const outIdx = (ty * targetSize + tx) * 4;
      if (pixelCount > 0 && totalA > 0) {
        const avgA = totalA / pixelCount;
        const normA = avgA / 255;
        out.data[outIdx] = Math.round(totalR / pixelCount / (normA || 1));
        out.data[outIdx + 1] = Math.round(totalG / pixelCount / (normA || 1));
        out.data[outIdx + 2] = Math.round(totalB / pixelCount / (normA || 1));
        out.data[outIdx + 3] = Math.round(avgA);
      } else {
        out.data[outIdx] = 0;
        out.data[outIdx + 1] = 0;
        out.data[outIdx + 2] = 0;
        out.data[outIdx + 3] = 0;
      }
    }
  }

  return PNG.sync.write(out);
}

// 5. Windows ICO creator (Vista+ PNG frames inside standard ICO container)
function createIco(sizes) {
  const images = sizes.map(s => ({ size: s, buffer: resizeIcon(s) }));
  const count = images.length;
  const headerSize = 6 + count * 16;
  let currentOffset = headerSize;

  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // 1 = ICO
  header.writeUInt16LE(count, 4); // count

  const directoryEntries = [];
  for (const img of images) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(img.size >= 256 ? 0 : img.size, 0); // width (0 = 256)
    entry.writeUInt8(img.size >= 256 ? 0 : img.size, 1); // height
    entry.writeUInt8(0, 2); // palette colors
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // color planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(img.buffer.length, 8); // size in bytes
    entry.writeUInt32LE(currentOffset, 12); // offset
    directoryEntries.push(entry);
    currentOffset += img.buffer.length;
  }

  return Buffer.concat([header, ...directoryEntries, ...images.map(img => img.buffer)]);
}

// 6. Generate all files
console.log('Generating multi-resolution icon assets...');
const icon1024 = resizeIcon(1024);
const icon512 = resizeIcon(512);
const icon256 = resizeIcon(256);
const icon128 = resizeIcon(128);
const icon64 = resizeIcon(64);
const icon48 = resizeIcon(48);
const icon32 = resizeIcon(32);
const icon16 = resizeIcon(16);

// Write essential app icons to build directory
fs.writeFileSync(path.join(buildDir, 'icon.png'), icon512);

// Windows ICO file (for desktop shortcut, titlebar, and taskbar)
const icoBuffer = createIco([16, 32, 48, 64, 128, 256]);
fs.writeFileSync(path.join(buildDir, 'icon.ico'), icoBuffer);
fs.writeFileSync(path.join(buildDir, 'icon.icns'), icon512);

// Write to public directory
fs.writeFileSync(path.join(publicDir, 'icon.png'), icon1024);
fs.writeFileSync(path.join(publicDir, 'favicon.ico'), icoBuffer);
fs.writeFileSync(path.join(publicDir, 'logo.png'), icon512);
fs.writeFileSync(path.join(publicDir, 'logo-transparent.png'), icon512);

console.log('Successfully generated all desktop & taskbar icons with white background removed!');
