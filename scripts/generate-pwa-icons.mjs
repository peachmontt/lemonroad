#!/usr/bin/env node
/**
 * Generates all required PWA icon PNG/ICO files from the SVG sources.
 * Run: node scripts/generate-pwa-icons.mjs
 *
 * Dependencies: sharp (devDependency)
 */

import sharp from 'sharp';
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const publicDir = resolve(root, 'public');

const mainSvg = readFileSync(resolve(publicDir, 'icon-source.svg'));
const maskableSvg = readFileSync(resolve(publicDir, 'icon-maskable-source.svg'));

const sizes = [
  { file: 'favicon-16x16.png',    size: 16,  svg: mainSvg },
  { file: 'favicon-32x32.png',    size: 32,  svg: mainSvg },
  { file: 'apple-touch-icon.png', size: 180, svg: mainSvg },
  { file: 'icon-192.png',         size: 192, svg: mainSvg },
  { file: 'icon-512.png',         size: 512, svg: mainSvg },
  { file: 'maskable-icon-512.png',size: 512, svg: maskableSvg },
];

console.log('Generating PWA icons...');

for (const { file, size, svg } of sizes) {
  const outPath = resolve(publicDir, file);
  await sharp(svg).resize(size, size).png().toFile(outPath);
  console.log(`  ✓ ${file} (${size}x${size})`);
}

// Generate favicon.ico (multi-size: 16 + 32) using raw PNG buffers
const png16 = await sharp(mainSvg).resize(16, 16).png().toBuffer();
const png32 = await sharp(mainSvg).resize(32, 32).png().toBuffer();

// Simple ICO writer: one image entry at 32x32 (most compatible single-size .ico)
// Full multi-size ICO requires a proper ICO encoder; we use the 32x32 PNG for broad compat.
// Browsers that need 16x16 will use favicon-16x16.png via <link>.
const icoBuffer = buildIco([png16, png32]);
writeFileSync(resolve(publicDir, 'favicon.ico'), icoBuffer);
console.log('  ✓ favicon.ico (16+32)');

console.log('\nDone! All icons written to public/');

/**
 * Minimal ICO file builder.
 * ICO format: https://en.wikipedia.org/wiki/ICO_(file_format)
 * @param {Buffer[]} pngBuffers  Array of PNG buffers, each a square image.
 */
function buildIco(pngBuffers) {
  const count = pngBuffers.length;
  // ICO header: 6 bytes
  // Each dir entry: 16 bytes
  // Total header size = 6 + count * 16
  const headerSize = 6 + count * 16;

  // Calculate offsets for each image
  const offsets = [];
  let offset = headerSize;
  for (const buf of pngBuffers) {
    offsets.push(offset);
    offset += buf.length;
  }

  const totalSize = offset;
  const result = Buffer.alloc(totalSize);

  // ICO file header
  result.writeUInt16LE(0, 0);     // Reserved
  result.writeUInt16LE(1, 2);     // Type: 1 = ICO
  result.writeUInt16LE(count, 4); // Number of images

  // Directory entries
  for (let i = 0; i < count; i++) {
    const buf = pngBuffers[i];
    const dirOffset = 6 + i * 16;

    // Determine size from PNG header (bytes 16-24 for IHDR width/height)
    const width  = buf.readUInt32BE(16);
    const height = buf.readUInt32BE(20);

    result.writeUInt8(width > 255 ? 0 : width, dirOffset);      // Width (0 = 256)
    result.writeUInt8(height > 255 ? 0 : height, dirOffset + 1);// Height (0 = 256)
    result.writeUInt8(0, dirOffset + 2);   // Color palette count
    result.writeUInt8(0, dirOffset + 3);   // Reserved
    result.writeUInt16LE(1, dirOffset + 4);// Color planes
    result.writeUInt16LE(32, dirOffset + 6);// Bits per pixel
    result.writeUInt32LE(buf.length, dirOffset + 8); // Size of image data
    result.writeUInt32LE(offsets[i], dirOffset + 12);// Offset to image data
  }

  // Write image data
  for (let i = 0; i < count; i++) {
    pngBuffers[i].copy(result, offsets[i]);
  }

  return result;
}
