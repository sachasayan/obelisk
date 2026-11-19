import type { PanelGeometry } from '../../../shared/panel';
import { simulatorGeometry } from '../../../shared/simulator';

export function resolveSimLayout(value: string | undefined, fallback: PanelGeometry): PanelGeometry {
  if (value === undefined) return fallback;
  const geometry = simulatorGeometry(value);
  if (!geometry) {
    throw new Error('OBELISK_SIM_LAYOUT requires COLSxROWS:CHAINxPARALLEL, tiles of at least 8×8, and a display of at most 512×512 and 65,536 pixels.');
  }
  return geometry;
}
