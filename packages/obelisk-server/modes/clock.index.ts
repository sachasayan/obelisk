import {
  Font,
  LayoutUtils,
  HorizontalAlignment,
  VerticalAlignment,
} from 'rpi-led-matrix';

let asyncs = {
  intervals: [],
  timeouts: []
};
let matrix: any;
let fonts;

// let tick = () => {
//   asyncs.timeouts.push(setTimeout(tick, 1000));
// }

function displayGameScreen(){
  matrix.clear();
  let time = new Date();
  let formattedTime = time.toLocaleString('en-US', {
    timeZone: 'America/Toronto',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: true
  });

  // let alignmentH: HorizontalAlignment = HorizontalAlignment.Center;
  // let alignmentV: VerticalAlignment = VerticalAlignment.Middle;

  // const lines = LayoutUtils.textToLines(fonts[0], matrix.width(), String(formattedTime));

  // matrix
  //   .font(fonts[0])
  //   .brightness(10)
  //   .fgColor(0x111111)

  // LayoutUtils.linesToMappedGlyphs(lines, fonts[0].height(), matrix.width(), matrix.height(), alignmentH, alignmentV).map(glyph => {
  //   matrix.drawText(glyph.char, glyph.x, glyph.y);
  // });


  matrix
    .font(fonts[0])
    .fgColor(0x111111)
    .drawText(String(formattedTime), 2, 0);
}

function init (state){
    matrix = state.matrix;
    matrix.clear();

    fonts = [
      new Font('tom-thumb', `${process.cwd()}/fonts/tom-thumb.bdf`)
      // new Font('helvR12', `${process.cwd()}/fonts/helvR12.bdf`)
    ];

    matrix.afterSync((mat, dt, t) => {

      displayGameScreen();
      asyncs.timeouts.push(setTimeout(() => matrix.sync(), 0));
    });




    asyncs.timeouts.push(setTimeout(()=>{ matrix.sync(); }, 1000));


}

function deactivate() {
  asyncs.intervals.map(e => clearInterval(e));
  asyncs.timeouts.map(e => clearTimeout(e));
}

let Clock = { init, deactivate };

export { Clock };


