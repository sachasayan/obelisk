import type { MunchmanDirection } from '../../../shared/munchman';
import type { ModeState, PanelMatrix } from '../panel/types';
import { createModeTimers } from '../panel/mode-timers';
import chroma from 'chroma-js';
import { readPng } from '../png';

import {
  BASE_COLORS,
  STATUS,
  MAP_LOOKUP,
  TILES,
  MunchGameSettings,
  MunchGameState,
  Ghost,
  Player
} from './munchman.types';

import { fade, colors } from './munchman.utils';

const timers = createModeTimers();
let matrix: PanelMatrix;
let manualControl = false;
let pendingDirection: MunchmanDirection | undefined;

const directionOffsets: Record<MunchmanDirection, readonly [number, number]> = {
  up: [0, -1],
  left: [-1, 0],
  down: [0, 1],
  right: [1, 0],
};

const terminalDirections = new Map<string, MunchmanDirection>([
  ['w', 'up'], ['a', 'left'], ['s', 'down'], ['d', 'right'],
]);

function move(direction: MunchmanDirection) {
  manualControl = true;
  pendingDirection = direction;
}

let gameSettings: MunchGameSettings = {
  grid: '',
  playerTick: 100,
  ghostsTick: 700,
  demoMode: true
};

let gameState: MunchGameState;

function resetGame() {
  const field = gameSettings.grid.trim().split('\n').map(row => row.split(''));
  const player = new Player();
  if (field[player.y]?.[player.x] === 'D') field[player.y][player.x] = 'O';
  gameState = {
    activeScreen: STATUS.PLAYING_GAME,
    field,
    sickoMode: false,
    ghosts: [new Ghost('inky', 62, 7), new Ghost('binky', 62, 8), new Ghost('pinky', 64, 7), new Ghost('clyde', 64, 8)],
    player,
    animations: {
     ghostOffset: 0
    }
  };
}


//////////////////////
// MOVEMENT
//////////////////////

function canEnter({ x, y }: { x: number; y: number }) {
  const tile = gameState.field[y]?.[x];
  return tile !== undefined && tile !== 'W';
}

function neighbors(x: number, y: number, previous: { x: number; y: number }) {
  const candidates = Object.values(directionOffsets)
    .map(([dx, dy]) => ({ x: x + dx, y: y + dy }))
    .filter(canEnter);
  const forward = candidates.filter((next) => next.x !== previous.x || next.y !== previous.y);
  return forward.length ? forward : candidates;
}

function handlePlayerMovement() {
  const { player, field } = gameState;
  const direction = pendingDirection;
  pendingDirection = undefined;
  let target: { x: number; y: number } | undefined;

  if (direction) {
    const [dx, dy] = directionOffsets[direction];
    target = { x: player.x + dx, y: player.y + dy };
  } else if (!manualControl && gameSettings.demoMode) {
    const candidates = neighbors(player.x, player.y, player.previous);
    target = candidates[Math.floor(Math.random() * candidates.length)];
  }

  if (target && canEnter(target)) {
    player.previous = { x: player.x, y: player.y };
    player.x = target.x;
    player.y = target.y;
    if (field[player.y][player.x] === 'D') field[player.y][player.x] = 'O';
  }

  hitDetection();
  timers.schedule(handlePlayerMovement, gameSettings.playerTick);
}

function handleGhostMovement(){
  gameState.animations.ghostOffset = new Date().getTime();

  gameState.ghosts.forEach(g => {
    // Get all viable candidates.
    const candidates = neighbors(g.x, g.y, g.previous);
    let finalCandidate = candidates[Math.floor(Math.random()*candidates.length)];
    g.previous = { x: g.x, y: g.y};
    if (finalCandidate) {
      g.x = finalCandidate.x;
      g.y = finalCandidate.y;
    }
  });
  hitDetection();

  timers.schedule(handleGhostMovement, gameSettings.ghostsTick);
}

function hitDetection() {
  let {player, ghosts, field, sickoMode} = gameState;

  // Did player hit a pill? Gobble it up.
  if (field[player.y][player.x] === 'P') {
    field[player.y][player.x] = 'O';
    sickoMode = true;
    timers.schedule(() => { sickoMode = false}, 5000);
  }

  // Did player hit a ghost? Die, sorry. :(
  ghosts.forEach(g => {
    if (g.x == player.x && g.y == player.y){
      gameState.activeScreen = STATUS.PLAYING_GAME;
    }
  });
}

//////////////////////
// GAME SCREENS
//////////////////////

function displayIntroScreen(){
  // matrix.fgColor(matrix.bgColor()).fill().fgColor(0xFFFFFF);
  // const font = fonts[matrix.font()];
  // matrix.drawText(glyph.char, glyph.x, glyph.y);
  // matrix.sync();

};

function displayGameScreen(t: number) {
  const { field, player, ghosts } = gameState;
  const levelWidth = field[0].length;
  const levelHeight = field.length;
  const width = matrix.width();
  const height = matrix.height();
  const scale = Math.max(1, Math.floor(Math.min(width / levelWidth, height / levelHeight)));
  const columns = Math.min(levelWidth, Math.floor(width / scale));
  const rows = Math.min(levelHeight, Math.floor(height / scale));
  const left = Math.max(0, Math.min(levelWidth - columns, player.x - Math.floor(columns / 2)));
  const top = Math.max(0, Math.min(levelHeight - rows, player.y - Math.floor(rows / 2)));
  const originX = Math.floor((width - columns * scale) / 2);
  const originY = Math.floor((height - rows * scale) / 2);

  function drawCell(x: number, y: number, color: number) {
    if (!color || x < left || x >= left + columns || y < top || y >= top + rows) return;
    const pixelX = originX + (x - left) * scale;
    const pixelY = originY + (y - top) * scale;
    matrix.fgColor(color);
    if (scale === 1) {
      matrix.setPixel(pixelX, pixelY);
    } else {
      for (let row = 0; row < scale; row++) {
        matrix.drawLine(pixelX, pixelY + row, pixelX + scale - 1, pixelY + row);
      }
    }
  }

  for (let y = top; y < top + rows; y++) {
    for (let x = left; x < left + columns; x++) {
      const tile = TILES[field[y][x] as keyof typeof TILES];
      drawCell(x, y, BASE_COLORS[tile] ?? BASE_COLORS.empty);
    }
  }
  for (const ghost of ghosts) {
    const color = colors[ghost.type](fade(t - gameState.animations.ghostOffset, gameSettings.ghostsTick, .5)).num();
    drawCell(ghost.x, ghost.y, color);
  }
  drawCell(player.x, player.y, BASE_COLORS.player);
}

function gameLoop(t: number){
  switch(gameState.activeScreen) {
    case STATUS.PLAYING_GAME:
      displayGameScreen(t);
      break;
    case STATUS.INTRO:
      displayIntroScreen();
      break;
    default:
      break;
  }
}

//////////////////////
// INIT
//////////////////////


let activation = 0;
let detachInput: (() => void) | undefined;

function init(state: ModeState) {
  deactivate();
  matrix = state.matrix;
  const currentActivation = activation;
  matrix.sync();
    // Load level

    readPng('munch-lvl.png')
    .then(img => {
        if (currentActivation !== activation) return;

        gameSettings.grid = '';
        for (let y = 0; y < img.height; y++) {
          for (let x = 0; x < img.width; x++) {
            const offset = (y * img.width + x) * 4;
            const tile = MAP_LOOKUP[chroma(img.data.readUIntBE(offset, 3)).hex()] ?? 'W';
            // Leave one unlit cell between pellets along the corridors.
            gameSettings.grid += tile === 'D' && (x + y) % 2 === 0 ? 'O' : tile;
          }
          gameSettings.grid += '\n';
        }
        resetGame();
        timers.schedule(handlePlayerMovement, gameSettings.playerTick);
        timers.schedule(handleGhostMovement, 2000);

        matrix.afterSync((mat, dt, t) => {
          timers.schedule(() => {
            matrix.clear();
            gameLoop(t);
            matrix.sync();
          }, 1000 / 30);
        });
        matrix.clear();
        gameLoop(0);
        matrix.sync();
    })
    .catch(err => {
      console.error(err);
    });

    const stdin = process.stdin;
    if (stdin.isTTY) {
      const wasRaw = stdin.isRaw;
      const wasFlowing = stdin.readableFlowing;
      function handleInput(bytes: Buffer | string) {
        const key = bytes.toString();
        if (key === '\u0003') process.exit();
        if (key === 'x') detachInput?.();
        const direction = terminalDirections.get(key);
        if (direction) move(direction);
        process.stdout.write(key);
      }

      stdin.setRawMode(true);
      stdin.on('data', handleInput);
      stdin.resume();
      detachInput = () => {
        stdin.off('data', handleInput);
        stdin.setRawMode(wasRaw);
        if (!wasFlowing) stdin.pause();
        detachInput = undefined;
      };
    }
}

function deactivate() {
  activation++;
  manualControl = false;
  pendingDirection = undefined;
  detachInput?.();
  timers.clear();
}


const Munchman = { init, deactivate, move };

export { Munchman };
