import { performance } from 'node:perf_hooks';
import type { Color, FontInstance } from 'rpi-led-matrix';
import type { PanelFrame, PanelGeometry } from '../../../shared/panel';
import { BitmapFont } from './bitmap-font';
import type { PanelMatrix } from './types';

const frameInterval = 1000 / 60;

function rgb(color: Color | number): [number, number, number] {
  if (typeof color === 'number') return [(color >>> 16) & 255, (color >>> 8) & 255, color & 255];

  return [color.r & 255, color.g & 255, color.b & 255];
}

export class VirtualMatrix implements PanelMatrix {
  private buffer: Buffer;
  private readonly started = performance.now();
  private lastSync = this.started - frameInterval;
  private presentTimer?: NodeJS.Timeout;
  private foreground = rgb(0);
  private background = rgb(0);
  private activeFont?: BitmapFont;
  private hook?: Parameters<PanelMatrix['afterSync']>[0];
  private level: number;
  private mode = 'clock';
  private frame: PanelFrame<Buffer>;

  constructor(
    private geometry: PanelGeometry,
    brightness: number,
    private readonly publish: (frame: PanelFrame<Buffer>) => void,
  ) {
    this.buffer = Buffer.alloc(this.width() * this.height() * 3);
    this.level = brightness;
    this.frame = this.snapshot(0);
  }

  configure(geometry: PanelGeometry) {
    this.geometry = geometry;
    this.buffer = Buffer.alloc(this.width() * this.height() * 3);
  }

  width() { return this.geometry.width; }
  height() { return this.geometry.height; }

  latest() {
    return this.frame;
  }

  setMode(mode: string) {
    this.mode = mode;
  }

  afterSync(hook: Parameters<PanelMatrix['afterSync']>[0]) { this.hook = hook; return this; }
  brightness(value: number) { this.level = Math.max(0, Math.min(100, Math.trunc(value))); return this; }
  bgColor(color: Color | number) { this.background = rgb(color); return this; }
  fgColor(color: Color | number) { this.foreground = rgb(color); return this; }
  clear() { this.buffer.fill(0); return this; }
  fill() { this.buffer.fill(Buffer.from(this.foreground)); return this; }

  font(font: FontInstance) {
    if (!(font instanceof BitmapFont)) throw new Error('The virtual panel requires a bitmap font.');
    this.activeFont = font;
    return this;
  }

  private putPixel(x: number, y: number, color: [number, number, number]) {
    if (x < 0 || y < 0 || x >= this.width() || y >= this.height()) return;

    const offset = (y * this.width() + x) * 3;
    this.buffer[offset] = color[0];
    this.buffer[offset + 1] = color[1];
    this.buffer[offset + 2] = color[2];
  }

  setPixel(x: number, y: number) {
    if (Number.isFinite(x) && Number.isFinite(y)) this.putPixel(Math.trunc(x), Math.trunc(y), this.foreground);
    return this;
  }

  drawLine(x0: number, y0: number, x1: number, y1: number) {
    let x = Math.trunc(x0);
    let y = Math.trunc(y0);
    const endX = Math.trunc(x1);
    const endY = Math.trunc(y1);
    if (![x, y, endX, endY].every(Number.isFinite)) return this;

    const dx = Math.abs(endX - x);
    const dy = -Math.abs(endY - y);
    const stepX = x < endX ? 1 : -1;
    const stepY = y < endY ? 1 : -1;
    let error = dx + dy;

    while (true) {
      this.putPixel(x, y, this.foreground);
      if (x === endX && y === endY) break;
      const twiceError = error * 2;
      if (twiceError >= dy) { error += dy; x += stepX; }
      if (twiceError <= dx) { error += dx; y += stepY; }
    }

    return this;
  }

  drawRect(x: number, y: number, width: number, height: number) {
    return this.drawLine(x, y, x + width, y)
      .drawLine(x + width, y, x + width, y + height)
      .drawLine(x + width, y + height, x, y + height)
      .drawLine(x, y + height, x, y);
  }

  drawCircle(cx: number, cy: number, radius: number) {
    if (![cx, cy, radius].every(Number.isFinite) || radius < 0) return this;
    cx = Math.trunc(cx);
    cy = Math.trunc(cy);
    let x = Math.trunc(radius);
    let y = 0;
    let error = 1 - x;

    while (x >= y) {
      for (const [dx, dy] of [[x, y], [y, x], [-y, x], [-x, y], [-x, -y], [-y, -x], [y, -x], [x, -y]]) {
        this.putPixel(cx + dx, cy + dy, this.foreground);
      }
      y++;
      if (error < 0) error += 2 * y + 1;
      else { x--; error += 2 * (y - x) + 1; }
    }
    return this;
  }

  drawText(text: string, x: number, y: number) {
    if (!this.activeFont) throw new Error('Cannot draw text before setting a panel font.');
    const hasBackground = this.background.some((channel) => channel !== 0);
    this.activeFont.draw(text, x, y, (pixelX, pixelY, filled) => {
      if (filled || hasBackground) this.putPixel(pixelX, pixelY, filled ? this.foreground : this.background);
    });
    return this;
  }

  private snapshot(sequence: number): PanelFrame<Buffer> {
    return {
      ...this.geometry,
      rgb: Buffer.from(this.buffer),
      brightness: this.level,
      mode: this.mode,
      sequence,
    };
  }

  sync() {
    if (this.presentTimer) return;

    const delay = Math.max(0, Math.ceil(this.lastSync + frameInterval - performance.now()));
    this.presentTimer = setTimeout(() => {
      this.presentTimer = undefined;
      const now = performance.now();
      const delta = this.frame.sequence === 0 ? now - this.started : now - this.lastSync;
      this.lastSync = now;
      this.frame = this.snapshot(this.frame.sequence + 1);
      this.publish(this.frame);
      this.hook?.(this, delta, now - this.started);
    }, delay);
  }
}
