import type { PNG } from 'pngjs';
import type { ModeState } from '../panel/types';
import { forEachOpaquePixel, readPng } from '../png';
import { fetchArrivalMinutes } from '../ttc';

let stop = () => {};

function init({ matrix, loadFont }: ModeState) {
  const activation = new AbortController();
  const { signal } = activation;
  const clockFont = loadFont('helvR12');
  const arrivalFont = loadFont('5x7');
  let image: PNG | undefined;
  let minutes: number | undefined;
  let frameTimer: NodeJS.Timeout | undefined;
  let updateTimer: NodeJS.Timeout | undefined;

  async function updateArrival() {
    try {
      const requestSignal = AbortSignal.any([signal, AbortSignal.timeout(8000)]);
      minutes = await fetchArrivalMinutes(requestSignal);
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

  matrix.afterSync(() => {
    if (signal.aborted) return;

    const time = new Date().toLocaleString('en-US', {
      timeZone: 'America/Toronto',
      hour: 'numeric',
      minute: 'numeric',
      hour12: true,
    });
    matrix.clear().font(clockFont).fgColor(0x333333).drawText(time, 2, 0);
    if (image) {
      forEachOpaquePixel(image, (x, y, color) => {
        matrix.fgColor(color).setPixel(x + 96, y + 5);
      });
    }
    const arrival = minutes === undefined ? '--' : `${minutes}m`;
    matrix.font(arrivalFont).fgColor(0x222222).drawText(arrival, 110, 5);
    frameTimer = setTimeout(() => matrix.sync(), 1000);
  });

  readPng('streetcar.png')
    .then((streetcar) => { image = streetcar; })
    .catch((error) => console.error('Could not read the streetcar image:', error));
  void updateArrival();
  matrix.sync();
}

export const Billboard = {
  init,
  deactivate() {
    stop();
  },
};
