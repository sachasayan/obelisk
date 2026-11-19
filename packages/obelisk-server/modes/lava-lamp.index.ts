import { lavaPalettes } from '../../../shared/visual-settings';
import type { LavaPalette } from '../../../shared/visual-settings';
import { mixColor } from '../panel/color';
import type { ModeState } from '../panel/types';

// Start with wax already circulating so the mode has no warm-up period.
const initialWax = [
  { x: .23, y: .60, vx: .020, vy: -.081, heat: .90, size: 1.24 },
  { x: .79, y: .32, vx: -.020, vy: .049, heat: .24, size: 1.07 },
  { x: .46, y: .15, vx: .018, vy: -.030, heat: .56, size: .84 },
  { x: .11, y: .78, vx: -.010, vy: .044, heat: .28, size: .79 },
  { x: .62, y: .88, vx: -.015, vy: -.040, heat: .81, size: 1.13 },
  { x: .30, y: .38, vx: .014, vy: .030, heat: .22, size: .79 },
  { x: .87, y: .69, vx: -.019, vy: -.020, heat: .72, size: .75 },
  { x: .67, y: .22, vx: .007, vy: -.027, heat: .59, size: .70 },
];
const frameInterval = 40;
const waxSurface = .30;

let timer: NodeJS.Timeout;

function clamp(value: number) {
  return Math.max(0, Math.min(1, value));
}

function smooth(from: number, to: number, value: number) {
  const t = clamp((value - from) / (to - from));
  return t * t * (3 - 2 * t);
}

function makeLighting(width: number, height: number, palette: LavaPalette) {
  const [dark, tint, wax, hot, glow] = lavaPalettes[palette].colors;
  const liquid = new Uint32Array(width * height);
  for (let y = 0; y < height; y++) {
    const warmth = smooth(.13, 1, (y + .5) / height);
    for (let x = 0; x < width; x++) {
      const spread = .78 + .22 * Math.sin(Math.PI * (x + .5) / width);
      liquid[y * width + x] = mixColor(dark, tint, .12 + .57 * warmth * spread);
    }
  }
  const waxRamp = Uint32Array.from({ length: 256 }, (_, index) => {
    const light = index / 255;
    const body = mixColor(tint, wax, smooth(0, .44, light));
    return mixColor(mixColor(body, hot, smooth(.31, .81, light)), glow, smooth(.70, 1, light));
  });
  return { liquid, waxRamp, scatter: wax };
}

function init({ matrix, visualSettings }: ModeState) {
  const width = matrix.width();
  const height = matrix.height();
  const radiusX = Math.min(.26, Math.max(.106, .23 * height / width));
  const radiusY = .218;
  const field = new Float32Array(width * height);
  const heatField = new Float32Array(width * height);
  const bodies = initialWax.map((wax) => ({
    ...wax, home: wax.x, tailX: wax.x - wax.vx * .50, tailY: wax.y - wax.vy * .50, weight: 0,
  }));
  let time = 0;
  let lastFrame = performance.now();
  let previous = visualSettings()['lava-lamp'];
  let lighting = makeLighting(width, height, previous.palette);
  let settled = false;

  function advanceWax(dt: number) {
    time += dt;
    for (let i = 0; i < bodies.length; i++) {
      const a = bodies[i];
      if (!a.weight) continue;

      // Wax gains heat at the floor and loses it near the surface, reversing its buoyancy.
      const heating = smooth(.70, .95, a.y) * (1 - a.heat) * (.52 + .12 * Math.cos(2 * Math.PI * (a.x - .22)));
      const cooling = (1 - smooth(.045, .28, a.y)) * a.heat * (.46 + .17 * Math.sin(Math.PI * a.x));
      a.heat = clamp(a.heat + dt * (heating - cooling) / a.size);
      const current = .030 * Math.sin(2 * Math.PI * (a.y * .81 + a.x * .52) + time * .18);
      a.vx += dt * (current * 1.2 - a.vx * 1.25 + (a.home - a.x) * .20);
      a.vy += dt * ((.5 - a.heat) * .32 - a.vy * 1.22);

      for (let j = i + 1; j < bodies.length; j++) {
        const b = bodies[j];
        if (!b.weight) continue;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const distance = Math.hypot(dx / radiusX, dy / radiusY);
        const contact = 1 - smooth(.70, 1.6, distance);
        // Nearby lobes pull into a shared surface. Short-range pressure keeps their centers apart.
        const pull = dt * contact * (.50 * smooth(.37, .97, distance) - .26);
        a.vx += dx * pull * b.weight;
        a.vy += dy * pull * b.weight;
        b.vx -= dx * pull * a.weight;
        b.vy -= dy * pull * a.weight;

        const exchange = dt * contact * (b.heat - a.heat) * .045;
        a.heat += exchange * b.weight;
        b.heat -= exchange * a.weight;
      }
    }

    const side = radiusX * .38;
    for (const body of bodies) {
      if (!body.weight) continue;
      body.x += body.vx * dt;
      body.y += body.vy * dt;
      // The edges absorb momentum. Continued heating or cooling lets the wax peel away.
      if (body.x < side || body.x > 1 - side) {
        body.x = Math.max(side, Math.min(1 - side, body.x));
        body.vx = 0;
      }
      if (body.y < .065 || body.y > .98) {
        body.y = Math.max(.065, Math.min(.98, body.y));
        body.vy = 0;
      }
      body.tailX += (body.x - body.tailX) * dt * 2.15;
      body.tailY += (body.y - body.tailY) * dt * 1.75;
    }
  }

  function addWax(x: number, y: number, rx: number, ry: number, weight: number, heat: number, taper = 0) {
    const firstY = Math.max(0, Math.ceil(y - ry - .5));
    const lastY = Math.min(height - 1, Math.floor(y + ry - .5));
    for (let row = firstY; row <= lastY; row++) {
      const dy = (row + .5 - y) / ry;
      const span = rx * (1 - taper * dy);
      const firstX = Math.max(0, Math.ceil(x - span - .5));
      const lastX = Math.min(width - 1, Math.floor(x + span - .5));
      for (let column = firstX; column <= lastX; column++) {
        const dx = (column + .5 - x) / span;
        const influence = 1 - dy * dy - dx * dx;
        if (influence <= 0) continue;

        const index = row * width + column;
        const density = weight * influence * influence;
        field[index] += density;
        heatField[index] += density * heat;
      }
    }
  }

  function paint(force = false) {
    const now = performance.now();
    const elapsed = Math.min(120, now - lastFrame);
    lastFrame = now;

    const settings = visualSettings()['lava-lamp'];
    if (settings.speed === 0 && settings === previous && settled && !force) return;
    if (settings.palette !== previous.palette) lighting = makeLighting(width, height, settings.palette);
    previous = settings;

    settled = true;
    const change = force ? 1 : elapsed / 450;
    for (let i = 0; i < bodies.length; i++) {
      const body = bodies[i];
      const target = Number(i < settings.blobs);
      body.weight += Math.sign(target - body.weight) * Math.min(change, Math.abs(target - body.weight));
      if (body.weight !== target) settled = false;
    }

    const seconds = force ? 0 : elapsed / 1000 * settings.speed / 100;
    const steps = Math.ceil(seconds / .025);
    for (let i = 0; i < steps; i++) advanceWax(seconds / steps);

    field.fill(0);
    heatField.fill(0);

    for (const body of bodies) {
      if (!body.weight) continue;
      const { x, y, vy, tailX, tailY, size, heat, weight } = body;
      const flattened = (1 - smooth(.065, .22, y)) + smooth(.77, .98, y);
      const moving = smooth(.018, .095, Math.abs(vy));
      const stretch = (1 + .43 * moving) / (1 + .45 * flattened);
      const rx = width * radiusX * size / Math.sqrt(stretch);
      const ry = height * radiusY * size * stretch;
      const taper = Math.max(-.34, Math.min(.34, -vy * 3.6));

      addWax(x * width, y * height, rx, ry, weight, heat, taper);
      // Viscous drag leaves a smaller trailing lobe that forms thin necks during separation.
      addWax(tailX * width, tailY * height, rx * .68, ry * .84, weight * (.13 + .53 * moving), heat);
    }

    const { liquid, waxRamp, scatter } = lighting;
    for (let y = 0; y < height; y++) {
      const backlight = smooth(.04, 1, (y + .5) / height);
      for (let x = 0; x < width; x++) {
        const index = y * width + x;
        const density = field[index];
        let color = liquid[index];
        if (density > .025) {
          const dx = field[index + Number(x < width - 1)] - field[index - Number(x > 0)];
          const dy = field[index + (y < height - 1 ? width : 0)] - field[index - (y > 0 ? width : 0)];
          const gradient = Math.hypot(dx, dy);
          const edgeWidth = Math.min(.28, .014 + gradient * .29);
          const opacity = smooth(waxSurface - edgeWidth, waxSurface + edgeWidth, density);
          const depth = smooth(waxSurface, 1.06, density);
          const facingLight = .5 + .5 * (.44 * dx - .77 * dy) / (gradient + .028);
          const light = clamp(.095 + .39 * depth + .28 * facingLight + .22 * heatField[index] / density + .13 * backlight);
          color = mixColor(color, scatter, .14 * smooth(.025, waxSurface, density));
          color = mixColor(color, waxRamp[Math.round(light * 255)], opacity);
        }
        matrix.fgColor(color).setPixel(x, y);
      }
    }
    matrix.sync();
  }

  paint(true);
  timer = setInterval(paint, frameInterval);
}

export const LavaLamp = {
  init,
  deactivate() { clearInterval(timer); },
};
