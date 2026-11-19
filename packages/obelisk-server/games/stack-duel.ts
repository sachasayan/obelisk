import { drawBoards, quietCell, seatColors } from './board';
import type { GameContext, GameRound } from './types';

const pieces = [
  { color: 0x4bdadd, cells: [[0, 0], [1, 0], [2, 0]] },
  { color: 0xffad52, cells: [[0, 0], [0, 1], [1, 1]] },
  { color: 0xaa82f1, cells: [[0, 0], [1, 0], [2, 0], [1, 1]] },
  { color: 0xf46d9f, cells: [[0, 0], [1, 0], [1, 1], [2, 1]] },
  { color: 0x75df78, cells: [[0, 0], [1, 0], [0, 1], [1, 1]] },
  { color: 0x648af5, cells: [[0, 0], [0, 1], [0, 2], [1, 2]] },
];

export function stackDuel(context: GameContext): GameRound {
  const { matrix, occupied } = context;
  const columns = 6;
  const rows = Math.min(14, matrix.height());
  const bag: number[] = [];
  let winner: number | null = null;
  let focused = 0;

  function row() { return Array<number>(columns).fill(0); }

  function nextPiece(index: number) {
    if (index === bag.length) {
      const batch = pieces.map((_, i) => i);
      for (let i = batch.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [batch[i], batch[j]] = [batch[j], batch[i]];
      }
      bag.push(...batch);
    }
    return pieces[bag[index]];
  }

  const wells = Array.from({ length: 2 }, () => ({
    cells: Array.from({ length: rows }, row),
    piece: nextPiece(0), shape: nextPiece(0).cells, x: 2, y: 0, next: 1,
    score: 0, pressure: 0, fallAt: 0, lost: false,
  }));
  type Well = typeof wells[number];

  function fits(well: Well, shape: number[][], x: number, y: number) {
    return shape.every(([dx, dy]) => x + dx >= 0 && x + dx < columns && y + dy < rows
      && !well.cells[y + dy]?.[x + dx]);
  }

  function lock(seat: number, now: number) {
    const well = wells[seat];
    for (const [dx, dy] of well.shape) well.cells[well.y + dy][well.x + dx] = well.piece.color;
    const kept = well.cells.filter((line) => line.some((value) => value === 0));
    const cleared = rows - kept.length;
    well.score += 100 * cleared ** 2;
    well.cells = [...Array.from({ length: cleared }, row), ...kept];
    const rival = 1 - seat;
    if (cleared > 1 && occupied(rival)) wells[rival].pressure += cleared - 1;

    while (well.pressure > 0 && !well.lost) {
      well.lost = well.cells.shift().some(Boolean);
      const incoming = Array<number>(columns).fill(0x546275);
      incoming[Math.floor(Math.random() * columns)] = 0;
      well.cells.push(incoming);
      well.pressure--;
    }

    well.piece = nextPiece(well.next++);
    well.shape = well.piece.cells;
    well.x = 2;
    well.y = 0;
    well.fallAt = now + Math.max(240, 720 - well.score / 8);
    well.lost ||= !fits(well, well.shape, well.x, well.y);
    if (well.lost && occupied(rival)) winner = rival;
  }

  function lower(seat: number, now: number) {
    const well = wells[seat];
    if (fits(well, well.shape, well.x, well.y + 1)) well.y++;
    else lock(seat, now);
  }

  function move(well: Well, dx: number) {
    if (fits(well, well.shape, well.x + dx, well.y)) well.x += dx;
  }

  function rotate(well: Well) {
    const right = Math.max(...well.shape.map(([, y]) => y));
    const shape = well.shape.map(([x, y]) => [right - y, x]);
    const kick = [0, -1, 1, -2, 2].find((dx) => fits(well, shape, well.x + dx, well.y));
    if (kick !== undefined) {
      well.x += kick;
      well.shape = shape;
    }
  }

  function dropAt(well: Well) {
    let y = well.y;
    while (fits(well, well.shape, well.x, y + 1)) y++;
    return y;
  }

  return {
    act(seat, action, now) {
      const well = wells[seat];
      if (well.lost || winner !== null) return false;
      focused = seat;
      switch (action) {
        case 'left': move(well, -1); break;
        case 'right': move(well, 1); break;
        case 'up': rotate(well); break;
        case 'down': lower(seat, now); break;
        case 'action': well.y = dropAt(well); lock(seat, now); break;
      }
      return true;
    },
    tick(now) {
      if (winner !== null) return false;
      let dirty = false;
      for (const [seat, well] of wells.entries()) {
        if (!occupied(seat) || well.lost) {
          well.fallAt = 0;
          continue;
        }
        if (!well.fallAt) well.fallAt = now + 2300;
        if (now < well.fallAt) continue;
        well.fallAt = now + Math.max(240, 720 - well.score / 8);
        lower(seat, now);
        dirty = true;
        if (winner !== null) break;
      }
      return dirty;
    },
    draw() {
      const duel = occupied(0) && occupied(1);
      drawBoards(context, columns, rows, duel ? 2 : 1, focused, (board, seat) => {
        if (!duel) seat = occupied(1) ? 1 : 0;
        const well = wells[seat];
        board.surround(seatColors[seat]);
        for (const [y, line] of well.cells.entries()) {
          line.forEach((color, x) => board.cell(x, y, color || (((x + y) % 2) ? quietCell : 0x172135)));
        }
        if (well.lost) return;
        const ghost = dropAt(well);
        for (const [dx, dy] of well.shape) board.cell(well.x + dx, ghost + dy, 0x344454);
        for (const [dx, dy] of well.shape) board.cell(well.x + dx, well.y + dy, well.piece.color);
      });
    },
    status(seat) {
      const well = wells[seat ?? 0];
      const message = winner !== null ? `Player ${winner + 1} wins`
        : well.lost ? 'Stack full · restart to play again'
        : well.pressure ? `${well.pressure} pressure rows incoming`
        : occupied(0) && occupied(1) ? 'Duel in progress' : 'Solo · another remote can join';
      return { message, scores: wells.map(({ score }) => score) };
    },
  };
}
