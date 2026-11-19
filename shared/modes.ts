import { games, isGameMode } from './games';

export const modeGroups = [
  {
    title: 'Visuals',
    modes: [
      ['billboard', 'Billboard'],
      ['clock', 'Clock'],
      ['pulse', 'Pulse'],
      ['space', 'Space'],
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
} as const;

export function controllerPath(mode: unknown) {
  if (typeof mode === 'string' && Object.hasOwn(controllerPaths, mode)) {
    return controllerPaths[mode as keyof typeof controllerPaths];
  }
}

const modeNames: readonly ModeName[] = [
  ...modeGroups.flatMap(({ modes }) => [...modes].map(([name]) => name)),
  'exit',
];

export function findMode(value: string) {
  return modeNames.find((name) => name === value.toLowerCase());
}
