import type { ModeState } from '../panel/types';

export const Sunlight = {
  init({ matrix }: ModeState) {
    matrix.fgColor(0xccddcc).fill().sync();
  },
  deactivate() {},
};
