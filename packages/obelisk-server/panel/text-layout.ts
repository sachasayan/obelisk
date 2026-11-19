import type { ModeState } from './types';

const fontNames = ['spleen-16x32', 'spleen-12x24', 'spleen-8x16', '5x7', '4x6', 'tom-thumb'];

interface TextBox {
  width: number;
  height: number;
  x?: number;
  y?: number;
}

export function drawFittedText(
  { matrix, loadFont }: ModeState,
  labels: readonly string[],
  { width, height, x = 0, y = 0 }: TextBox,
  color: number,
  candidates: readonly string[] = fontNames,
) {
  for (const name of candidates) {
    const font = loadFont(name);
    if (font.height() > height) continue;

    const text = labels.find((label) => font.stringWidth(label) <= width);
    if (!text) continue;

    matrix.font(font).fgColor(color).drawText(
      text,
      x + Math.floor((width - font.stringWidth(text)) / 2),
      y + Math.floor((height - font.height()) / 2),
    );
    return true;
  }
  return false;
}
