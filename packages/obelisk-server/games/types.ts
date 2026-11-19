import type { GameAction } from '../../../shared/games';
import type { ModeState } from '../panel/types';

export interface GameContext extends ModeState {
  occupied(seat: number): boolean;
}

export interface GameRound {
  act(seat: number, action: Exclude<GameAction, 'restart'>, now: number): boolean;
  tick(now: number): boolean;
  draw(): void;
  status(seat: number | null): { message: string; scores: number[] };
}
