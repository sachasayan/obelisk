import type { ModeState } from '../panel/types';
import { createModeTimers } from '../panel/mode-timers';
import { LightCycle } from './lightcycles.types';
import { getAdjacent } from './lightcycles.utils';

const timers = createModeTimers();

function init({ matrix }: ModeState) {
  const width = matrix.width();
  const height = matrix.height();
  const trailLength = Math.max(5, Math.min(64, Math.round(20 * Math.sqrt(width * height / 2048))));
  let players: LightCycle[];

  function paint() {
    matrix.clear();
    for (const player of players) {
      matrix.fgColor(player.color);
      for (const { x, y } of player.coords) matrix.setPixel(x, y);
    }
    matrix.sync();
  }

  function reset() {
    const midX = Math.floor(width / 2);
    const midY = Math.floor(height / 2);
    players = [
      new LightCycle(0xdf740c, { x: midX - 2, y: midY - 1 }, -1, 0),
      new LightCycle(0xffe64d, { x: midX - 2, y: midY }, -1, 0),
      new LightCycle(0xe6ffff, { x: midX, y: midY - 1 }, 1, 0),
      new LightCycle(0x6fc3df, { x: midX, y: midY }, 1, 0),
    ];
    for (const player of players) player.maxLength = trailLength;
    paint();
    timers.schedule(tick, 500);
  }

  function tick() {
    const index = (x: number, y: number) => y * width + x;
    const occupied = new Set(players.flatMap((player) => player.coords.map(({ x, y }) => index(x, y))));
    const votes = new Map<number, number>();

    const moves = players.filter((player) => player.status === 'alive').map((player) => {
      const [{ x, y }] = player.coords;
      const candidates = getAdjacent(x, y, matrix).filter((next) => !occupied.has(index(next.x, next.y)));
      const straight = candidates.find((next) => next.x === x + player.intent.x && next.y === y + player.intent.y);
      const next = straight && Math.random() > .01 ? straight : candidates[Math.floor(Math.random() * candidates.length)];
      if (next) {
        const cell = index(next.x, next.y);
        votes.set(cell, (votes.get(cell) ?? 0) + 1);
      }
      return { player, x, y, next };
    });

    for (const { player, x, y, next } of moves) {
      if (!next || votes.get(index(next.x, next.y)) !== 1) {
        player.status = 'dead';
      } else {
        player.intent = { x: next.x - x, y: next.y - y };
        player.step();
      }
    }

    paint();
    if (players.some((player) => player.status === 'alive')) timers.schedule(tick, 50);
    else timers.schedule(reset, 1100);
  }

  reset();
}

export const Lightcycles = { init, deactivate: () => timers.clear() };
