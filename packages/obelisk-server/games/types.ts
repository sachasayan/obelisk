import type { FleetAction } from '../../../shared/fleet-strike';
import type { GameAction, GameStatus } from '../../../shared/games';
import type { ModeState } from '../panel/types';

export interface GameContext extends ModeState {
  occupied(seat: number): boolean;
}

interface RoundState {
  tick(now: number): boolean;
  draw(): void;
  status(seat: number | null): Pick<GameStatus, 'message' | 'scores' | 'fleet'>;
}

export interface GameRound extends RoundState {
  act(seat: number, action: Exclude<GameAction, 'restart'>, now: number): boolean;
}

export interface FleetRound extends RoundState {
  fleetAction(seat: number, action: FleetAction, now: number): boolean;
  leave(seat: number): void;
}

