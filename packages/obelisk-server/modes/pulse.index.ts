
class Pulser {
  constructor(
    readonly x: number,
    readonly y: number,
    readonly offset: number
  ) { }

  getBrightness(t: number) {
    const s = 100;
    const brightness =  255 * Math.max(0, (s+1) * Math.sin( (t / 1000) + (this.offset * 1000) ) - s);

    return{r: brightness, g: brightness, b: brightness};
  }

  // nextColor(t: number): number {
  //   /** You could easily work position-dependent logic into this expression */
  //   const brightness = 0xFF & Math.max(0, 255 * (Math.sin(this.f * t / 1000)));

  //   return (brightness << 16) | (brightness << 8) | brightness;
  // }
}


function init(state) {
  let {matrix} = state;
  matrix.clear();

  const pulsers: Pulser[] = [];

  for (let x = 0; x < matrix.width(); x++) {
    for (let y = 0; y < matrix.height(); y++) {
      pulsers.push(new Pulser(x, y, 5 * Math.random()));
    }
  }
  matrix.afterSync((mat, dt, t) => {
    pulsers.forEach(pulser => {
      matrix.fgColor(pulser.getBrightness(t)).setPixel(pulser.x, pulser.y);
    });

    setTimeout(() => matrix.sync(), 0);
  });

  matrix.sync();

}

function deactivate() {
}

let Pulse = { init, deactivate };


export { Pulse };
