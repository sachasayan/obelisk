import {
  Font,
  LayoutUtils,
  HorizontalAlignment,
  VerticalAlignment,
} from 'rpi-led-matrix';

const alignmentH: HorizontalAlignment = HorizontalAlignment.Center;
const alignmentV: VerticalAlignment = VerticalAlignment.Middle;

let asyncs = {
  intervals: [],
  timeouts: []
};

let matrix: any;
let fonts = [];

// let tick = () => {
//   asyncs.timeouts.push(setTimeout(tick, 1000));
// }

function displayClock(){
  matrix.clear();
  let time = new Date();
  let formattedTime = time.toLocaleString('en-US', {
    timeZone: 'America/Toronto',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: true
  });

  let lines = LayoutUtils.textToLines(fonts[0], matrix.width(), String(formattedTime));

  LayoutUtils.linesToMappedGlyphs(lines, fonts[0].height(), matrix.width(), matrix.height(), alignmentH, alignmentV).map(glyph => {
    matrix.drawText(glyph.char, glyph.x, glyph.y);
  });
}

function init (state){
    matrix = state.matrix;
    matrix.clear();

    fonts = [
      new Font('tom-thumb', `${process.cwd()}/fonts/tom-thumb.bdf`)
    ];

    matrix.afterSync((mat, dt, t) => {
      displayClock();
      asyncs.timeouts.push(setTimeout(() => { matrix.sync(); }, 1000));
    });

    matrix
      .font(fonts[0])
      .brightness(100)
      .fgColor(0x111111)
      .sync();
}

function deactivate() {
  asyncs.intervals.map(e => clearInterval(e));
  asyncs.timeouts.map(e => clearTimeout(e));
}

let DripClock = { init, deactivate };

export { DripClock };


