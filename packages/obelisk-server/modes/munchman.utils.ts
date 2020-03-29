import * as chroma from 'chroma-js';
import {
  BASE_COLORS
} from './munchman.types';

let fade = (t, freq, offset) => {
  return Math.abs(Math.sin(  Math.PI * (t % freq / freq - offset) ));
 };

 let getAdjacent = (x, y, matrix) => {
  return [{x: x+1, y: y}, {x: x-1, y: y}, {x: x, y: y-1}, {x: x, y: y+1}]
    .filter(coords => coords.x >= 0 && coords.y >= 0 && coords.x <= matrix.width() && coords.y <= matrix.height());
}

let colors = {
  'wall': chroma.scale([0, BASE_COLORS['wall']]),
  'player': chroma.scale([0, BASE_COLORS['player']]),
  'inky': chroma.scale([0, BASE_COLORS['inky']]),
  'binky': chroma.scale([0, BASE_COLORS['binky']]),
  'pinky': chroma.scale([0, BASE_COLORS['pinky']]),
  'clyde': chroma.scale([0, BASE_COLORS['clyde']]),
  'empty': chroma.scale([0, BASE_COLORS['empty']]),
  'dot': chroma.scale([0x040404, BASE_COLORS['dot']]),
};

export { fade, colors, getAdjacent};