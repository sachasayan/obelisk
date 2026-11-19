export const fleetSize = 6;
export const fleetLengths = [3, 2, 2] as const;
export const fleetMode = 'fleet-strike';

export type FleetSeat = 0 | 1;
export type FleetShip = { bow: number; vertical: boolean };
export type FleetCell = 'water' | 'ship' | 'miss' | 'hit' | 'sunk';
export type FleetResult = 'miss' | 'hit' | 'sunk';
export type FleetShot = { cell: number; seat: FleetSeat; result: FleetResult };
export type FleetAction =
  | { type: 'shuffle' | 'rematch' }
  | { type: 'ready'; ready: boolean }
  | { type: 'place'; ship: number; bow: number; vertical: boolean }
  | { type: 'fire'; cell: number };

export interface FleetStatus {
  phase: 'setup' | 'aim' | 'firing' | 'over';
  board: FleetCell[];
  targets: Exclude<FleetCell, 'ship'>[];
  ships: FleetShip[];
  ready: boolean;
  turn: FleetSeat;
  winner: FleetSeat | null;
  lastShot: FleetShot | null;
}

function isCell(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value < fleetSize ** 2;
}

export function isFleetAction(value: unknown): value is FleetAction {
  if (!value || typeof value !== 'object' || !('type' in value)) return false;
  switch (value.type) {
    case 'shuffle': case 'rematch': return true;
    case 'ready': return 'ready' in value && typeof value.ready === 'boolean';
    case 'fire': return 'cell' in value && isCell(value.cell);
    case 'place':
      return 'ship' in value && typeof value.ship === 'number' && Number.isInteger(value.ship)
        && value.ship >= 0 && value.ship < fleetLengths.length
        && 'bow' in value && isCell(value.bow) && 'vertical' in value && typeof value.vertical === 'boolean';
    default: return false;
  }
}

export function fleetCoordinate(cell: number) {
  return `${String.fromCharCode(65 + Math.floor(cell / fleetSize))}${cell % fleetSize + 1}`;
}

export function shipCells(ship: FleetShip, length: number) {
  const { bow, vertical } = ship;
  const offset = vertical ? Math.floor(bow / fleetSize) : bow % fleetSize;
  if (offset + length > fleetSize) return [];
  return Array.from({ length }, (_, index) => bow + index * (vertical ? fleetSize : 1));
}

export function canPlaceShip(ships: readonly FleetShip[], index: number, ship: FleetShip) {
  const cells = shipCells(ship, fleetLengths[index]);
  return cells.length > 0 && !ships.some((other, i) => i !== index
    && shipCells(other, fleetLengths[i]).some((cell) => cells.includes(cell)));
}
