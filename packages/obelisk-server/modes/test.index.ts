import type { ModeState } from '../panel/types';

export const Test = {
  init({ matrix }: ModeState) {
    const width = matrix.width();
    const height = matrix.height();
    const centerX = Math.floor((width - 1) / 2);
    const centerY = Math.floor((height - 1) / 2);
    matrix
      .clear()
      .fgColor(0x0000ff)
      .fill()
      .fgColor(0xffff00)
      .drawCircle(centerX, centerY, Math.min(centerX, centerY))
      .drawRect(Math.floor(width / 4), Math.floor(height / 4), Math.floor(width / 2), Math.floor(height / 2))
      .fgColor({ r: 255, g: 0, b: 0 })
      .drawLine(0, 0, width - 1, height - 1)
      .drawLine(width - 1, 0, 0, height - 1)
      .sync();
  },
  deactivate() {},
};
