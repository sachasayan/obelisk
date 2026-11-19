import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { PNG } from 'pngjs';

export async function readPng(name: string) {
  const bytes = await readFile(join(__dirname, 'images', name));
  return PNG.sync.read(bytes);
}

export function forEachOpaquePixel(image: PNG, visit: (x: number, y: number, color: number) => void) {
  for (let y = 0; y < image.height; y++) {
    for (let x = 0; x < image.width; x++) {
      const offset = (y * image.width + x) * 4;
      if (image.data[offset + 3] === 255) {
        visit(x, y, image.data.readUIntBE(offset, 3));
      }
    }
  }
}
