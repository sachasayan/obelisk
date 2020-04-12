import * as Jimp from 'jimp';

import {
  Font
} from 'rpi-led-matrix';

let asyncs = {
  intervals: [],
  timeouts: []
};
let matrix: any;
let fonts;

let tick = () => {
  asyncs.timeouts.push(setTimeout(tick, 1000));
}

function displayGameScreen(){

  let time = new Date();
  let formattedTime = time.toLocaleString('en-US', {
    timeZone: 'America/Toronto',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: true
  });

  matrix
    .font(fonts[0])
    .fgColor(0x333333)
    .drawText(String(formattedTime), 2, 0);
}

function init (state){
    matrix = state.matrix;
    matrix.clear();

    fonts = [
      new Font('helvR12', `${process.cwd()}/fonts/helvR12.bdf`)
    ];

    matrix.afterSync((mat, dt, t) => {
      matrix.clear();
      displayGameScreen();
      asyncs.timeouts.push(setTimeout(() => matrix.sync(), 0));
    });
    matrix.sync();

    asyncs.timeouts.push(setTimeout(tick, 1000));


}

function deactivate() {
  asyncs.intervals.map(e => clearInterval(e));
  asyncs.timeouts.map(e => clearTimeout(e));
}

let Clock = { init, deactivate };

export { Clock };


