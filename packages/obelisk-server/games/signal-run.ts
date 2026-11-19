import { drawBoards, gameCaption } from './board';
import type { GameContext, GameRound } from './types';

const shipColor = 0x8affdb;
const gateColor = 0xd95679;
const phaseColor = 0xe3caff;

export function signalRun(context: GameContext): GameRound {
  const width = context.matrix.width();
  const height = context.matrix.height();
  const columns = Math.min(width, width >= height * 2 ? 28 : 16);
  const rows = Math.min(height, 14);
  const gap = Math.max(3, Math.floor(rows * .39));
  const gates: { x: number; gapY: number; passed: boolean }[] = [];
  const ship = { x: Math.floor(columns / 4), y: Math.floor(rows / 2) };
  let started = false;
  let crashed = false;
  let score = 0;
  let charges = 2;
  let phaseUntil = 0;
  let advanceAt = 0;

  function gate(x: number) {
    const last = gates.at(-1)?.gapY ?? Math.round((rows - gap) / 2);
    const next = last + Math.floor(Math.random() * 7) - 3;
    gates.push({ x, gapY: Math.max(0, Math.min(rows - gap, next)), passed: false });
  }

  gate(columns - 1);

  function advance(now: number) {
    const spacing = Math.max(4, Math.floor(columns * .38));
    if (gates.at(-1)?.x <= columns - spacing) gate(columns);
    for (const obstacle of gates) {
      obstacle.x--;
      if (!obstacle.passed && obstacle.x < ship.x) {
        obstacle.passed = true;
        score++;
        if (score % 3 === 0) charges = Math.min(2, charges + 1);
      }
    }
    if (gates[0]?.x < 0) gates.shift();
    advanceAt = now + Math.max(85, 250 - score * 5);
  }

  function collide(now: number) {
    if (now < phaseUntil) return;
    crashed = gates.some(({ x, gapY }) => x === ship.x && (ship.y < gapY || ship.y >= gapY + gap));
  }

  return {
    act(_seat, action, now) {
      if (crashed) return false;
      if (!started) advanceAt = now + 800;
      started = true;
      if (action === 'action' && charges > 0 && now >= phaseUntil) {
        phaseUntil = now + 850;
        charges--;
      }
      if (action === 'up') ship.y = Math.max(0, ship.y - 1);
      if (action === 'down') ship.y = Math.min(rows - 1, ship.y + 1);
      if (action === 'left') ship.x = Math.max(1, ship.x - 1);
      if (action === 'right') ship.x = Math.min(Math.floor(columns / 2), ship.x + 1);
      collide(now);
      return true;
    },
    tick(now) {
      if (!started || crashed || !context.occupied(0)) return false;
      if (phaseUntil && now >= phaseUntil) {
        phaseUntil = 0;
        collide(now);
        return true;
      }
      if (now < advanceAt) return false;
      advance(now);
      collide(now);
      return true;
    },
    draw() {
      const footprint = drawBoards(context, columns, rows, 1, 0, (board) => {
        board.surround(0x244450);
        for (let x = 0; x < columns; x += 2) {
          board.cell(x, 0, 0x213140);
          board.cell(x, rows - 1, 0x213140);
        }
        for (const { x, gapY } of gates) {
          for (let y = 0; y < rows; y++) {
            const inside = y >= gapY && y < gapY + gap;
            if (!inside || y === gapY || y === gapY + gap - 1) board.cell(x, y, inside ? 0x166853 : gateColor);
          }
        }
        const color = crashed ? 0xff533f : phaseUntil ? phaseColor : shipColor;
        board.cell(ship.x - 1, ship.y, 0x167e78);
        if (rows > 9) {
          board.cell(ship.x - 1, ship.y - 1, 0x25898d);
          board.cell(ship.x - 1, ship.y + 1, 0x25898d);
        }
        board.cell(ship.x, ship.y, color);
      });
      gameCaption(context, `GATES ${score}`, `PHASE ${charges}`, footprint, shipColor);
    },
    status() {
      const message = crashed ? 'Signal lost · restart to retry'
        : started ? `${charges} phase ${charges === 1 ? 'charge' : 'charges'}`
        : 'Move to start the run';
      return { message, scores: [score] };
    },
  };
}
