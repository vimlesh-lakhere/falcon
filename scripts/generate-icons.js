const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

// Function to generate a simple uncompressed RGBA PNG file
function createSolidPng(width, height, r, g, b, a = 255) {
  // PNG signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData.writeUInt8(8, 8); // bit depth 8
  ihdrData.writeUInt8(6, 9); // color type 6 (RGBA)
  ihdrData.writeUInt8(0, 10); // compression
  ihdrData.writeUInt8(0, 11); // filter
  ihdrData.writeUInt8(0, 12); // interlace

  const ihdrChunk = createChunk("IHDR", ihdrData);

  // Raw image data with filter byte (0) per scanline
  const scanlineLength = width * 4 + 1;
  const rawData = Buffer.alloc(height * scanlineLength);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * scanlineLength;
    rawData[rowOffset] = 0; // Filter type 0 (None)
    for (let x = 0; x < width; x++) {
      const pixelOffset = rowOffset + 1 + x * 4;
      // Purple to Indigo gradient simulation
      const factor = (x + y) / (width + height);
      rawData[pixelOffset] = Math.round(79 + factor * (219 - 79));     // R
      rawData[pixelOffset + 1] = Math.round(70 + factor * (39 - 70));   // G
      rawData[pixelOffset + 2] = Math.round(229 + factor * (119 - 229));// B
      rawData[pixelOffset + 3] = a;                                     // A
    }
  }

  const compressedData = zlib.deflateSync(rawData);
  const idatChunk = createChunk("IDAT", compressedData);
  const iendChunk = createChunk("IEND", Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function createChunk(type, data) {
  const length = data.length;
  const buffer = Buffer.alloc(4 + 4 + length + 4);
  buffer.writeUInt32BE(length, 0);
  buffer.write(type, 4, 4, "ascii");
  data.copy(buffer, 8);

  const crcData = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = crc32(crcData);
  buffer.writeUInt32BE(crc, 8 + length);
  return buffer;
}

// Standard CRC32 table
const crcTable = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    if (c & 1) c = 0xedb88320 ^ (c >>> 1);
    else c = c >>> 1;
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let crc = 0 ^ -1;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ -1) >>> 0;
}

const iconsDir = path.join(__dirname, "../public/icons");
fs.writeFileSync(path.join(iconsDir, "icon-192x192.png"), createSolidPng(192, 192, 79, 70, 229));
fs.writeFileSync(path.join(iconsDir, "icon-512x512.png"), createSolidPng(512, 512, 79, 70, 229));
fs.writeFileSync(path.join(iconsDir, "apple-touch-icon.png"), createSolidPng(180, 180, 79, 70, 229));

console.log("Valid PNG PWA icons generated successfully.");
