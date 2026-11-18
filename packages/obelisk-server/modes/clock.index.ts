import {
  Font,
  LayoutUtils,
  HorizontalAlignment,
  VerticalAlignment,
} from 'rpi-led-matrix';

const alignmentH: HorizontalAlignment = HorizontalAlignment.Center;
const alignmentV: VerticalAlignment = VerticalAlignment.Middle;

let frameTimer: NodeJS.Timeout;

let matrix: any;
let fonts = [];

function displayTick(){
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
      displayTick();
      frameTimer = setTimeout(() => matrix.sync(), 1000);
    });

    matrix
      .font(fonts[0])
      .brightness(100)
      .fgColor(0x111111)
      .sync();
}

function deactivate() {
  clearTimeout(frameTimer);
}

let Clock = { init, deactivate };

export { Clock };


