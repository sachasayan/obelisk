import { canPlaceShip, fleetCoordinate, fleetLengths, fleetSize, shipCells } from '../../../shared/fleet-strike';
import type { FleetCell, FleetSeat, FleetShip, FleetShot, FleetStatus } from '../../../shared/fleet-strike';
import { drawFleetScene, fleetImpactAt, fleetShotDuration } from './fleet-scene';
import type { FleetRound, GameContext } from './types';

function other(seat: FleetSeat): FleetSeat { return seat === 0 ? 1 : 0; }

function dealFleet() {
  const ships: FleetShip[] = [];
  for (let ship = 0; ship < fleetLengths.length; ship++) {
    const placements: FleetShip[] = [];
    for (let bow = 0; bow < fleetSize ** 2; bow++) {
      for (const vertical of [false, true]) {
        if (canPlaceShip(ships, ship, { bow, vertical })) placements.push({ bow, vertical });
      }
    }
    ships.push(placements[Math.floor(Math.random() * placements.length)]);
  }
  return { ships, incoming: new Set<number>(), ready: false };
}

export function fleetStrike(context: GameContext): FleetRound {
  let fleets = [dealFleet(), dealFleet()];
  let phase: FleetStatus['phase'] = 'setup';
  let openingSeat: FleetSeat = 0;
  let turn: FleetSeat = openingSeat;
  let winner: FleetSeat | null = null;
  let lastShot: FleetShot | null = null;
  let salvo: { started: number; cell: number; elapsed: number; miss: boolean } | null = null;

  function layout(seat: FleetSeat) {
    return fleets[seat].ships.map((ship, index) => shipCells(ship, fleetLengths[index]));
  }

  function isSunk(seat: FleetSeat, cells: number[]) {
    return cells.every((cell) => fleets[seat].incoming.has(cell));
  }

  function scores() {
    return ([0, 1] as const).map((seat) => layout(other(seat)).filter((cells) => isSunk(other(seat), cells)).length);
  }

  function fogBoard(seat: FleetSeat, own: false): FleetStatus['targets'];
  function fogBoard(seat: FleetSeat, own: true): FleetStatus['board'];
  function fogBoard(seat: FleetSeat, own: boolean): FleetCell[] {
    const ships = layout(seat);
    const shots = fleets[seat].incoming;
    const board = Array<FleetCell>(fleetSize ** 2).fill('water');
    for (const cell of shots) board[cell] = 'miss';
    for (const cells of ships) {
      const sunk = isSunk(seat, cells);
      for (const cell of cells) {
        if (shots.has(cell)) board[cell] = sunk ? 'sunk' : 'hit';
        else if (own) board[cell] = 'ship';
      }
    }
    return board;
  }

  function reveal(cell: number) {
    const defender = other(turn);
    fleets[defender].incoming.add(cell);
    const struck = layout(defender).find((cells) => cells.includes(cell));
    lastShot = { seat: turn, cell, result: struck ? (isSunk(defender, struck) ? 'sunk' : 'hit') : 'miss' };
  }

  function message(seat: FleetSeat | null) {
    if (phase === 'setup') {
      if (seat === null) return 'Fleet setup';
      if (!context.occupied(other(seat))) return 'Waiting for a second remote';
      return fleets[seat].ready ? 'Fleet locked · waiting for your rival' : 'Arrange and lock your fleet';
    }
    if (phase === 'over') return seat === null ? `Player ${winner! + 1} wins` : winner === seat ? 'Victory' : 'Fleet lost';
    if (phase === 'firing') return `Player ${turn + 1} fired`;
    return turn === seat ? 'Your turn' : `Player ${turn + 1} is targeting`;
  }

  return {
    fleetAction(seat, action, now) {
      if (seat !== 0 && seat !== 1) return false;
      const fleet = fleets[seat];
      switch (action.type) {
        case 'place': {
          if (phase !== 'setup' || fleet.ready) return false;
          const ship = { bow: action.bow, vertical: action.vertical };
          if (!canPlaceShip(fleet.ships, action.ship, ship)) return false;
          fleet.ships[action.ship] = ship;
          return true;
        }
        case 'shuffle':
          if (phase !== 'setup' || fleet.ready) return false;
          fleets[seat] = dealFleet();
          return true;
        case 'ready':
          if (phase !== 'setup') return false;
          fleet.ready = action.ready;
          if (context.occupied(0) && context.occupied(1) && fleets.every(({ ready }) => ready)) phase = 'aim';
          return true;
        case 'fire':
          if (phase !== 'aim' || seat !== turn || fleets[other(seat)].incoming.has(action.cell)) return false;
          phase = 'firing';
          lastShot = null;
          const miss = !layout(other(seat)).some((cells) => cells.includes(action.cell));
          salvo = { started: now, cell: action.cell, elapsed: 0, miss };
          return true;
        case 'rematch':
          if (phase !== 'over' || fleet.ready) return false;
          fleet.ready = true;
          if (fleets.every(({ ready }) => ready)) {
            fleets = [dealFleet(), dealFleet()];
            openingSeat = other(openingSeat);
            turn = openingSeat;
            winner = lastShot = null;
            phase = 'setup';
          }
          return true;
      }
    },
    leave(seat) {
      if (phase === 'setup') {
        fleets[seat] = dealFleet();
        return;
      }
      fleets = [dealFleet(), dealFleet()];
      openingSeat = turn = 0;
      winner = lastShot = salvo = null;
      phase = 'setup';
    },
    tick(now) {
      if (!salvo) return false;
      salvo.elapsed = now - salvo.started;
      if (!lastShot && salvo.elapsed >= fleetImpactAt) {
        reveal(salvo.cell);
      }
      if (salvo.elapsed >= fleetShotDuration) {
        salvo = null;
        const defender = other(turn);
        if (layout(defender).every((cells) => isSunk(defender, cells))) {
          winner = turn;
          phase = 'over';
          fleets.forEach((fleet) => { fleet.ready = false; });
        } else {
          turn = defender;
          phase = 'aim';
        }
      }
      return true;
    },
    draw() {
      drawFleetScene(context, { phase, turn, winner, lastShot, elapsed: salvo?.elapsed ?? 0, miss: salvo?.miss ?? false });
    },
    status(seat) {
      const fleetSeat = seat === 0 || seat === 1 ? seat : null;
      const status = { message: message(fleetSeat), scores: scores() };
      if (fleetSeat === null) return status;
      return { ...status, fleet: {
        phase, turn, winner, lastShot, ready: fleets[fleetSeat].ready,
        board: fogBoard(fleetSeat, true), targets: fogBoard(other(fleetSeat), false),
        ships: fleets[fleetSeat].ships.map((ship) => ({ ...ship })),
      } };
    },
  };
}
