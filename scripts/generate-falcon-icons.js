const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const srcPath = 'C:/Users/vlakh/.gemini/antigravity-ide/brain/7f083a9f-ffce-44e2-9d4f-18891b91564d/.user_uploaded/media_1789133345584.png';
const publicDir = path.join(__dirname, '../public');
const publicIconsDir = path.join(__dirname, '../public/icons');
const appDir = path.join(__dirname, '../app');

async function buildIcons() {
  console.log('Reading source brand logo from:', srcPath);
  const image = sharp(srcPath);
  const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });

  // Convert white background to transparent with anti-aliasing de-matting
  const outData = Buffer.from(data);
  for (let i = 0; i < outData.length; i += 4) {
    const r = outData[i], g = outData[i+1], b = outData[i+2];
    const minVal = Math.min(r, g, b);

    if (minVal >= 252) {
      outData[i+3] = 0;
    } else if (minVal >= 225) {
      const a = (252 - minVal) / (252 - 225);
      outData[i+3] = Math.round(a * 255);
      outData[i] = Math.max(0, Math.min(255, Math.round((r - 255 * (1 - a)) / a)));
      outData[i+1] = Math.max(0, Math.min(255, Math.round((g - 255 * (1 - a)) / a)));
      outData[i+2] = Math.max(0, Math.min(255, Math.round((b - 255 * (1 - a)) / a)));
    } else {
      outData[i+3] = 255;
    }
  }

  const fullPngBuffer = await sharp(outData, { raw: { width: info.width, height: info.height, channels: 4 } })
    .png()
    .toBuffer();

  if (!fs.existsSync(publicIconsDir)) {
    fs.mkdirSync(publicIconsDir, { recursive: true });
  }

  // 1. Full logo (minX: 345, minY: 72, width: 340, height: 418)
  const fullLogo = await sharp(fullPngBuffer)
    .extract({ left: 345, top: 72, width: 340, height: 418 })
    .png()
    .toBuffer();

  fs.writeFileSync(path.join(publicDir, 'falcon-logo.png'), fullLogo);
  fs.writeFileSync(path.join(publicDir, 'logo.png'), fullLogo);
  console.log('✓ Generated falcon-logo.png & logo.png');

  // 2. Emblem only (left: 348, top: 74, width: 334, height: 336)
  const emblemOnly = await sharp(fullPngBuffer)
    .extract({ left: 348, top: 74, width: 334, height: 336 })
    .png()
    .toBuffer();

  // 512x512 Master Emblem Icon
  const emblem512 = await sharp(emblemOnly)
    .resize(460, 460, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .extend({
      top: 26, bottom: 26, left: 26, right: 26,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    })
    .png()
    .toBuffer();

  fs.writeFileSync(path.join(publicDir, 'falcon-icon.png'), emblem512);
  fs.writeFileSync(path.join(publicDir, 'icon.png'), emblem512);
  fs.writeFileSync(path.join(appDir, 'icon.png'), emblem512);
  fs.writeFileSync(path.join(publicIconsDir, 'icon-512x512.png'), emblem512);
  console.log('✓ Generated 512x512 icon assets');

  // 192x192 Icon
  const emblem192 = await sharp(emblem512).resize(192, 192).png().toBuffer();
  fs.writeFileSync(path.join(publicIconsDir, 'icon-192x192.png'), emblem192);
  console.log('✓ Generated 192x192 icon');

  // Apple touch icon 180x180
  const appleIcon = await sharp(emblem512).resize(180, 180).png().toBuffer();
  fs.writeFileSync(path.join(publicIconsDir, 'apple-touch-icon.png'), appleIcon);
  fs.writeFileSync(path.join(appDir, 'apple-icon.png'), appleIcon);
  console.log('✓ Generated Apple Touch Icons');

  // Favicons
  const fav32 = await sharp(emblem512).resize(32, 32).png().toBuffer();
  fs.writeFileSync(path.join(publicDir, 'favicon.png'), fav32);
  fs.writeFileSync(path.join(publicDir, 'favicon.ico'), fav32);
  console.log('✓ Generated favicon.png & favicon.ico');

  // SVGs embedding the official high-res transparent emblem
  const b64 = emblem512.toString('base64');
  const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">\n  <image href="data:image/png;base64,${b64}" width="512" height="512" />\n</svg>\n`;
  fs.writeFileSync(path.join(publicDir, 'favicon.svg'), svgContent);
  fs.writeFileSync(path.join(publicIconsDir, 'icon.svg'), svgContent);
  fs.writeFileSync(path.join(publicIconsDir, 'icon-192x192.svg'), svgContent);
  fs.writeFileSync(path.join(publicIconsDir, 'icon-512x512.svg'), svgContent);
  console.log('✓ Generated SVG icons');

  console.log('All brand logo and icon assets created successfully!');
}

buildIcons().catch(err => {
  console.error('Failed generating icons:', err);
  process.exit(1);
});
