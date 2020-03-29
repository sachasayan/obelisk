// LED Matrix
import { LedMatrix } from 'rpi-led-matrix';
import { Billboard, Lightcycles, Munchman, Pong, Pulse, Space, Sunlight, Test } from './modes';

// Config
import { config, matrixOptions, runtimeOptions } from './config';
import { CliMode } from './types';

let server: any = {};
let matrix;
let players = [];
let playerData: {y: number}[] = [{y: 0}];

if (config.runServer){
  let express = require('express');
  let DynDNSClient = require('node-dyndns-client');

  server.app = express();
  server.http = require('http').Server(server.app);
  server.io = require('socket.io')(server.http);
  server.port = process.env.PORT || 80;
  if (config.initPanel){
    server.dyndns = new DynDNSClient({
      url                 : "dynamicdns.park-your-domain.com",
      username            : 'obelisk.me',
      password            : '2861a862d09a436fbf2d72375af94d24',
      network_interface   : 'wlan0',
      protocol            : 'ipv4',
      check               : 60
    });
  }
  let onConnection = (socket) => {
    players = [socket];
    socket.emit('obeliskAssignUser', players.length);
    socket.on('changeMode', (data) => { changeMode(data); });
    socket.on('drawing', (data) => {
      playerData[0] = {y: data.y};
    });
    socket.on('disconnect', (reason) => {
      players = players.filter(s => s.id != socket.id );
      players.forEach((s, i) => s.emit('obeliskAssignUser',  i+1));
    });
  };
  server.io.on('connection', onConnection);
  console.log(__dirname + '/../obelisk-client/build');
  server.app.use(express.static('../obelisk-client/build'));
  server.http.listen(server.port, () => console.log('Server started. Listening on :' + server.port));
}


let changeMode = (mode: string) => {
  let modes = {
    'Billboard': Billboard,
    'Lightcycles': Lightcycles,
    'Munchman': Munchman,
    'Pong': Pong,
    'Pulse': Pulse,
    'Space': Space,
    'Sunlight': Sunlight,
    'Test': Test
  }
  if (config.initPanel && matrix) {
    if (mode === 'exit'){
      matrix.afterSync(() => {});
      matrix.clear().sync();
      process.exit(0);
    }
    matrix.afterSync(() => {});
    modes[mode].init(matrix);
  }
}

if (config.initPanel) {
  (async () => {
    try {
      matrix = new LedMatrix(matrixOptions, runtimeOptions);
      matrix.clear();
    }
    catch (error) {
      console.error(`${__filename} caught: `, error);
    }
  })();

}