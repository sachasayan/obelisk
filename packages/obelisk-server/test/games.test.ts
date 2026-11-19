import assert from 'node:assert/strict';
import { test } from 'node:test';
import { defaultVisualSettings } from '../../../shared/visual-settings';
import { fleetLengths, shipCells } from '../../../shared/fleet-strike';
import type { GameAction } from '../../../shared/games';
import { fleetImpactAt, fleetShotDuration } from '../games/fleet-scene';
import { fleetStrike } from '../games/fleet-strike';
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

test('Fleet Strike reveals only fired cells, alternates turns, and requires two rematch votes', () => {
  const battle = fleetStrike(board());
  const command = battle.fleetAction;
  const opponent = battle.status(1).fleet!;
  const navalCells = opponent.ships.flatMap((ship, index) => shipCells(ship, fleetLengths[index]));
  assert.equal(new Set(navalCells).size, 7);
  assert.equal(battle.status(null).fleet, undefined);
  assert.ok(battle.status(0).fleet!.targets.every((cell) => cell === 'water'));
  assert.equal(command(0, { type: 'place', ship: 0, bow: 35, vertical: false }, 0), false);
  command(0, { type: 'ready', ready: true }, 0);
  assert.equal(command(0, { type: 'shuffle' }, 0), false);
  assert.equal(command(0, { type: 'fire', cell: navalCells[0] }, 0), false);
  command(1, { type: 'ready', ready: true }, 0);
  assert.equal(command(1, { type: 'fire', cell: 0 }, 0), false);

  let now = 0;
  const misses = battle.status(0).fleet!.board.flatMap((cell, index) => cell === 'water' ? [index] : []);
  for (const [index, cell] of navalCells.entries()) {
    assert.equal(command(0, { type: 'fire', cell }, now), true);
    assert.equal(command(0, { type: 'fire', cell }, now), false);
    assert.equal(command(1, { type: 'fire', cell: misses[index] }, now), false);
    battle.tick(now + fleetImpactAt - 1);
    assert.equal(battle.status(0).fleet!.targets[cell], 'water');
    battle.tick(now + fleetImpactAt);
    assert.notEqual(battle.status(0).fleet!.targets[cell], 'water');
    assert.equal(battle.status(0).fleet!.phase, 'firing');
    now += fleetShotDuration;
    battle.tick(now);
    if (index < navalCells.length - 1) {
      assert.equal(command(1, { type: 'fire', cell: misses[index] }, now), true);
      now += fleetShotDuration;
      battle.tick(now);
      assert.equal(command(0, { type: 'fire', cell }, now), false);
    }
  }
  assert.equal(battle.status(0).fleet!.winner, 0);
  assert.deepEqual(battle.status(0).scores, [3, 0]);
  assert.ok(navalCells.every((cell) => battle.status(0).fleet!.targets[cell] === 'sunk'));
  command(0, { type: 'rematch' }, now);
  assert.equal(battle.status(0).fleet!.phase, 'over');
  command(1, { type: 'rematch' }, now);
  assert.equal(battle.status(0).fleet!.phase, 'setup');
  assert.equal(battle.status(0).fleet!.turn, 1);
  assert.deepEqual(battle.status(0).scores, [0, 0]);
});

