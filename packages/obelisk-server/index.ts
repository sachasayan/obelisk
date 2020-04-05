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
    let dyndnsConfig = require('./dyndnsconfig.json');
    server.dyndns = new DynDNSClient(dyndnsConfig);
  }
  let onConnection = (socket) => {
    players = [socket];
    console.log("Connected to socket, assigning player", players.length);
    socket.emit('obeliskAssignUser', players.length);

    socket.on('changeMode', (data) => {
      config.verbose ? console.log('Recieved request to change mode to', data) : 0;
      changeMode(data);
      if (data == 'Pong'){
        config.verbose ? console.log('Initializing controller:', data) : 0;
        socket.emit('obeliskInitController', 'pong');
      }
    });
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
  console.log('Changing mode to...', mode);
  let modes = {
    'billboard': Billboard,
    'lightcycles': Lightcycles,
    'munchman': Munchman,
    'pong': Pong,
    'pulse': Pulse,
    'space': Space,
    'sunlight': Sunlight,
    'test': Test
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