export const VISUAL_SETTINGS = 'visual:settings';
export const UPDATE_VISUAL_SETTINGS = 'visual:updateSettings';

export const clockFonts = {
  matrix: 'Matrix',
  studio: 'Studio',
  terminal: 'Terminal',
} as const;

export type ClockFont = keyof typeof clockFonts;

export interface VisualSettings {
  clock: { color: string; font: ClockFont };
  pulse: { color: string; intensity: number };
}

export type VisualSettingsUpdate =
  | ({ mode: 'clock' } & Partial<VisualSettings['clock']>)
  | ({ mode: 'pulse' } & Partial<VisualSettings['pulse']>);

export const defaultVisualSettings: VisualSettings = {
  clock: { color: '#ffad48', font: 'matrix' },
  pulse: { color: '#ffffff', intensity: 100 },
};

export function isClockFont(value: unknown): value is ClockFont {
  return typeof value === 'string' && Object.hasOwn(clockFonts, value);
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
    const intensity = 'intensity' in value && typeof value.intensity === 'number'
      && Number.isInteger(value.intensity) && value.intensity >= 0 && value.intensity <= 100
      ? value.intensity : settings.pulse.intensity;
    const next = { color: color ?? settings.pulse.color, intensity };
    if (next.color !== settings.pulse.color || next.intensity !== settings.pulse.intensity) return { ...settings, pulse: next };
  }

  return settings;
}
