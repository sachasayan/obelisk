import * as Jimp from 'jimp';

import {
  Font
} from 'rpi-led-matrix';
const http = require('http');

let matrix: any;
let fonts;
let nextbusInfo = '';
let streetcar;


let tick = () => {
  http.get('http://webservices.nextbus.com/service/publicJSONFeed?command=predictions&a=ttc&stopId=0816', (resp) => {
    let data = '';

    // A chunk of data has been recieved.
    resp.on('data', (chunk) => {
      data += chunk;
    });

    // The whole response has been received. Print out the result.
    resp.on('end', () => {
      let departuresByRoute = JSON
                    .parse(data).predictions
                    .filter(route => !!route.direction && !!route.direction.prediction);
      nextbusInfo = departuresByRoute.length > 0 ? departuresByRoute[0].direction.prediction[0].minutes : null;
    });
  });
  setTimeout(tick, 60*1000);
}

function displayGameScreen(){

  let time = new Date();
  let formattedTime = time.toLocaleString('en-US', { timeZone: 'America/Toronto', hour: 'numeric', minute: 'numeric', hour12: true });

  matrix
    .font(fonts[0])
    .fgColor(0x333333)
    .drawText(String(formattedTime), 2, 0);

  if(streetcar){
    streetcar.scan(0, 0, streetcar.bitmap.width, streetcar.bitmap.height, function(x, y, idx) {
      let pc = streetcar.getPixelColor(x, y);
      if (pc % 256 == 255) {
        matrix
          .fgColor( (pc - (pc % 256)) / 256)
          .setPixel(
            x + (108 - 12),
            y + 5
          );
      }
    });
  }

  matrix
    .font(fonts[1])
    .fgColor(0x222222)
    .drawText(String(nextbusInfo) + 'm', 110, 5);
}

function init (m){
    matrix = m;
    matrix.clear();

    fonts = [
      new Font('helvR12', `${process.cwd()}/fonts/helvR12.bdf`),
      new Font('5x7', `${process.cwd()}/fonts/5x7.bdf`)
    ];
    //const lines = LayoutUtils.textToLines(font, matrix.width(), 'Hello, matrix!');



    matrix.afterSync((mat, dt, t) => {
      matrix.clear();

      displayGameScreen();

      setTimeout(() => matrix.sync(), 0);
    });


    Jimp.read('./images/streetcar.png')
    .then(img => {
      streetcar = img;
      matrix.sync();
      setTimeout(tick, 1000);
    })
    .catch(err => {
      console.error(err);
    });




}

let Billboard = { init };

export { Billboard };


