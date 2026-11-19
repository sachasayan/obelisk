import { fleetCoordinate } from '../../../shared/fleet-strike';
import type { FleetSeat, FleetShot, FleetStatus } from '../../../shared/fleet-strike';
import { mixColor, scaleColor } from '../panel/color';
import { drawFittedText } from '../panel/text-layout';
import type { ModeState } from '../panel/types';
import { shipPalette, shipSprite } from './fleet-ship-sprite';

export const fleetImpactAt = 840;
export const fleetShotDuration = 1840;
const launchDuration = 180;
const hullColors = [0x48ddcd, 0xbf98ff];
const amber = 0xffa54d;
const white = 0xffedd2;
const splash = 0x91d7f3;
const deepWater = 0x071620;
const farWater = 0x244551;
const foam = 0x86b4ba;

export function drawFleetScene(state: ModeState, { phase, turn, winner, lastShot, elapsed, miss }: {
  phase: FleetStatus['phase']; turn: FleetSeat; winner: FleetSeat | null; lastShot: FleetShot | null; elapsed: number; miss: boolean;
}) {
  const { matrix } = state;
  const width = matrix.width();
  const height = matrix.height();
  const water = Math.floor(height * .77);
  const horizon = Math.floor(height * .57);
  const wide = width >= 28;
  const columns = Math.min(shipSprite[0].length, Math.max(3, Math.floor(width * .34)));
  const rows = Math.min(shipSprite.length, water + 1, Math.max(2, Math.round(columns * .23)));
  const anchors = [Math.floor(width * (wide ? .19 : .23)), Math.floor(width * (wide ? .81 : .77))];
  const direction = turn === 0 ? 1 : -1;
  const firing = phase === 'firing';
  const impact = firing ? lastShot : null;
  const shotOrigin = anchors[turn] + Math.max(1, Math.floor(columns * .37)) * direction;
  const opponent = anchors[1 - turn];
  const shotEnd = opponent - (miss ? (Math.ceil(columns / 2) + 1) * direction : 0);
  const shotHeight = Math.max(2, water - Math.max(1, Math.round(rows * .4)));

  function point(x: number, y: number, color: number) {
    x = Math.round(x);
    y = Math.round(y);
    if (x >= 0 && x < width && y >= 0 && y < height) matrix.fgColor(color).setPixel(x, y);
  }

  function line(start: number, end: number, y: number, color: number) {
    const left = Math.max(0, Math.round(start));
    const right = Math.min(width - 1, Math.round(end));
    if (left <= right && y >= 0 && y < height) matrix.fgColor(color).drawLine(left, y, right, y);
  }

  function drawOcean() {
    for (let y = 0; y < horizon; y++) {
      line(0, width, y, mixColor(0x0c1425, 0x594046, (y / Math.max(1, horizon - 1)) ** 2));
    }
    // Long bands of low cloud and a break in the sky above the horizon.
    line(width * .04, width * .37, Math.max(0, horizon - 3), 0x292635);
    line(width * .64, width * .94, Math.max(0, horizon - 4), 0x282838);
    line(width * .26, width * .75, horizon - 1, 0x704e4c);
    for (let y = horizon; y < height; y++) {
      const depth = (y - horizon) / Math.max(1, height - horizon - 1);
      line(0, width, y, mixColor(farWater, deepWater, depth));
      const spacing = 8 + Math.round(depth * 13);
      const drift = Math.floor(elapsed / (140 - depth * 65));
      for (let x = (y * 13 + drift) % spacing - spacing; x < width; x += spacing) {
        const length = 2 + Math.floor(depth * 7) + Math.abs((x + y) % 3);
        const glint = Math.abs(x - width * .51) < width * .16 ? 0x637a80 : foam;
        line(x, x + length, y, mixColor(deepWater, glint, .29 + depth * .16));
      }
    }
  }

  function drawWarship(seat: number, center: number, sink: number) {
    const facing = seat === 0 ? 1 : -1;
    const half = Math.floor(columns / 2);
    for (let y = 0; y < rows; y++) {
      const source = shipSprite[rows === 2 ? 6 + y : Math.round(y * (shipSprite.length - 1) / (rows - 1))];
      for (let x = 0; x < columns; x++) {
        const sample = source[Math.round(x * (source.length - 1) / (columns - 1))];
        if (sample === '.') continue;
        const forward = (x - half) / half;
        const worldY = water - rows + 1 + y + Math.round(sink * (rows + 1 + forward * 2.5));
        if (worldY > water) continue;
        const steel = shipPalette[Number(sample)];
        const tint = Number(sample) === 1 ? steel : mixColor(steel, hullColors[seat], .19);
        point(center + facing * (x - half), worldY, scaleColor(tint, 1 - sink * .6));
      }
    }
    if (columns < 6 && sink < .3) {
      // A bridge pixel survives when the detailed mast falls between samples on a tiny panel.
      point(center, water - 1, mixColor(shipPalette[4], hullColors[seat], .3));
    }
    if (sink > .8) return;
    const stern = center - facing * half;
    const wake = stern - facing * Math.max(2, Math.round(columns * .23));
    const reflection = mixColor(deepWater, hullColors[seat], .25);
    line(Math.min(stern, wake), Math.max(stern, wake), water, scaleColor(foam, .48));
    for (let offset = -half; offset < half; offset += 7) {
      const drift = Math.floor(elapsed / 110) % 3;
      line(center + offset + drift, center + offset + drift + 4, water + 1, reflection);
      if (Math.abs(offset) < half * .7) {
        line(center + offset - drift, center + offset - drift + 2, water + 2, scaleColor(reflection, .74));
      }
    }
  }

  drawOcean();
  for (const [seat, x] of anchors.entries()) {
    if (winner !== null && seat !== winner) continue;
    const sink = seat !== turn && impact?.result === 'sunk'
      ? Math.min(1.34, Math.max(0, (elapsed - fleetImpactAt - 90) / 640)) : 0;
    drawWarship(seat, x, sink);
  }

  function caption(labels: string[], color: number) {
    const textWidth = wide ? Math.ceil(width * .41) : width;
    drawFittedText(state, labels, {
      x: Math.floor((width - textWidth) / 2), width: textWidth, y: 0, height: Math.max(5, water - 1),
    }, color, ['6x10', '4x6', 'tom-thumb']);
  }

  if (phase === 'setup') caption(['FLEET SETUP', 'SETUP', 'S'], hullColors[0]);
  if (phase === 'aim') caption([`P${turn + 1} TARGETING`, `P${turn + 1} AIM`, `${turn + 1}`], hullColors[turn]);
  if (winner !== null) caption([`P${winner + 1} WINS`, `P${winner + 1}`, `${winner + 1}`], hullColors[winner]);
  if (!firing) return;

  if (elapsed < launchDuration) {
    const heat = 1 - elapsed / (launchDuration * 1.25);
    point(shotOrigin, shotHeight, scaleColor(white, heat));
    point(shotOrigin + direction, shotHeight, scaleColor(amber, heat));
    point(shotOrigin, shotHeight - 1, scaleColor(amber, heat));
    point(shotOrigin - direction, shotHeight, mixColor(0x62626b, amber, heat));
    return;
  }

  if (!impact) {
    const progress = (elapsed - launchDuration) / (fleetImpactAt - launchDuration);
    for (let i = 4; i >= 0; i--) {
      const t = Math.max(0, progress - i * .035);
      const descent = (miss ? water + 1 : water - 1) - shotHeight;
      point(shotOrigin + (shotEnd - shotOrigin) * t,
        shotHeight + t * descent - Math.sin(Math.PI * t) * (shotHeight - 1), i ? scaleColor(amber, 1 - i * .18) : white);
    }
    return;
  }

  const age = elapsed - fleetImpactAt;
  const missed = impact.result === 'miss';
  const color = missed ? splash : impact.result === 'sunk' ? 0xff7356 : amber;
  const t = age / 800;
  const centerY = missed ? water + 1 : water - 1;
  if (t < 1) {
    const intensity = 1 - t;
    const plumeHeight = Math.min(8, water * .66);
    for (let i = 0; i < (wide ? 26 : 10); i++) {
      const angle = i * 2.39996;
      const spread = (t * (i % 5 + 4) * (missed ? 1.4 : 2.2)) * (wide ? 1 : .5);
      const lift = Math.abs(Math.sin(angle)) * 4 * t * (1 - t) * plumeHeight;
      const x = shotEnd + Math.cos(angle) * spread;
      const y = centerY - lift;
      const plume = missed ? mixColor(foam, white, (i % 4) / 4)
        : mixColor(i % 3 === 0 ? 0x737782 : 0xcf5331, i % 3 === 0 ? 0x96a3a9 : white, intensity ** 2);
      point(x, y, scaleColor(plume, .22 + intensity * .78));
    }
    if (age < 150) {
      point(shotEnd - 1, centerY, color);
      point(shotEnd + 1, centerY, color);
      point(shotEnd, centerY - 1, color);
      point(shotEnd, centerY, white);
    }
  }
  if (missed || impact.result === 'sunk') {
    const radius = Math.round(t * (wide ? 20 : 4));
    const ripple = mixColor(deepWater, foam, Math.max(.1, .63 - t * .45));
    line(shotEnd - radius, shotEnd - radius / 2, water + 1, ripple);
    line(shotEnd + radius / 2, shotEnd + radius, water + 1, ripple);
    line(shotEnd - radius * .65, shotEnd + radius * .65, water + 2, scaleColor(ripple, .7));
  }
  if (age >= 240) {
    const result = impact.result.toUpperCase();
    caption([`${result} ${fleetCoordinate(impact.cell)}`, result, result[0]], color);
  }
}
