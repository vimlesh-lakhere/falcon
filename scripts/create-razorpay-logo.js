const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const artifactsDir = 'C:/Users/vlakh/.gemini/antigravity-ide/brain/7f083a9f-ffce-44e2-9d4f-18891b91564d';

async function main() {
  const pngPath = path.join(__dirname, '../public/razorpay-logo.png');
  const pngBuffer = fs.readFileSync(pngPath);
  const b64 = pngBuffer.toString('base64');
  const svg = [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">',
    '  <image href="data:image/png;base64,' + b64 + '" width="512" height="512" />',
    '</svg>'
  ].join('\n');

  fs.writeFileSync(path.join(__dirname, '../razorpay-logo.svg'), svg);
  fs.writeFileSync(path.join(__dirname, '../public/razorpay-logo.svg'), svg);
  fs.writeFileSync(path.join(artifactsDir, 'razorpay-logo.svg'), svg);

  console.log('✓ razorpay-logo.svg created successfully!');
}

main().catch(console.error);
