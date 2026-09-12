const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

async function createIco() {
  const inputImage = path.resolve(__dirname, '../public/superior-logo.png');
  const buildDir = path.resolve(__dirname, '../build');
  const outputIco = path.join(buildDir, 'icon.ico');
  const outputPng = path.join(buildDir, 'icon.png');

  if (!fs.existsSync(buildDir)) {
    fs.mkdirSync(buildDir, { recursive: true });
  }

  const sizes = [16, 24, 32, 48, 64, 128, 256];
  console.log(`Generating icons from ${inputImage}...`);

  const pngBuffers = [];
  for (const size of sizes) {
    const buf = await sharp(inputImage)
      .resize(size, size, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png()
      .toBuffer();
    pngBuffers.push({ size, buffer: buf });
  }

  // Also save a master 256x256 png for electron-builder fallback
  await sharp(inputImage)
    .resize(256, 256, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(outputPng);

  // Construct ICO file
  // Header: 6 bytes
  // Entries: 16 bytes each
  // Image Data: concat(buffers)
  const count = pngBuffers.length;
  const headerSize = 6;
  const dirEntrySize = 16;
  let offset = headerSize + (count * dirEntrySize);

  const header = Buffer.alloc(headerSize);
  header.writeUInt16LE(0, 0); // Reserved
  header.writeUInt16LE(1, 2); // Type: 1 = ICO
  header.writeUInt16LE(count, 4); // Number of images

  const entries = [];
  for (const item of pngBuffers) {
    const entry = Buffer.alloc(dirEntrySize);
    const width = item.size >= 256 ? 0 : item.size;
    const height = item.size >= 256 ? 0 : item.size;

    entry.writeUInt8(width, 0);       // Width
    entry.writeUInt8(height, 1);      // Height
    entry.writeUInt8(0, 2);           // Color palette
    entry.writeUInt8(0, 3);           // Reserved
    entry.writeUInt16LE(1, 4);        // Color planes
    entry.writeUInt16LE(32, 6);       // Bits per pixel
    entry.writeUInt32LE(item.buffer.length, 8);  // Image data size
    entry.writeUInt32LE(offset, 12);  // Image data offset

    entries.push(entry);
    offset += item.buffer.length;
  }

  const icoBuffer = Buffer.concat([
    header,
    ...entries,
    ...pngBuffers.map(p => p.buffer)
  ]);

  fs.writeFileSync(outputIco, icoBuffer);
  console.log(`Successfully generated multi-size Windows icon: ${outputIco} (${icoBuffer.length} bytes)`);
  console.log(`Successfully generated fallback PNG: ${outputPng}`);
}

createIco().catch(err => {
  console.error('Error creating ICO file:', err);
  process.exit(1);
});
