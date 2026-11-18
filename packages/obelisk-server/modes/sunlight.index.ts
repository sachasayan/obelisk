import type { ModeState } from '../panel/types';

export const Sunlight = {
  init({ matrix }: ModeState) {
    matrix.brightness(100).fgColor(0xccddcc).fill().sync();
  },
  deactivate() {},
};
