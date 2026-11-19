import type { Color, FontInstance } from 'rpi-led-matrix';
import type { VisualSettings } from '../../../shared/visual-settings';

export interface PanelMatrix {
  afterSync(hook: (matrix: PanelMatrix, dt: number, time: number) => void): this;
  bgColor(color: Color | number): this;
  brightness(value: number): this;
  clear(): this;
  drawCircle(x: number, y: number, radius: number): this;
  drawLine(x0: number, y0: number, x1: number, y1: number): this;
  drawRect(x: number, y: number, width: number, height: number): this;
  drawText(text: string, x: number, y: number): this;
  fgColor(color: Color | number): this;
  fill(): this;
  font(font: FontInstance): this;
  height(): number;
  setPixel(x: number, y: number): this;
  sync(): void;
  width(): number;
}

export interface PlayerData {
  y: number;
}

export interface ModeState {
  matrix: PanelMatrix;
  playerData: (PlayerData | undefined)[];
  loadFont(name: string): FontInstance;
  visualSettings(): VisualSettings;
}
