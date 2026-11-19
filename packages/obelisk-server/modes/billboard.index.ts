import type { PNG } from 'pngjs';
import { drawFittedText } from '../panel/text-layout';
import type { ModeState } from '../panel/types';
import { forEachOpaquePixel, readPng } from '../png';
import { fetchArrivalMinutes } from '../ttc';

const torontoTime = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'America/Toronto',
  hour12: false,
  hour: '2-digit',
  minute: '2-digit',
});

let stop = () => {};

function init(state: ModeState) {
  const { matrix } = state;
  const width = matrix.width();
  const height = matrix.height();
  const activation = new AbortController();
  const { signal } = activation;
  let image: PNG | undefined;
  let minutes: number | undefined;
  let frameTimer: NodeJS.Timeout | undefined;
  let updateTimer: NodeJS.Timeout | undefined;

  async function updateArrival() {
    try {
      minutes = await fetchArrivalMinutes(AbortSignal.any([signal, AbortSignal.timeout(8000)]));
    } catch (error) {
      minutes = undefined;
      if (!signal.aborted) console.warn('Could not read TTC arrivals:', error);
    }

    if (!signal.aborted) updateTimer = setTimeout(updateArrival, 60_000);
  }

  stop = () => {
    activation.abort();
    clearTimeout(frameTimer);
    clearTimeout(updateTimer);
  };

  function paint() {
    const now = new Date();
    const time = torontoTime.format(now);
    const arrivals = minutes === undefined ? ['--', '-'] : [`${minutes}m`, String(minutes)];
    matrix.clear();

    if (width >= 40) {
      const timeWidth = Math.floor(width * .55);
      const iconWidth = image && width - timeWidth >= image.width + 26 && height >= image.height ? image.width + 2 : 0;
      drawFittedText(state, [time], { width: timeWidth, height }, 0xff80cb);
      if (image && iconWidth) {
        const top = Math.floor((height - image.height) / 2);
        forEachOpaquePixel(image, (x, y, color) => matrix.fgColor(color).setPixel(x + timeWidth, y + top));
      }
      drawFittedText(state, arrivals, { x: timeWidth + iconWidth, width: width - timeWidth - iconWidth, height }, 0xf5c5ef);
    } else if (width >= 15 && height >= 12) {
      const rowHeight = Math.floor(height / 2);
      drawFittedText(state, [time], { width, height: rowHeight }, 0xff80cb);
      drawFittedText(state, arrivals, { y: rowHeight, width, height: height - rowHeight }, 0xf5c5ef);
    } else {
      const bounds = { width, height };
      const [hour, minute] = time.split(':');
      const phase = Math.floor(now.getTime() / 2000) % 3;
      if (phase === 2) {
        drawFittedText(state, [...arrivals, '-'], bounds, 0xf5c5ef);
      } else if (!drawFittedText(state, [time], bounds, 0xff80cb)) {
        drawFittedText(state, [phase === 0 ? hour : minute], bounds, 0xff80cb);
      }
    }

    matrix.sync();
    frameTimer = setTimeout(paint, 1000 - now.getMilliseconds());
  }

  readPng('streetcar.png')
    .then((streetcar) => { image = streetcar; })
    .catch((error) => { if (!signal.aborted) console.error('Could not read the streetcar image:', error); });
  void updateArrival();
  paint();
}

export const Billboard = {
  init,
  deactivate() {
    stop();
  },
};
