import { fleetMode } from '../../../shared/fleet-strike';
import type { FleetAction } from '../../../shared/fleet-strike';
import { games } from '../../../shared/games';
import type { GameAction, GameMode, GameStatus } from '../../../shared/games';
import type { ModeState } from '../panel/types';
import { fleetStrike } from './fleet-strike';
import { stackDuel } from './stack-duel';
import type { FleetRound, GameContext, GameRound } from './types';

const rounds = {
  'stack-duel': stackDuel, [fleetMode]: fleetStrike,
};

export function createGameSession(onChange: () => void) {
  const seats: (string | null)[] = [];
  let mode: GameMode | undefined;
  let round: GameRound | FleetRound | undefined;
  let context: GameContext | undefined;
  let timer: NodeJS.Timeout | undefined;
  let lastStatus = '';

  function notify() {
    const next = JSON.stringify([mode, seats, round?.status(0), round?.status(1), round?.status(null)]);
    if (next !== lastStatus) {
      lastStatus = next;
      onChange();
    }
  }

  function paint() {
    if (!round || !context) return;
    context.matrix.clear().bgColor(0);
    round.draw();
    context.matrix.sync();
    notify();
  }

  function stop() {
    clearInterval(timer);
    mode = undefined;
    round = undefined;
    context = undefined;
    seats.length = 0;
    notify();
  }

  function restart() {
    if (!mode || !context) return;
    round = rounds[mode](context);
    paint();
  }

  return {
    start(next: GameMode, state: ModeState, preserveSeats = false) {
      clearInterval(timer);
      if (!preserveSeats) {
        seats.length = 0;
        for (let i = 0; i < games[next].players; i++) seats.push(null);
      }

      mode = next;
      context = { ...state, occupied: (seat) => Boolean(seats[seat]) };
      restart();
      timer = setInterval(() => {
        if (round?.tick(performance.now())) paint();
      }, 40);
    },
    stop,
    join(next: GameMode, id: string) {
      if (mode !== next || seats.includes(id)) return;
      const available = seats.indexOf(null);
      if (available === -1) return;
      seats[available] = id;
      paint();
    },
    leave(id: string, from?: GameMode) {
      const seat = seats.indexOf(id);
      if (seat === -1 || (from && from !== mode)) return;
      seats[seat] = null;
      if (round && 'leave' in round) round.leave(seat);
      paint();
    },
    input(next: GameMode, id: string, action: GameAction) {
      const seat = seats.indexOf(id);
      if (mode !== next || !round || seat === -1 || !('act' in round)) return;
      if (action === 'restart') restart();
      else if (round.act(seat, action, performance.now())) paint();
    },
    fleetInput(id: string, action: FleetAction) {
      const seat = seats.indexOf(id);
      if (seat >= 0 && round && 'fleetAction' in round && round.fleetAction(seat, action, performance.now())) paint();
    },
    status(id: string): GameStatus | null {
      if (!mode || !round) return null;
      const index = seats.indexOf(id);
      const seat = index < 0 ? null : index;
      return { mode, seat, players: seats.filter(Boolean).length, ...round.status(seat) };
    },
  };
}
