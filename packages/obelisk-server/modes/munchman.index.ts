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

let asyncs = {
  intervals: [],
  timeouts: []
};
let matrix;

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
    inputs: [],
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

function handlePlayerMovement() {
  let player = gameState.player;
  // Autonomous Movement
  if (!gameState.inputs.length && gameSettings.demoMode){
    let candidates = getAdjacent(player.x, player.y, matrix)
      .filter(coords => !(coords.x == player.previous.x && coords.y == player.previous.y)) // Remove where we just came from.
      .filter(coords => gameState.field[coords.y][coords.x] !== 'W'); //Filter out walls
    let finalCandidate = candidates[Math.floor(Math.random()*candidates.length)];
    if (finalCandidate) {
      gameState.inputs.push('x');
      player.intent.x = finalCandidate.x;
      player.intent.y = finalCandidate.y;
    }

  }

  while (gameState.inputs.length){
    let i = gameState.inputs.shift();
    // Move player
    if (i == 'a') { player.intent.x -= 1; }
    if (i == 'd') { player.intent.x += 1; }
    if (i == 'w') { player.intent.y -= 1; }
    if (i == 's') { player.intent.y += 1; }

    if (gameState.field[player.intent.y][player.intent.x] !== 'W') {
      player.previous.x = player.x;
      player.previous.y = player.y;
      player.x = player.intent.x;
      player.y = player.intent.y;
    } else {
      player.intent.x = player.x;
      player.intent.y = player.y;
    }
    // Eat dot
    if (gameState.field[player.y][player.x] === 'D') {
      gameState.field[player.y][player.x] = 'O'
    }
  }

  hitDetection();
  asyncs.timeouts.push(setTimeout(handlePlayerMovement, gameSettings.playerTick));
}

function handleGhostMovement(){
  gameState.animations.ghostOffset = new Date().getTime();

  gameState.ghosts.forEach(g => {
    // Get all viable candidates.
    let candidates = getAdjacent(g.x, g.y, matrix)
      .filter(coords => !(coords.x == g.previous.x && coords.y == g.previous.y)) // Remove where we just came from.
      .filter(coords => gameState.field[coords.y][coords.x] !== 'W'); //Filter out walls
    let finalCandidate = candidates[Math.floor(Math.random()*candidates.length)];
    g.previous = { x: g.x, y: g.y};
    if (finalCandidate) {
      g.x = finalCandidate.x;
      g.y = finalCandidate.y;
    }
  });
  hitDetection();

  asyncs.timeouts.push(setTimeout(handleGhostMovement, gameSettings.ghostsTick));
}

function hitDetection() {
  let {player, ghosts, field, sickoMode} = gameState;

  // Did player hit a pill? Gobble it up.
  if (field[player.y][player.x] === 'P') {
    field[player.y][player.x] = 'O';
    sickoMode = true;
    asyncs.timeouts.push(setTimeout(() => { sickoMode = false}, 5000));
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
      .fgColor(BASE_COLORS[TILES[c]])
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

function init (state){
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
        asyncs.timeouts.push(setTimeout(handlePlayerMovement, 2000));
        asyncs.timeouts.push(setTimeout(handleGhostMovement, 2000));

        matrix.afterSync((mat, dt, t) => {
        matrix.clear();

        gameLoop(t);

        asyncs.timeouts.push(setTimeout(() => matrix.sync(), 0));
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
        if ('wasd'.includes(key)) gameState.inputs.push(key);
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
  detachInput?.();
  asyncs.intervals.forEach(clearInterval);
  asyncs.timeouts.forEach(clearTimeout);
  asyncs.intervals.length = 0;
  asyncs.timeouts.length = 0;
}


let Munchman = { init, deactivate };

export { Munchman };