import { forEachOpaquePixel, readPng } from '../png';
import chroma from 'chroma-js';

let matrix;
let stop = () => {};


const palette = chroma.scale([0xFFFFFF, 0x111111]);
const settings = {
  starDensity: 1
};

class Star {
  distance: number; // Distance (from camera) affects brightness and speed
  y: number;
  x: number;

  constructor() {
    this.distance = 1 - Math.pow(1000, -Math.random());  // 0-1
    this.x = Math.random()* matrix.width();
    this.y = Math.random() * 16;
  }

  step(dt : number) {
    this.y += 100 * (1-this.distance) * (dt/1000);
    if (this.y > 16) {
      this.y -= 32;
    }
  }
}

function init (state){
    matrix = state.matrix;
    matrix.clear();

    const activation = new AbortController();
    let frameTimer: NodeJS.Timeout;
    stop = () => {
      activation.abort();
      clearTimeout(frameTimer);
    };

    let rocket;
    const starfield: Star[] = [];

    for (let x = 0; x < matrix.width() * settings.starDensity ; x++) {
      starfield.push(new Star());
    }

    matrix.afterSync((mat, dt, t) => {
      if (activation.signal.aborted) return;

      matrix
      .clear();

      starfield.forEach(star => {
        star.step(dt);
        matrix.fgColor(palette(star.distance).num())
        .drawLine(star.x, Math.floor(star.y), star.x, Math.floor( (1- star.distance) * 3 + star.y  ));
        //.setPixel(star.x, Math.floor(star.y));
      });

      if(rocket){
        forEachOpaquePixel(rocket, (x, y, color) => {
          matrix.fgColor(color).setPixel(
            x + (64 - 8) + Math.round(5 * Math.sin(0.5 * Math.PI * (t / 1000))),
            y + 1 + Math.round(1 * Math.sin(2 * Math.PI * (t / 1000))),
          );
        });
      }

      frameTimer = setTimeout(() => matrix.sync(), 40);
    });


    readPng('spaceship.png')
      .then(img => {
        rocket = img;
        if (!activation.signal.aborted) matrix.sync();
      })
      .catch(err => {
        console.error(err);
      });

}

function deactivate() {
  stop();
}

let Space = { init, deactivate };

export { Space };
