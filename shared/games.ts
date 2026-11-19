export const games = {
  'stack-duel': {
    title: 'Stack Duel', players: 2, action: 'Drop',
    instructions: 'Move with left and right. Up rotates, down lowers, and Drop locks the piece. Clear multiple rows to send pressure to a rival.',
  },
  'deep-scan': {
    title: 'Deep Scan', players: 2, action: 'Probe',
    instructions: 'Move the cursor and probe for four hidden beacons. A missed probe gives the distance to the nearest beacon. Find all four before your rival.',
  },
  'signal-run': {
    title: 'Signal Run', players: 1, action: 'Phase',
    instructions: 'Steer through the gaps in the incoming gates. Phase lets you pass through a gate, and every third gate restores a charge.',
  },
  'echo-keys': {
    title: 'Echo Keys', players: 1, action: 'Start',
    instructions: 'Watch the directions flash, then enter the sequence in order. A correct round adds another direction.',
  },
} as const;

export type GameMode = keyof typeof games;
export const gameDirections = ['up', 'right', 'down', 'left'] as const;
export type GameDirection = typeof gameDirections[number];
export type GameAction = GameDirection | 'action' | 'restart';

export const GAME_JOIN = 'game:join';
export const GAME_LEAVE = 'game:leave';
export const GAME_INPUT = 'game:input';
export const GAME_STATUS = 'game:status';

export interface GameStatus {
  mode: GameMode;
  seat: number | null;
  players: number;
  message: string;
  scores: number[];
}

export function isGameMode(value: unknown): value is GameMode {
  return typeof value === 'string' && Object.hasOwn(games, value);
}

export function isGameAction(value: unknown): value is GameAction {
  return value === 'action' || value === 'restart' || gameDirections.some((direction) => direction === value);
}
