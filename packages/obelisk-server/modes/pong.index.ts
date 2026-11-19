import { drawFittedText } from '../panel/text-layout';
import type { ModeState } from '../panel/types';

let timer: NodeJS.Timeout;

function init(state: ModeState) {
  const { matrix, playerData } = state;
  const right = matrix.width() - 1;
  const bottom = matrix.height() - 1;
  const radius = Math.max(1, Math.round((bottom + 1) * .125));
  const speed = Math.max(6, right * .58);
  const score = [0, 0];
  const paddles = [Math.floor(bottom / 2), Math.floor(bottom / 2)];
  const ball = { x: 0, y: 0, vx: 0, vy: 0 };
  let winner: number | undefined;
  let playAt: number;
  let lastFrame = performance.now();

  function serve(now: number, delay: number) {
    ball.x = right / 2;
    ball.y = bottom / 2;
    ball.vx = Math.random() < .5 ? -speed : speed;
    ball.vy = (Math.random() - .5) * bottom * .65;
    playAt = now + delay;
  }

  function updatePaddles(now: number) {
    for (const i of [0, 1]) {
      const player = playerData[i];
      const approach = i === 0 ? 1 - ball.x / right : ball.x / right;
      const target = player ? player.y * bottom
        : (1 - approach) * bottom / 2 + approach * (ball.y + bottom * .18 * Math.sin(now / 620));
      paddles[i] = Math.round(Math.max(radius, Math.min(bottom - radius, target)));
    }
  }

  function moveBall(now: number, dt: number) {
    const steps = Math.max(1, Math.ceil(Math.max(Math.abs(ball.vx), Math.abs(ball.vy)) * dt));
    const step = dt / steps;
    for (let i = 0; i < steps; i++) {
      ball.y += ball.vy * step;
      if (ball.y < 0 || ball.y > bottom) {
        ball.y = ball.y < 0 ? -ball.y : 2 * bottom - ball.y;
        ball.vy *= -1;
      }

      const x = ball.x + ball.vx * step;
      const hitsLeft = ball.vx < 0 && x <= 0;
      const hitsRight = ball.vx > 0 && x >= right;
      if (!hitsLeft && !hitsRight) {
        ball.x = x;
        continue;
      }

      const defending = hitsLeft ? 0 : 1;
      const offset = (ball.y - paddles[defending]) / radius;
      if (Math.abs(offset) <= 1) {
        ball.x = hitsLeft ? -x : 2 * right - x;
        ball.vx = -Math.sign(ball.vx) * Math.min(speed * 1.55, Math.abs(ball.vx) * 1.05);
        ball.vy = offset * bottom * .72;
        continue;
      }

      const scoring = 1 - defending;
      score[scoring]++;
      if (score[scoring] >= 10) {
        winner = scoring;
        playAt = now + 2400;
      } else {
        serve(now, 1100);
      }
      break;
    }
  }

  function paint() {
    const { width, height } = { width: right + 1, height: bottom + 1 };
    matrix.clear();

    if (winner !== undefined) {
      const player = String(winner + 1);
      drawFittedText(state, [`P${player} WINS`, `P${player}`, player], { width, height }, 0xffe552);
    } else {
      const center = Math.floor(width / 2);
      matrix.fgColor(0x283847).drawLine(center, 0, center, bottom);
      const scoreHeight = Math.max(6, Math.floor(height * .4));
      drawFittedText(state, [String(score[0])], { width: center, height: scoreHeight }, 0x67c8dc);
      drawFittedText(state, [String(score[1])], { x: center + 1, width: right - center, height: scoreHeight }, 0xe57fbb);

      matrix.fgColor(0xffffff)
        .drawLine(0, paddles[0] - radius, 0, paddles[0] + radius)
        .drawLine(right, paddles[1] - radius, right, paddles[1] + radius)
        .fgColor(0xedff55).setPixel(Math.round(ball.x), Math.round(ball.y));
    }

    matrix.sync();
  }

  function frame() {
    const now = performance.now();
    const dt = Math.min(.1, (now - lastFrame) / 1000);
    lastFrame = now;

    if (winner !== undefined && now >= playAt) {
      winner = undefined;
      score.fill(0);
      serve(now, 1000);
    }
    updatePaddles(now);
    if (winner === undefined && now >= playAt) moveBall(now, dt);
    paint();
  }

  serve(lastFrame, 1100);
  paint();
  timer = setInterval(frame, 1000 / 30);
}

export const Pong = {
  init,
  deactivate() {
    clearInterval(timer);
  },
};
