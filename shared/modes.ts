export const modeGroups = [
  {
    title: 'Visuals',
    modes: [
      ['billboard', 'Billboard'],
      ['clock', 'Clock'],
      ['pulse', 'Pulse'],
      ['space', 'Space'],
      ['sunlight', 'Sunlight'],
      ['test', 'Test'],
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

const modeNames: readonly ModeName[] = [
  ...modeGroups.flatMap(({ modes }) => [...modes].map(([name]) => name)),
  'exit',
];

export function findMode(value: string) {
  return modeNames.find((name) => name === value.toLowerCase());
}
