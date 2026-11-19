import { games, isGameMode } from './games';

export const modeGroups = [
  {
    title: 'Visuals',
    modes: [
      ['billboard', 'Billboard'],
      ['clock', 'Clock'],
      ['lava-lamp', 'Lava Lamp'],
      ['pulse', 'Pulse'],
      ['space', 'Starry Night'],
      ['sunlight', 'Sunlight'],
    ],
  },
  {
    title: 'Games',
    modes: [
      ['lightcycles', 'Lightcycles'],
      ['pong', 'Pong'],
      ...Object.keys(games).filter(isGameMode).map((mode) => [mode, games[mode].title] as const),
    ],
  },
] as const;

export type ModeName = (typeof modeGroups)[number]['modes'][number][0] | 'exit';

export const controllerPaths = {
  pong: '/controller',
  'stack-duel': '/controller/stack-duel',
  'deep-scan': '/controller/deep-scan',
  'signal-run': '/controller/signal-run',
  'echo-keys': '/controller/echo-keys',
  pulse: '/controller/pulse',
  clock: '/controller/clock',
  'lava-lamp': '/controller/lava-lamp',
} as const;

export function controllerPath(mode: unknown) {
  if (typeof mode === 'string' && Object.hasOwn(controllerPaths, mode)) {
    return controllerPaths[mode as keyof typeof controllerPaths];
  }
}

const modeLabels = new Map<ModeName, string>([
  ...modeGroups.flatMap(({ modes }) => [...modes]),
  ['exit', 'Display off'],
]);

export function modeLabel(value: string) {
  return modeLabels.get(value as ModeName) ?? (value === 'test' ? 'Calibration' : value);
}

export function findMode(value: string) {
  const key = value.toLowerCase();
  if (key === 'starry-night' || key === 'starry night') return 'space';
  const mode = key as ModeName;
  return modeLabels.has(mode) ? mode : undefined;
}
