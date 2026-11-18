import type { ModeState } from '../panel/types';

export const Test = {
  init({ matrix }: ModeState) {
    const width = matrix.width();
    const height = matrix.height();
    matrix
      .clear()
      .brightness(100)
      .fgColor(0x0000ff)
      .fill()
      .fgColor(0xffff00)
      .drawCircle(width / 2, height / 2, width / 2 - 1)
      .drawRect(width / 4, height / 4, width / 2, height / 2)
      .fgColor({ r: 255, g: 0, b: 0 })
      .drawLine(0, 0, width, height)
      .drawLine(width - 1, 0, 0, height)
      .sync();
  },
  deactivate() {},
};
