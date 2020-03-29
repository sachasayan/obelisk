import * as Jimp from 'jimp';
import * as chroma from 'chroma-js';

let matrix;


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

function init (m){
    matrix = m;
    matrix.clear();

    let rocket;
    const starfield: Star[] = [];

    for (let x = 0; x < matrix.width() * settings.starDensity ; x++) {
      starfield.push(new Star());
    }

    matrix.afterSync((mat, dt, t) => {
      matrix
      .clear();

      starfield.forEach(star => {
        star.step(dt);
        matrix.fgColor(palette(star.distance).num())
        .drawLine(star.x, Math.floor(star.y), star.x, Math.floor( (1- star.distance) * 3 + star.y  ));
        //.setPixel(star.x, Math.floor(star.y));
      });

      if(rocket){
        rocket.scan(0, 0, rocket.bitmap.width, rocket.bitmap.height, function(x, y, idx) {
          let pc = rocket.getPixelColor(x, y);
          if (pc % 256 == 255) {
            matrix
              .fgColor( (pc - (pc % 256)) / 256)
              .setPixel(
                x +
                  (64 - 8) +
                  Math.round(5 * Math.sin(0.5 * Math.PI * (t/1000))), // + // Spread: 5px, Freq: 0.5
                y +
                  1 +
                  Math.round(1 * Math.sin(2 * Math.PI * (t/1000))) // Freq: 2/s, Spread: 3px
              );
          }
        });
      }

      setTimeout(() => matrix.sync(), 40);
    });


    Jimp.read('./images/spaceship.png')
      .then(img => {
        rocket = img;
        matrix.sync();
      })
      .catch(err => {
        console.error(err);
      });

}

let Space = { init };

export { Space };
