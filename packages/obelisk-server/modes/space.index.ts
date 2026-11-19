import chroma from 'chroma-js';
import type { PNG } from 'pngjs';
import type { ModeState } from '../panel/types';
import { forEachOpaquePixel, readPng } from '../png';

const palette = chroma.scale([0xf3fbff, 0x131526]);
let stop = () => {};

function init({ matrix }: ModeState) {
  const width = matrix.width();
  const height = matrix.height();
  const starSpeed = Math.min(90, height * 3);
  const starCount = Math.min(1024, Math.ceil(width * height / 16));
  const starfield = Array.from({ length: starCount }, () => {
    const distance = 1 - Math.pow(1000, -Math.random());
    return {
      x: Math.floor(Math.random() * width),
      y: Math.random() * height,
      speed: starSpeed * (1 - distance),
      trail: Math.floor((1 - distance) * 3),
      color: palette(distance).num(),
    };
  });

  let rocket: PNG | undefined;
  let active = true;
  let lastFrame = performance.now();

  function paint() {
    const now = performance.now();
    const dt = Math.min(100, now - lastFrame) / 1000;
    lastFrame = now;
    matrix.clear();

    for (const star of starfield) {
      star.y += star.speed * dt;
      if (star.y >= height) star.y = -star.trail;
      const y = Math.floor(star.y);
      if (y + star.trail >= 0) {
        matrix.fgColor(star.color).drawLine(star.x, Math.max(0, y), star.x, Math.min(height - 1, y + star.trail));
      }
    }

    if (rocket) {
      const scale = Math.min(1, width / rocket.width, height / rocket.height);
      const spareX = width - Math.round(rocket.width * scale);
      const spareY = height - Math.round(rocket.height * scale);
      const x = Math.floor(spareX / 2 + Math.min(5, spareX / 2) * Math.sin(now / 650));
      const y = Math.floor(spareY / 2 + Math.min(2, spareY / 2) * Math.sin(now / 320));
      forEachOpaquePixel(rocket, (px, py, color) => {
        matrix.fgColor(color).setPixel(x + Math.floor(px * scale), y + Math.floor(py * scale));
      });
    }

    matrix.sync();
  }

  readPng('spaceship.png')
    .then((image) => { if (active) rocket = image; })
    .catch((error) => { if (active) console.error('Could not read the Space sprite:', error); });
  paint();
  const timer = setInterval(paint, 40);
  stop = () => {
    active = false;
    clearInterval(timer);
  };
}

export const Space = { init, deactivate: () => stop() };
