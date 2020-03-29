enum BASE_COLORS {
  'wall'   = 0x1919A6,
  'player' = 0xFFFF00,
  'inky'   = 0xFF0000,
  'binky'  = 0xFFB8FF,
  'pinky'  = 0x00FFFF,
  'clyde'  = 0xFFB852,
  'empty'  = 0x000000,
  'dot'    = 0x040404
};

enum MAP_LOOKUP {
  '#3f51b5' = 'W',
  '#000000' = 'O',
  '#333333' = 'O',
  '#ffffff' = 'O',
  '#00ff00' = 'W'
}

enum STATUS {
  INTRO,
  PLAYING_GAME,
  WIN_SCREEN
}

enum TILES {
  W = 'wall',
  O = 'empty',
  D = 'dot'
};

interface Coordinate {
  x: number;
  y: number;
}

interface MunchGameState {
  activeScreen: STATUS,
  field: string[][],
  sickoMode: boolean,
  ghosts: Ghost[],
  inputs: string[],
  player: Player,
  animations: {
    ghostOffset: number
   }
};

interface MunchGameSettings {
  grid: string,
  playerTick: number,
  ghostsTick: number,
  demoMode: boolean
}

class Player {
  x: number;
  y: number;
  intent: Coordinate;
  previous: Coordinate;
  lives: number;

  constructor() {
    this.x = 1;
    this.y = 1;
    this.intent = {x: 1, y: 1};
    this.previous = {x: 1, y: 1};
    this.lives = 3;
  }
}

class Ghost{
  type: string;
  x: number;
  y: number;
  previous: {
    x: number,
    y: number
  };
  status: string;

  constructor(
    t: string,
    x: number,
    y: number
  ) {
    this.type = t;
    this.x = x;
    this.y = y;
    this.previous =  { x: x, y: y};
  }
}

export {
  BASE_COLORS,
  STATUS,
  MAP_LOOKUP,
  TILES,
  MunchGameSettings,
  MunchGameState,
  Ghost,
  Player
};