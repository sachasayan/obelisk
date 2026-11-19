export const VISUAL_SETTINGS = 'visual:settings';
export const UPDATE_VISUAL_SETTINGS = 'visual:updateSettings';

export const clockFonts = {
  matrix: 'Matrix',
  studio: 'Studio',
  terminal: 'Terminal',
} as const;

export type ClockFont = keyof typeof clockFonts;

export const lavaPalettes = {
  magma: { label: 'Magma', colors: [0x090307, 0x44091d, 0xe62b2f, 0xff742b, 0xffd277] },
  orchid: { label: 'Orchid', colors: [0x080518, 0x381068, 0x8626d2, 0xf251b8, 0xffa3df] },
  lagoon: { label: 'Lagoon', colors: [0x010b17, 0x08346d, 0x167dd4, 0x05d3bd, 0xa4ffdf] },
  citrus: { label: 'Citrus', colors: [0x061104, 0x21440c, 0x60a221, 0xd4e743, 0xfff390] },
} as const;

export const maxLavaSpeed = 200;
export const minLavaBlobs = 2;
export const maxLavaBlobs = 8;
export type LavaPalette = keyof typeof lavaPalettes;

export interface VisualSettings {
  clock: { color: string; font: ClockFont };
  pulse: { color: string; intensity: number };
  'lava-lamp': { palette: LavaPalette; speed: number; blobs: number };
}

export type VisualSettingsUpdate =
  | ({ mode: 'clock' } & Partial<VisualSettings['clock']>)
  | ({ mode: 'pulse' } & Partial<VisualSettings['pulse']>)
  | ({ mode: 'lava-lamp' } & Partial<VisualSettings['lava-lamp']>);

export const defaultVisualSettings: VisualSettings = {
  clock: { color: '#ffad48', font: 'matrix' },
  pulse: { color: '#ffffff', intensity: 100 },
  'lava-lamp': { palette: 'magma', speed: 100, blobs: 5 },
};

export function isClockFont(value: unknown): value is ClockFont {
  return typeof value === 'string' && Object.hasOwn(clockFonts, value);
}

export function isLavaPalette(value: unknown): value is LavaPalette {
  return typeof value === 'string' && Object.hasOwn(lavaPalettes, value);
}

function isIntegerBetween(value: unknown, min: number, max: number): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max;
}

export function applyVisualSettings(settings: VisualSettings, value: unknown): VisualSettings {
  if (!value || typeof value !== 'object' || !('mode' in value)) return settings;
  const color = 'color' in value && typeof value.color === 'string' && /^#[\da-f]{6}$/i.test(value.color)
    ? value.color.toLowerCase() : undefined;

  if (value.mode === 'clock') {
    const font = 'font' in value && isClockFont(value.font) ? value.font : settings.clock.font;
    const next = { color: color ?? settings.clock.color, font };
    if (next.color !== settings.clock.color || next.font !== settings.clock.font) return { ...settings, clock: next };
  }

  if (value.mode === 'pulse') {
    const intensity = 'intensity' in value && isIntegerBetween(value.intensity, 0, 100)
      ? value.intensity : settings.pulse.intensity;
    const next = { color: color ?? settings.pulse.color, intensity };
    if (next.color !== settings.pulse.color || next.intensity !== settings.pulse.intensity) return { ...settings, pulse: next };
  }

  if (value.mode === 'lava-lamp') {
    const lava = settings['lava-lamp'];
    const palette = 'palette' in value && isLavaPalette(value.palette) ? value.palette : lava.palette;
    const speed = 'speed' in value && isIntegerBetween(value.speed, 0, maxLavaSpeed) ? value.speed : lava.speed;
    const blobs = 'blobs' in value && isIntegerBetween(value.blobs, minLavaBlobs, maxLavaBlobs) ? value.blobs : lava.blobs;
    if (palette !== lava.palette || speed !== lava.speed || blobs !== lava.blobs) {
      return { ...settings, 'lava-lamp': { palette, speed, blobs } };
    }
  }

  return settings;
}
