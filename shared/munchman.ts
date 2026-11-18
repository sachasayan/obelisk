export const MUNCHMAN_CONTROLLER_PATH = '/controller/munchman';
export const MUNCHMAN_MOVE = 'munchman:move';

const directions = ['up', 'left', 'down', 'right'] as const;
export type MunchmanDirection = typeof directions[number];

export function isMunchmanDirection(value: unknown): value is MunchmanDirection {
  return directions.some((direction) => direction === value);
}
