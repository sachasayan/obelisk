import type { ModeState } from '../panel/types';
import { scaleColor } from '../panel/color';

let timer: NodeJS.Timeout;

function init({ matrix, visualSettings }: ModeState) {
  const width = matrix.width();
  const height = matrix.height();
  const phase = Float32Array.from({ length: width * height }, () => Math.random() * Math.PI * 2);
  let lastIntensity = -1;

  function paint() {
    const { color, intensity } = visualSettings().pulse;
    if (intensity === 0 && lastIntensity === 0) return;
    lastIntensity = intensity;
    const time = performance.now() * .0003;
    const rgb = Number.parseInt(color.slice(1), 16);
    matrix.clear();

    if (intensity > 0) {
      for (let i = 0; i < phase.length; i++) {
        const glow = Math.max(.025, 31 * Math.sin(time + phase[i]) - 30);
        const pixel = scaleColor(rgb, glow * intensity / 100);
        if (pixel) matrix.fgColor(pixel).setPixel(i % width, Math.floor(i / width));
      }
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
