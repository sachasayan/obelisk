import { fleetMode } from './fleet-strike';
import type { FleetStatus } from './fleet-strike';

export const games = {
  'stack-duel': {
    title: 'Stack Duel', players: 2, action: 'Drop',
    instructions: 'Move with left and right. Up rotates, down lowers, and Drop locks the piece. Clear multiple rows to send pressure to a rival.',
  },
  [fleetMode]: {
    title: 'Fleet Strike', players: 2, action: 'Fire',
    instructions: 'Arrange three ships and lock your fleet. Take turns firing at hidden ships. The wall shows each shot.',
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
  fleet?: FleetStatus;
}

export function isGameMode(value: unknown): value is GameMode {
  return typeof value === 'string' && Object.hasOwn(games, value);
}

export function isGameAction(value: unknown): value is GameAction {
  return value === 'action' || value === 'restart' || gameDirections.some((direction) => direction === value);
}
