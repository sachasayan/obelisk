import { scaleColor } from '../panel/color';
import type { ModeState } from '../panel/types';

const colors = [0xc4ddff, 0x789eff, 0x9b8be4, 0xfff1d9];
const meteorDuration = 1300;
let timer: NodeJS.Timeout;

function init({ matrix }: ModeState) {
  const width = matrix.width();
  const height = matrix.height();
  const stars = new Map<number, { phase: number; period: number; peak: number; color: number }>();
  const count = Math.min(512, Math.ceil(width * height / 12));
  while (stars.size < count) {
    stars.set(Math.floor(Math.random() * width * height), {
      phase: Math.random() * Math.PI * 2,
      period: 1300 + Math.random() * 4400,
      peak: .23 + Math.random() * .77,
      color: colors[Math.floor(Math.random() * colors.length)],
    });
  }

  function newMeteor(start: number) {
    const direction = Math.random() < .5 ? 1 : -1;
    const distance = .26 + Math.random() * .24;
    return {
      start,
      x: (direction > 0 ? .08 + Math.random() * .33 : .59 + Math.random() * .33) * (width - 1),
      y: Math.random() * .23 * (height - 1),
      dx: direction * distance * (width - 1),
      dy: (.40 + Math.random() * .29) * (height - 1),
    };
  }

  let meteor = newMeteor(performance.now() + 4200 + Math.random() * 3200);

  function paint() {
    const now = performance.now();
    matrix.clear();

    for (const [index, star] of stars) {
      const wave = .5 + .5 * Math.cos(now * Math.PI * 2 / star.period + star.phase);
      const brightness = star.peak * (.10 + .90 * wave ** 2.4);
      matrix.fgColor(scaleColor(star.color, brightness)).setPixel(index % width, Math.floor(index / width));
    }

    const age = (now - meteor.start) / meteorDuration;
    if (age > 1) {
      meteor = newMeteor(now + 12_000 + Math.random() * 18_000);
    } else if (age >= 0) {
      const distance = Math.hypot(meteor.dx, meteor.dy);
      const length = Math.min(15, Math.max(1, Math.round(distance * .32)));
      const envelope = Math.min(1, age * 8, (1 - age) * 5);
      for (let i = length; i >= 0; i--) {
        const progress = age - i / Math.max(1, distance);
        if (progress < 0) continue;
        const x = Math.round(meteor.x + meteor.dx * progress);
        const y = Math.round(meteor.y + meteor.dy * progress);
        const strength = envelope * (1 - i / (length + 1)) ** 2;
        const color = scaleColor(i === 0 ? 0xf4fbff : 0x59abff, strength);
        if (color) matrix.fgColor(color).setPixel(x, y);
      }
    }

    matrix.sync();
  }

  paint();
  timer = setInterval(paint, 40);
}

export const Space = {
  init,
  deactivate() { clearInterval(timer); },
};
