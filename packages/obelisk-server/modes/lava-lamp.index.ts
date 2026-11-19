import { lavaPalettes, maxLavaBlobs } from '../../../shared/visual-settings';
import type { LavaPalette } from '../../../shared/visual-settings';
import { mixColor } from '../panel/color';
import type { ModeState } from '../panel/types';

const anchors = [.15, .78, .44, .61, .28, .91, .07, .53];
const rampSize = 256;
const ramps = new Map<LavaPalette, Uint32Array>();
let timer: NodeJS.Timeout;

function paletteRamp(palette: LavaPalette) {
  const cached = ramps.get(palette);
  if (cached) return cached;

  const colors = lavaPalettes[palette].colors;
  const ramp = Uint32Array.from({ length: rampSize }, (_, index) => {
    const value = index * (colors.length - 1) / (rampSize - 1);
    const from = Math.floor(value);
    return mixColor(colors[from], colors[Math.min(from + 1, colors.length - 1)], value - from);
  });
  ramps.set(palette, ramp);
  return ramp;
}

function init({ matrix, visualSettings }: ModeState) {
  const width = matrix.width();
  const height = matrix.height();
  const aspect = Math.sqrt(width / height);
  const field = new Float32Array(width * height);
  const weights = new Float32Array(maxLavaBlobs);
  let time = 0;
  let lastFrame = performance.now();
  let previous = visualSettings()['lava-lamp'];
  let settled = false;

  function paint(force = false) {
    const now = performance.now();
    const elapsed = Math.min(120, now - lastFrame);
    lastFrame = now;

    const settings = visualSettings()['lava-lamp'];
    if (settings.speed === 0 && settings === previous && settled && !force) return;
    previous = settings;
    time += elapsed / 1000 * settings.speed / 100;
    field.fill(0);
    settled = true;

    for (let i = 0; i < anchors.length; i++) {
      const target = Number(i < settings.blobs);
      const change = force ? 1 : elapsed / 450;
      weights[i] += Math.sign(target - weights[i]) * Math.min(change, Math.abs(target - weights[i]));
      if (weights[i] !== target) settled = false;
      if (!weights[i]) continue;

      const phase = i * 2.4;
      const rise = time * (.23 + (i % 3) * .051) + phase;
      const x = width * (anchors[i] + .102 * Math.sin(time * .31 + phase) + .035 * Math.sin(time * .57 - phase));
      const y = height * (.52 + .43 * Math.sin(rise));
      const radius = .32 + .082 * Math.cos(time * .42 + phase);
      const radiusX = width * radius / Math.max(.75, aspect);
      const radiusY = height * radius * (1.12 + .24 * Math.sin(rise));
      const firstX = Math.max(0, Math.ceil(x - radiusX - .5));
      const lastX = Math.min(width - 1, Math.floor(x + radiusX - .5));
      const firstY = Math.max(0, Math.ceil(y - radiusY - .5));
      const lastY = Math.min(height - 1, Math.floor(y + radiusY - .5));

      for (let row = firstY; row <= lastY; row++) {
        const vertical = ((row + .5 - y) / radiusY) ** 2;
        for (let column = firstX; column <= lastX; column++) {
          const influence = 1 - vertical - ((column + .5 - x) / radiusX) ** 2;
          if (influence > 0) field[row * width + column] += weights[i] * influence * influence;
        }
      }
    }

    const ramp = paletteRamp(settings.palette);
    for (let i = 0; i < field.length; i++) {
      const edge = Math.min(1, Math.max(0, (field[i] - .10) / .22));
      const depth = Math.min(1, field[i] / 1.16);
      const glow = edge * (.37 + .63 * depth);
      matrix.fgColor(ramp[Math.round(glow * (rampSize - 1))]).setPixel(i % width, Math.floor(i / width));
    }
    matrix.sync();
  }

  paint(true);
  timer = setInterval(paint, 50);
}

export const LavaLamp = {
  init,
  deactivate() { clearInterval(timer); },
};
