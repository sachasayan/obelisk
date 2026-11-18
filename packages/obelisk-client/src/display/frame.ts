import type { PanelFrame } from '../../../../shared/panel';

export type DisplayFrame = PanelFrame<ArrayBuffer>;

export function writeRgba(frame: DisplayFrame, target: Uint8Array | Uint8ClampedArray) {
  const source = new Uint8Array(frame.rgb);
  const brightness = frame.brightness / 100;
  for (let src = 0, dst = 0; src < source.length; src += 3, dst += 4) {
    target[dst] = Math.round(source[src] * brightness);
    target[dst + 1] = Math.round(source[src + 1] * brightness);
    target[dst + 2] = Math.round(source[src + 2] * brightness);
    target[dst + 3] = 255;
  }
}
