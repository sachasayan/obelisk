import { drawBoards, seatColors } from './board';
import type { Point } from './board';
import type { GameContext, GameRound } from './types';

const size = 6;
const targets = 4;
const cells = Array.from({ length: size * size }, (_, i) => ({ x: i % size, y: Math.floor(i / size) }));
const offsets = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const range = [0, 0xd6915c, 0xa2607e, 0x694d7d, 0x425479, 0x35556f, 0x29465d];

function index({ x, y }: Point) { return y * size + x; }
function distance(a: Point, b: Point) { return Math.abs(a.x - b.x) + Math.abs(a.y - b.y); }

export function deepScan(context: GameContext): GameRound {
  const searchers = seatColors.map(() => {
    const beacons = new Set<number>();
    while (beacons.size < targets) beacons.add(Math.floor(Math.random() * cells.length));
    return {
      beacons,
      cursor: { x: 2, y: 2 },
      readings: new Map<number, number>(),
      candidates: new Set(cells.map(index)),
      hits: 0,
      result: '',
    };
  });
  let turn = 0;
  let winner: number | null = null;
  let scanAt = 0;

  function probe(seat: number, cell: number, now: number) {
    const radar = searchers[seat];
    if (radar.readings.has(cell)) {
      radar.result = 'Already probed · choose another cell';
      return;
    }
    const nearest = Math.min(...[...radar.beacons].map((beacon) => distance(cells[cell], cells[beacon])));
    radar.readings.set(cell, nearest);
    radar.candidates.delete(cell);
    for (const candidate of radar.candidates) {
      if (distance(cells[cell], cells[candidate]) < nearest) radar.candidates.delete(candidate);
    }
    if (nearest === 0) radar.hits++;
    radar.result = nearest === 0 ? 'Beacon found' : `Nearest beacon is ${nearest} ${nearest === 1 ? 'cell' : 'cells'} away`;
    if (radar.hits === targets) winner = seat;
    else turn = 1 - seat;
    scanAt = now + 650;
  }

  return {
    act(seat, action, now) {
      if (winner !== null || turn !== seat) return false;
      const radar = searchers[seat];
      if (action === 'action') probe(seat, index(radar.cursor), now);
      else {
        const [dx, dy] = offsets[action];
        radar.cursor.x = Math.max(0, Math.min(size - 1, radar.cursor.x + dx));
        radar.cursor.y = Math.max(0, Math.min(size - 1, radar.cursor.y + dy));
      }
      return true;
    },
    tick(now) {
      if (winner !== null || context.occupied(turn) || (!context.occupied(0) && !context.occupied(1)) || now < scanAt) return false;
      const radar = searchers[turn];
      const choices = [...radar.candidates];
      const cell = choices[Math.floor(Math.random() * choices.length)];
      if (cell === undefined) return false;
      radar.cursor = { ...cells[cell] };
      probe(turn, cell, now);
      return true;
    },
    draw() {
      drawBoards(context, size, size, 2, winner ?? turn, (board, seat) => {
        const radar = searchers[seat];
        board.surround(seat === (winner ?? turn) ? seatColors[seat] : 0x294650);
        for (const cell of cells) {
          const reading = radar.readings.get(index(cell));
          const color = reading === undefined ? ((cell.x + cell.y) % 2 ? 0x123243 : 0x194454)
            : reading === 0 ? seatColors[seat] : range[Math.min(reading, range.length - 1)];
          board.cell(cell.x, cell.y, color);
        }
        if (winner === null && turn === seat) board.cell(radar.cursor.x, radar.cursor.y, 0xe7f7ff);
      });
    },
    status(seat) {
      const note = seat === null ? '' : searchers[seat].result;
      const rival = context.occupied(turn) ? `Player ${turn + 1}` : 'Computer';
      const message = winner !== null ? (context.occupied(winner) ? `Player ${winner + 1} wins` : 'Computer wins')
        : turn === seat ? [note, 'Your turn'].filter(Boolean).join(' · ')
        : [note, `${rival} is probing`].filter(Boolean).join(' · ');
      return { message, scores: searchers.map(({ hits }) => hits) };
    },
  };
}
