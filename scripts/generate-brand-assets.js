const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

async function generateBrandAssets(sourceImagePath) {
  const resolvedSrc = sourceImagePath || path.join(__dirname, '../public/falcon-logo.png');
  console.log('Generating brand assets from:', resolvedSrc);

  const image = sharp(resolvedSrc);
  const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
  
  // If source already has alpha, respect it; otherwise strip white background
  const outData = Buffer.from(data);
  if (!info.hasAlpha || info.channels === 3) {
    // 3 channels or opaque: Convert to RGBA
    const rgba = Buffer.alloc(info.width * info.height * 4);
    for (let i = 0; i < info.width * info.height; i++) {
      const srcIdx = i * info.channels;
      const dstIdx = i * 4;
      const r = data[srcIdx], g = data[srcIdx + 1], b = data[srcIdx + 2];
      const minVal = Math.min(r, g, b);
      rgba[dstIdx] = r;
      rgba[dstIdx + 1] = g;
      rgba[dstIdx + 2] = b;
      rgba[dstIdx + 3] = minVal >= 252 ? 0 : 255;
    }
  }

  console.log('Brand asset generation complete.');
}

if (require.main === module) {
  const src = process.argv[2];
  generateBrandAssets(src).catch(console.error);
}

module.exports = { generateBrandAssets };
