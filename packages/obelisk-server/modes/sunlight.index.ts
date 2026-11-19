import { MINUTES_PER_DAY as minutesPerDay } from '../../../shared/simulator';
import { mixColor, scaleColor } from '../panel/color';
import type { ModeState } from '../panel/types';

const radians = Math.PI / 180;
const defaultTimeZone = 'America/Toronto';

function coordinate(value: string | undefined, range: number, fallback: number) {
  const number = value?.trim() ? Number(value) : NaN;
  return Math.abs(number) <= range ? number : fallback;
}

function createLocalTime(timeZone: string) {
  try {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone, year: 'numeric', month: 'numeric', day: 'numeric', hourCycle: 'h23',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
  } catch {
    return createLocalTime(defaultTimeZone);
  }
}

function dateParts(formatter: Intl.DateTimeFormat, timestamp: number) {
  const parts = Object.fromEntries(formatter.formatToParts(timestamp).map(({ type, value }) => [type, Number(value)]));
  const { year, month, day, hour, minute, second } = parts;
  return { date: Date.UTC(year, month - 1, day), minute: hour * 60 + minute + second / 60 };
}

// NOAA's fractional-year sunset approximation: https://gml.noaa.gov/grad/solcalc/solareqns.PDF
export function sunsetMinute(date: number, latitude: number, longitude: number, localTime: Intl.DateTimeFormat) {
  const year = new Date(date).getUTCFullYear();
  const yearStart = Date.UTC(year, 0, 1);
  const yearLength = Date.UTC(year + 1, 0, 1) - yearStart;
  const gamma = 2 * Math.PI * (date - yearStart) / yearLength;
  const equation = 229.18 * (.000075 + .001868 * Math.cos(gamma) - .032077 * Math.sin(gamma)
    - .014615 * Math.cos(2 * gamma) - .040849 * Math.sin(2 * gamma));
  const declination = .006918 - .399912 * Math.cos(gamma) + .070257 * Math.sin(gamma)
    - .006758 * Math.cos(2 * gamma) + .000907 * Math.sin(2 * gamma)
    - .002697 * Math.cos(3 * gamma) + .00148 * Math.sin(3 * gamma);
  const lat = latitude * radians;
  const cosine = (Math.cos(90.833 * radians) - Math.sin(lat) * Math.sin(declination))
    / (Math.cos(lat) * Math.cos(declination));
  if (Math.abs(cosine) > 1) return minutesPerDay;
  const utcMinute = 720 - 4 * longitude - equation + 4 * Math.acos(cosine) / radians;
  const sunset = dateParts(localTime, date + utcMinute * 60_000);
  return sunset.date === date ? sunset.minute : minutesPerDay;
}

const stages = [
  { progress: 0, glow: 0, horizon: 0xffb348, sky: 0xd52f34 },
  { progress: .10, glow: .62, horizon: 0xffa33b, sky: 0xe64758 },
  { progress: .28, glow: .53, horizon: 0xff7656, sky: 0x7c3ba8 },
  { progress: .55, glow: .36, horizon: 0x9351d5, sky: 0x24388c },
  { progress: .78, glow: .23, horizon: 0x416bfa, sky: 0x182970 },
  { progress: 1, glow: 0, horizon: 0x2548be, sky: 0x111935 },
];

export function sunlightLook(minute: number, sunset: number) {
  if (minute <= sunset || minute >= minutesPerDay) return undefined;
  const progress = (minute - sunset) / (minutesPerDay - sunset);
  const index = stages.findIndex((stage) => stage.progress >= progress);
  const from = stages[index - 1];
  const to = stages[index];
  const linear = (progress - from.progress) / (to.progress - from.progress);
  const amount = linear * linear * (3 - 2 * linear);
  return {
    glow: from.glow * (1 - amount) + to.glow * amount,
    horizon: mixColor(from.horizon, to.horizon, amount),
    sky: mixColor(from.sky, to.sky, amount),
  };
}

let lastDate: number | undefined;
let sunset = minutesPerDay;
const latitude = coordinate(process.env.OBELISK_SUNLIGHT_LATITUDE, 90, 43.6532);
const longitude = coordinate(process.env.OBELISK_SUNLIGHT_LONGITUDE, 180, -79.3832);
const localTime = createLocalTime(process.env.OBELISK_SUNLIGHT_TIME_ZONE ?? defaultTimeZone);

const timeZone = localTime.resolvedOptions().timeZone;

export function readSunlightClock() {
  const local = dateParts(localTime, Date.now());
  if (lastDate !== local.date) {
    lastDate = local.date;
    sunset = sunsetMinute(local.date, latitude, longitude, localTime);
  }
  return { minute: local.minute, sunset, timeZone };
}

let timer: NodeJS.Timeout;
let refresh: (() => void) | undefined;

function init({ matrix, simulatedMinute }: ModeState) {
  const width = matrix.width();
  const height = matrix.height();
  let blank = false;

  function render() {
    const local = readSunlightClock();
    const look = sunlightLook(simulatedMinute?.() ?? local.minute, local.sunset);

    if (!look) {
      if (!blank) matrix.clear().sync();
      blank = true;
      timer = setTimeout(render, 30_000);
      return;
    }

    blank = false;
    const time = performance.now() / 1000;
    for (let x = 0; x < width; x++) {
      const phase = (x + .5) / width * Math.PI * 2;
      const drift = .15 * Math.sin(phase * 1.35 + time * .23) + .075 * Math.sin(phase * 2.1 - time * .14);
      const shimmer = .82 + .18 * Math.sin(phase - time * .14);
      for (let y = 0; y < height; y++) {
        const band = Math.max(0, Math.min(1, (y + .5) / height + drift));
        const color = mixColor(look.sky, look.horizon, band);
        matrix.fgColor(scaleColor(color, look.glow * shimmer * (.46 + .54 * band))).setPixel(x, y);
      }
    }
    matrix.sync();
    timer = setTimeout(render, 66);
  }

  refresh = () => {
    clearTimeout(timer);
    render();
  };
  render();
}

export const Sunlight = {
  init,
  refresh() { refresh?.(); },
  deactivate() {
    clearTimeout(timer);
    refresh = undefined;
  },
};
