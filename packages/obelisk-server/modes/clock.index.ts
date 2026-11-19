import { drawFittedText } from '../panel/text-layout';
import type { ModeState } from '../panel/types';
import type { ClockFont } from '../../../shared/visual-settings';

const fonts: Record<ClockFont, readonly string[]> = {
  matrix: ['spleen-16x32', 'spleen-12x24', 'spleen-8x16', 'spleen-5x8', '4x6', 'tom-thumb'],
  studio: ['helvR12', 'scientifica-11', '5x7', 'tom-thumb'],
  terminal: ['10x20', '7x13B', '6x10', '4x6', 'tom-thumb'],
};

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
    const { font, color } = state.visualSettings().clock;
    const rgb = Number.parseInt(color.slice(1), 16);
    matrix.clear();
    if (!drawFittedText(state, [full, compact], bounds, rgb, fonts[font])) {
      drawFittedText(state, [now.getSeconds() % 4 < 2 ? hour : minute], bounds, rgb, fonts[font]);
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
