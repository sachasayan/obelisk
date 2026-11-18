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

import { fade, colors, getAdjacent } from './munchman.utils';

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
  gameState = {
    activeScreen: STATUS.PLAYING_GAME,
    field: gameSettings.grid.trim().split('\n').map(row => row.split('')),
    sickoMode: false,
    ghosts: [new Ghost('inky', 62, 7), new Ghost('binky', 62, 8), new Ghost('pinky', 64, 7), new Ghost('clyde', 64, 8)],
    player: new Player(),
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
  return tile !== undefined && tile !== 'W' && x < matrix.width() && y < matrix.height();
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
    const candidates = getAdjacent(player.x, player.y, matrix)
      .filter(({ x, y }) => x !== player.previous.x || y !== player.previous.y)
      .filter(canEnter);
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
    let candidates = getAdjacent(g.x, g.y, matrix)
      .filter(coords => !(coords.x == g.previous.x && coords.y == g.previous.y)) // Remove where we just came from.
      .filter(canEnter);
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

function displayGameScreen(t: number){

  // Display field
  gameState.field.forEach((row, y) => {
    row.forEach((c, x) => {

    //Previously... .fgColor(c === 'D' ? colors.dot(fade(t, 1000, (x / 128) )).num() : BASE_COLORS[TILES[c]])
    matrix
      .fgColor(BASE_COLORS[TILES[c as keyof typeof TILES]] ?? BASE_COLORS.empty)
      .setPixel(x, y);
    });
  });

  // Display player
  matrix
    .fgColor(BASE_COLORS.player)
    .setPixel(gameState.player.x, gameState.player.y);

  // Display ghosts
  gameState.ghosts.forEach((g, i) => {
    matrix
      .fgColor(colors[g.type](fade(t - gameState.animations.ghostOffset, gameSettings.ghostsTick, 0.5)).num())
      .setPixel(g.x, g.y);
  });

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
    // Load level

    readPng('munch-lvl.png')
    .then(img => {
        if (currentActivation !== activation) return;

        gameSettings.grid = '';
        for (let y = 0; y < img.height; y++) {
          for (let x = 0; x < img.width; x++) {
            const offset = (y * img.width + x) * 4;
            gameSettings.grid += MAP_LOOKUP[chroma(img.data.readUIntBE(offset, 3)).hex()];
          }
          gameSettings.grid += '\n';
        }
        resetGame();
        timers.schedule(handlePlayerMovement, gameSettings.playerTick);
        timers.schedule(handleGhostMovement, 2000);

        matrix.afterSync((mat, dt, t) => {
        matrix.clear();

        gameLoop(t);

        timers.schedule(() => matrix.sync(), 0);
      });
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