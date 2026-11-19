import { gameDirections } from '../../../shared/games';
import type { GameDirection } from '../../../shared/games';
import { scaleColor } from '../panel/color';
import { drawBoards, gameCaption } from './board';
import type { GameContext, GameRound } from './types';

const colors = [0x56dfce, 0xffa562, 0xb6a2ff, 0xfe71a8];
const vectors = [[0, -1], [1, 0], [0, 1], [-1, 0]];

export function echoKeys(context: GameContext): GameRound {
  const { matrix } = context;
  const wide = matrix.width() >= matrix.height() * 2 && matrix.width() >= 19;
  const columns = wide ? 19 : 8;
  const rows = wide ? 5 : 8;
  const sequence: GameDirection[] = [];
  let stage: 'ready' | 'show' | 'answer' | 'next' | 'lost' = 'ready';
  let active: GameDirection | undefined;
  let cue = 0;
  let answer = 0;
  let score = 0;
  let at = 0;

  function show(now: number) {
    sequence.push(gameDirections[Math.floor(Math.random() * gameDirections.length)]);
    cue = answer = 0;
    stage = 'show';
    at = now + 240;
  }

  return {
    act(_seat, action, now) {
      if (stage === 'ready' && action === 'action') {
        show(now);
        return true;
      }
      if (stage !== 'answer' || action === 'action') return false;
      active = action;
      if (action !== sequence[answer]) stage = 'lost';
      else if (++answer === sequence.length) {
        score++;
        stage = 'next';
      }
      at = now + (stage === 'next' ? 740 : 220);
      return true;
    },
    tick(now) {
      if (!context.occupied(0) || now < at) return false;
      if (stage === 'next') {
        active = undefined;
        show(now);
      } else if (stage === 'show') {
        if (active) {
          active = undefined;
          at = now + 190;
        } else if (cue < sequence.length) {
          active = sequence[cue++];
          at = now + Math.max(240, 560 - score * 22);
        } else stage = 'answer';
      } else if (stage === 'answer' && active) {
        active = undefined;
      } else return false;
      return true;
    },
    draw() {
      const footprint = drawBoards(context, columns, rows, 1, 0, (board) => {
        const square = wide ? 4 : 3;
        gameDirections.forEach((direction, i) => {
          const lit = active === direction;
          const color = lit ? (stage === 'lost' ? 0xff514c : colors[i]) : scaleColor(colors[i], .26);
          const x = wide ? i * 5 + 1 : (i % 2) * 4 + 1;
          const y = wide ? 2 : Math.floor(i / 2) * 4 + 1;
          const [dx, dy] = vectors[i];
          board.cell(x + dx, y + dy, color);
          board.cell(x, y, color);
          board.cell(x - dx - dy, y - dy + dx, color);
          board.cell(x - dx + dy, y - dy - dx, color);
          if (lit && square === 4) board.cell(x + 2, y + 2, scaleColor(color, .5));
        });
      });
      gameCaption(context, stage === 'show' ? 'WATCH' : stage === 'answer' ? 'REPEAT' : 'ECHO',
        `ROUND ${score + 1}`, footprint, 0x9684bf);
    },
    status() {
      const message = {
        ready: 'Start when you’re ready',
        show: 'Watch the sequence',
        answer: `Repeat the sequence · ${answer}/${sequence.length}`,
        next: 'Correct · next round',
        lost: 'Sequence missed · restart to retry',
      }[stage];
      return { message, scores: [score] };
    },
  };
}
