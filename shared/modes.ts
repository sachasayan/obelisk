import { MUNCHMAN_CONTROLLER_PATH } from './munchman';

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
      ['munchman', 'Munchman'],
      ['pong', 'Pong'],
    ],
  },
] as const;

export type ModeName = (typeof modeGroups)[number]['modes'][number][0] | 'exit';

export const controllerPaths = {
  pong: '/controller',
  munchman: MUNCHMAN_CONTROLLER_PATH,
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
