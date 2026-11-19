import type { ModeState } from '../panel/types';

let timer: NodeJS.Timeout;

function init({ matrix }: ModeState) {
  const width = matrix.width();
  const height = matrix.height();
  const phase = Float32Array.from({ length: width * height }, () => Math.random() * Math.PI * 2);

  function paint() {
    const time = performance.now() * .0003;
    matrix.clear();

    for (let i = 0; i < phase.length; i++) {
      const value = Math.round(255 * Math.max(0, 31 * Math.sin(time + phase[i]) - 30));
      if (value > 0) matrix.fgColor(value * 0x010101).setPixel(i % width, Math.floor(i / width));
    }

    matrix.sync();
  }

  paint();
  timer = setInterval(paint, 40);
}

export const Pulse = {
  init,
  deactivate() {
    clearInterval(timer);
  },
};
