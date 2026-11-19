import assert from 'node:assert/strict';
import { test } from 'node:test';
import { defaultVisualSettings } from '../../../shared/visual-settings';
import type { GameAction } from '../../../shared/games';
import { deepScan } from '../games/deep-scan';
import { echoKeys } from '../games/echo-keys';
import { signalRun } from '../games/signal-run';
import { stackDuel } from '../games/stack-duel';
import type { GameContext, GameRound } from '../games/types';
import { VirtualMatrix } from '../panel/virtual-matrix';

function board(): GameContext {
  return {
    matrix: new VirtualMatrix({ width: 32, height: 16, tileWidth: 32, tileHeight: 16 }, 100, () => {}),
    occupied: () => true,
    playerData: [],
    loadFont() { throw new Error('This test does not draw text'); },
    visualSettings: () => defaultVisualSettings,
  };
}

function play(round: GameRound, seat: number, ...actions: Exclude<GameAction, 'restart'>[]) {
  for (const action of actions) round.act(seat, action, 0);
}

test('Stack Duel clears a complete row made of rotated and dropped pieces', (t) => {
  t.mock.method(Math, 'random', () => .99);
  const duel = stackDuel(board());
  play(duel, 0, 'left', 'left', 'action');
  play(duel, 0, 'right', 'action');
  play(duel, 0, 'up', 'right', 'right', 'action');
  assert.deepEqual(duel.status(0).scores, [100, 0]);
});

test('Deep Scan enforces turns and wins on the fourth beacon', (t) => {
  const placement = [.00, .03, .06, .09, .25, .28, .31, .34];
  t.mock.method(Math, 'random', () => placement.shift() ?? .5);
  const scan = deepScan(board());
  assert.equal(scan.act(1, 'action', 0), false);
  play(scan, 0, 'up', 'up', 'left', 'left', 'action');
  play(scan, 1, 'action');
  play(scan, 0, 'right', 'action');
  play(scan, 1, 'right', 'action');
  play(scan, 0, 'right', 'action');
  play(scan, 1, 'right', 'action');
  play(scan, 0, 'right', 'action');
  assert.equal(scan.status(0).scores[0], 4);
  assert.equal(scan.status(0).message, 'Player 1 wins');
  assert.equal(scan.act(0, 'action', 0), false);
});

test('Signal Run awards gates cleared and restores a spent phase charge', (t) => {
  t.mock.method(Math, 'random', () => .5);
  const run = signalRun(board());
  play(run, 0, 'action');
  assert.match(run.status(0).message, /1 phase charge/);
  for (let now = 40; now < 15_000; now += 40) run.tick(now);
  assert.ok(run.status(0).scores[0] >= 3);
  assert.equal(run.status(0).message, '2 phase charges');
});

test('Echo Keys grows a correctly repeated sequence and ends on a mismatched direction', (t) => {
  t.mock.method(Math, 'random', () => 0);
  const echo = echoKeys(board());
  play(echo, 0, 'action');
  assert.equal(echo.act(0, 'up', 100), false);
  for (const now of [240, 800, 990]) echo.tick(now);
  echo.act(0, 'up', 1000);
  assert.deepEqual(echo.status(0).scores, [1]);
  for (const now of [1740, 1980, 2518, 2708, 3246, 3436]) echo.tick(now);
  assert.equal(echo.status(0).message, 'Repeat the sequence · 0/2');
  echo.act(0, 'left', 3500);
  assert.match(echo.status(0).message, /Sequence missed/);
});
