import type { PanelGeometry } from './panel';

export const SIMULATOR_SETTINGS = 'simulator:settings';
export const UPDATE_SIMULATOR_SETTINGS = 'simulator:updateSettings';
export const MINUTES_PER_DAY = 1440;

export interface SimulatorSettings {
  minute: number | null;
  sunset: number | null;
  timeZone: string;
  layout: string;
  brightness: number;
}

export interface SimulatorUpdate {
  minute?: number | null;
  layout?: string;
  brightness?: number;
}

export function simulatorGeometry(value: unknown): PanelGeometry | undefined {
  if (typeof value !== 'string') return;
  const match = /^(\d+)x(\d+):(\d+)x(\d+)$/i.exec(value.trim());
  if (!match) return;

  const [tileWidth, tileHeight, columns, rows] = match.slice(1).map(Number);
  const width = tileWidth * columns;
  const height = tileHeight * rows;
  if (tileWidth < 8 || tileHeight < 8 || columns < 1 || rows < 1 ||
      width > 512 || height > 512 || width * height > 65_536) return;

  return { width, height, tileWidth, tileHeight };
}

export function simulatorLayout({ width, height, tileWidth, tileHeight }: PanelGeometry) {
  return `${tileWidth}x${tileHeight}:${width / tileWidth}x${height / tileHeight}`;
}
