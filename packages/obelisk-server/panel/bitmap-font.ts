import { readFileSync } from 'node:fs';
import type { FontInstance } from 'rpi-led-matrix';

interface Glyph {
  advance: number;
  height: number;
  offsetY: number;
  rows: Buffer[];
}

export class BitmapFont implements FontInstance {
  private readonly glyphs = new Map<number, Glyph>();
  private readonly lineHeight: number;
  private readonly ascent: number;

  constructor(private readonly fontName: string, private readonly filePath: string) {
    const source = readFileSync(filePath, 'utf8');
    const bounds = /^FONTBOUNDINGBOX\s+\d+\s+(\d+)\s+-?\d+\s+(-?\d+)/m.exec(source);
    if (!bounds) throw new Error(`Missing BDF font bounds in ${filePath}`);
    this.lineHeight = Number(bounds[1]);
    this.ascent = this.lineHeight + Number(bounds[2]);

    for (const { 1: block } of source.matchAll(/^STARTCHAR[^\n]*\n([\s\S]*?)^ENDCHAR/mg)) {
      const encoding = /^ENCODING\s+(\d+)/m.exec(block);
      const advance = /^DWIDTH\s+(\d+)/m.exec(block);
      const bounds = /^BBX\s+\d+\s+(\d+)\s+-?\d+\s+(-?\d+)/m.exec(block);
      const height = Number(bounds?.[1]);
      const rows = block.split(/^BITMAP\r?\n/m)[1]?.trim().split(/\r?\n/);
      if (!encoding || !advance || !bounds || !rows || (height > 0 && rows.length !== height)) continue;

      this.glyphs.set(Number(encoding[1]), {
        advance: Number(advance[1]),
        height,
        offsetY: Number(bounds[2]),
        rows: rows.map((row) => Buffer.from(row.trim(), 'hex')),
      });
    }
  }

  baseline() { return this.ascent; }
  height() { return this.lineHeight; }
  name() { return this.fontName; }
  path() { return this.filePath; }

  stringWidth(text: string, kerning = 0) {
    return Array.from(text).reduce((width, char) =>
      width + Math.max(0, (this.glyphs.get(char.codePointAt(0))?.advance ?? -1) + kerning), 0);
  }

  draw(text: string, x: number, y: number, paint: (x: number, y: number, filled: boolean) => void) {
    let glyphX = Math.trunc(x);
    const baseline = Math.trunc(y) + this.ascent;
    for (const char of text) {
      const glyph = this.glyphs.get(char.codePointAt(0)) ?? this.glyphs.get(0xfffd);
      if (!glyph) continue;

      const glyphY = baseline - glyph.height - glyph.offsetY;
      for (let row = 0; row < glyph.height; row++) {
        for (let col = 0; col < glyph.advance; col++) {
          const bit = glyph.rows[row][col >> 3] & (0x80 >> (col % 8));
          paint(glyphX + col, glyphY + row, Boolean(bit));
        }
      }
      glyphX += glyph.advance;
    }
  }
}
