import type { PanelGeometry } from '../../../shared/panel';

export function resolveSimLayout(value: string | undefined, fallback: PanelGeometry): PanelGeometry {
  if (value === undefined) return fallback;

  const match = /^(\d+)x(\d+):(\d+)x(\d+)$/i.exec(value.trim());
  if (!match) throw new Error('OBELISK_SIM_LAYOUT must use COLSxROWS:CHAINxPARALLEL, such as 32x16:4x1.');

  const [tileWidth, tileHeight, chainLength, parallel] = match.slice(1).map(Number);
  const width = tileWidth * chainLength;
  const height = tileHeight * parallel;
  if (tileWidth < 8 || tileHeight < 8 || chainLength < 1 || parallel < 1
    || width > 512 || height > 512 || width * height > 65_536) {
    throw new Error('OBELISK_SIM_LAYOUT requires tiles of at least 8×8, a display of at most 512×512, and up to 65,536 pixels.');
  }

  return { width, height, tileWidth, tileHeight };
}
