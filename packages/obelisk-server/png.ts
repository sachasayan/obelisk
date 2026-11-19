import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { PNG } from 'pngjs';

export async function readPng(name: string) {
  const bytes = await readFile(join(__dirname, 'images', name));
  return PNG.sync.read(bytes);
}
