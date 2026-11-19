import { drawFittedText } from '../panel/text-layout';
import type { ModeState } from '../panel/types';

const torontoTime = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'America/Toronto',
  hour12: false,
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});

let frameTimer: NodeJS.Timeout;

function init(state: ModeState) {
  const { matrix } = state;
  const bounds = { width: matrix.width(), height: matrix.height() };

  function paint() {
    const now = new Date();
    const full = torontoTime.format(now);
    const [hour, minute] = full.split(':');
    const compact = `${hour}:${minute}`;
    matrix.clear();
    if (!drawFittedText(state, [full, compact], bounds, 0xffad48)) {
      drawFittedText(state, [now.getSeconds() % 4 < 2 ? hour : minute], bounds, 0xffad48);
    }
    matrix.sync();
    frameTimer = setTimeout(paint, 1000 - now.getMilliseconds());
  }

  paint();
}

export const Clock = {
  init,
  deactivate() {
    clearTimeout(frameTimer);
  },
};
