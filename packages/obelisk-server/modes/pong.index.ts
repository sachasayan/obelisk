import {
  LedMatrix,
  LedMatrixUtils,
  Font,
  FontInstance
} from 'rpi-led-matrix';


interface PongGameSettings {
  defaultBallVelocity: number;
  paddleRadius: number;
};

enum STATUS {
  INTRO,
  PLAYING_GAME,
  WIN_SCREEN
}

interface PongGameState {
  activeScreen: STATUS,
  score: number[],
  paddles: number[],
  ball: {
    x: number,
    y: number,
    heading: number,
    velocity: number
  }
};

let gameSettings: PongGameSettings = {
  defaultBallVelocity: 64,
  paddleRadius: 2
};

let gameState: PongGameState;

let asyncs = {
  intervals: [],
  timeouts: []
};
let matrix: any;
let players: any;
let font;

function resetBall() {
  let { paddles } = gameState;
  let heading = paddles[0] > paddles[1] ? 0.75 + ((Math.random() * 0.25) - 0.125) :    // A random value within 45º of straight, randomly left or right.
    paddles[1] < paddles[0] ?  0.25 + ((Math.random() * 0.25) - 0.125) :
    (Math.random() < 0.5 ? 0.25 : 0.75) + ((Math.random() * 0.25) - 0.125);

  gameState.ball = {
    ...gameState.ball,
    x: (Math.floor(matrix.width()/2)),
    y: (Math.floor(matrix.height()/2)),
    heading: heading
  }
}

function resetGameState() {
  gameState = {
    activeScreen: STATUS.PLAYING_GAME,
    score: [0, 0],
    paddles:[Math.floor(matrix.height()/2), Math.floor(matrix.height()/2)],
    ball: {
      x: (Math.floor(matrix.width()/2)),
      y: (Math.floor(matrix.height()/2)),
      heading: (Math.random() < 0.5 ? 0.25 : 0.75) + ((Math.random() * 0.25) - 0.125), // (Math.random() * 0.25) + 0.125 + Math.random() < 0.5 ? 0 : 0.5,   // A random value within 45º of straight, randomly left or right.
      velocity: gameSettings.defaultBallVelocity, // in pixels per second
    },
  }
}

function incrementScore(player: number){
  gameState.score[player]++;
  if (gameState.score[player] >= 10) {
    gameState.activeScreen = STATUS.WIN_SCREEN;
     asyncs.timeouts.push(setTimeout(resetGameState, 2000));
     asyncs.timeouts.push(setTimeout(tick, 3000));
  } else {
    gameState.ball.velocity = gameSettings.defaultBallVelocity + (4*Math.min(...gameState.score));
    resetBall();
    asyncs.timeouts.push(setTimeout(tick, 2000));
  }
}

function inputLoop(t: number){
  // Did paddles change? Should we receive input?
  gameState.paddles[0] = Math.round(players[0].y * matrix.height());

  let certainty = gameState.ball.x / matrix.width();
  let motorImprecision = (3 * Math.sin( Math.PI * (t/1000)));
  gameState.paddles[1] = Math.round(
    ((1-certainty) * (matrix.height()/2)) + //Start with the middle
    (certainty * (gameState.ball.y + motorImprecision)) // Where we're aiming for, with motor imprecision
  );
}

function tick() {
  let ball = gameState.ball;
  // Move ball
  ball.x += Math.sin(Math.PI*ball.heading*2);
  ball.y += Math.cos(Math.PI*ball.heading*2);

  // Hitting edges? Apply reflection
  let reflect = () => {
    ball.heading = ball.heading < 0.5 ? 0.5 - ball.heading : 1.5 - ball.heading;
  }
  if (ball.y < 0){
    ball.y = 0 - ball.y;
    reflect();
  };
  if (ball.y >= matrix.height()){
    ball.y = matrix.height() - (ball.y - matrix.height());
    reflect();
  };

  let getSpread = (paddle: number): number => {
    // IE, get the relative position of the ball to the center of the paddle...
    return ((ball.y - gameState.paddles[paddle])  / gameSettings.paddleRadius) * 0.125; // 0.125 aka no more than 45º off center
  };

  // Did we hit a paddle? Reflect x.
  if ( ball.x < 1  && Math.abs(ball.y - gameState.paddles[0]) <= gameSettings.paddleRadius ){
      ball.x = 1 + (1- ball.x) ;
      ball.heading = 0.25 - getSpread(0);
  }
  if ( ball.x > matrix.width()-1  && Math.abs(ball.y - gameState.paddles[1]) <= gameSettings.paddleRadius ){
      ball.x = matrix.width() + (matrix.width() - 1 - ball.x) ;
      ball.heading = 0.75 + getSpread(1);
  }

  // Check for out of x bounds, if so apply score
  if (ball.x >= 0 && ball.x <= matrix.width()) {
    asyncs.timeouts.push(setTimeout(() => {tick()}, (1 / ball.velocity) * 1000));
  };
  if (ball.x < 0) { incrementScore(0); };
  if (ball.x > matrix.width()) { incrementScore(1); };

}

function displayIntroScreen(){}

function displayGameScreen(){
  let { paddleRadius } = gameSettings;

  matrix
    .fgColor(0x222222)
    .drawLine(matrix.width()/2-1, 0, matrix.width()/2-1, matrix.height()-1)
    .drawLine(matrix.width()/2, 0, matrix.width()/2, matrix.height()-1);

  // Draw paddles
  matrix.fgColor(0xFFFFFF);
  matrix.drawLine(0, gameState.paddles[0] - paddleRadius, 0, gameState.paddles[0] + paddleRadius);
  matrix.drawLine(matrix.width()-1, gameState.paddles[1] - paddleRadius, matrix.width()-1, gameState.paddles[1] + paddleRadius);


   matrix
    .fgColor(0x222222)
    .drawText(String(gameState.score[1]), matrix.width()/2 - 7 - 2, 0)
    .drawText(String(gameState.score[0]), matrix.width()/2 + 2,  0);


  // Draw ball
  matrix
    .fgColor(0xBBFF00)
    .setPixel(Math.floor(gameState.ball.x), Math.floor(gameState.ball.y));
}

function displayWinScreen(){

}

function gameLoop(){
  switch(gameState.activeScreen) {
    case STATUS.PLAYING_GAME:
      displayGameScreen();
      break;
    case STATUS.INTRO:
      displayIntroScreen();
      break;
    case STATUS.WIN_SCREEN:
      displayWinScreen();
      break;
    default:
      break;
  }
}

function init (state){
    players = state.playerData;
    matrix = state.matrix;
    matrix.clear();

    font = new Font('helvR12', `${process.cwd()}/fonts/helvR12.bdf`);
    //const lines = LayoutUtils.textToLines(font, matrix.width(), 'Hello, matrix!');

    matrix.font(font);

    resetGameState();
    asyncs.timeouts.push(setTimeout(tick, 3000));

    matrix.afterSync((mat, dt, t) => {
      matrix.clear();
      inputLoop(t);
      gameLoop();

      asyncs.timeouts.push(setTimeout(() => matrix.sync(), 0));
    });

    matrix.sync();
}

function deactivate() {
  asyncs.intervals.map(e => clearInterval(e));
  asyncs.timeouts.map(e => clearTimeout(e));
}

let Pong = { init, deactivate };

export { Pong };