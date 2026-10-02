// Render the source SVG directly: Quick Look adds thumbnail framing at small sizes.
import sharp from 'sharp';
import { readFile, writeFile } from 'node:fs/promises';

const source = new URL('../favicon.svg', import.meta.url);
const target = new URL('../favicon.ico', import.meta.url);
const svg = await readFile(source);
const sizes = [16, 32, 48];
const frames = await Promise.all(sizes.map(size =>
  sharp(svg, { density: 384 }).resize(size, size).png().toBuffer()
));
const directory = Buffer.alloc(6 + sizes.length * 16);
directory.writeUInt16LE(1, 2); // ICO, rather than CUR.
directory.writeUInt16LE(sizes.length, 4);
let offset = directory.length;
for (const [i, frame] of frames.entries()) {
  const entry = 6 + i * 16;
  directory[entry] = directory[entry + 1] = sizes[i];
  directory.writeUInt16LE(1, entry + 4);
  directory.writeUInt16LE(32, entry + 6);
  directory.writeUInt32LE(frame.length, entry + 8);
  directory.writeUInt32LE(offset, entry + 12);
  offset += frame.length;
}
await writeFile(target, Buffer.concat([directory, ...frames]));
console.log(`Built favicon.ico from favicon.svg: ${sizes.join(', ')}px (${offset} bytes).`);
