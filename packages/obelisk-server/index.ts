// LED Matrix
import { LedMatrix } from 'rpi-led-matrix';
import { Billboard, Lightcycles, Munchman, Pong, Pulse, Space, Sunlight, Test } from './modes';

// Config
import { config, matrixOptions, runtimeOptions } from './config';
import { CliMode } from './types';

let server: any = {};
let activeMode: {init, deactivate} | null;
let matrix;
let players = [];
let playerData: {y: number}[] = [{y: 0}];

let state = {
  matrix: matrix,
  activeMode: null,
  players: players,
  playerData: playerData
};

let socketOptions = {
  pingTimeout: 1000,
  pingInterval: 1000
};

if (config.runServer){
  let express = require('express');
  let DynDNSClient = require('node-dyndns-client');

  server.app = express();
  server.http = require('http').Server(server.app);
  server.io = require('socket.io')(server.http, socketOptions);
  server.port = process.env.PORT || 80;
  if (config.initPanel){
    let dyndnsConfig = require('./dyndnsconfig.json');
    server.dyndns = new DynDNSClient(dyndnsConfig);
  }
  let onConnection = (socket) => {
    state.players.push(socket);
    console.log("Connected to socket, assigning player", state.players.length);
    socket.emit('obeliskAssignUser', state.players.length);

    // Immediately launch into pong
    //changeMode('pong');
    //socket.emit('obeliskInitController', 'pong');

    socket.on('changeMode', (data) => {
      config.verbose ? console.log('Recieved request to change mode to', data) : 0;
      changeMode(data);
      if (data == 'pong' || data == 'Pong'){
        config.verbose ? console.log('Initializing controller:', data) : 0;
        socket.emit('obeliskInitController', 'pong');
      }
    });
    socket.on('drawing', (data) => {
      state.playerData[0] = {y: data.y};
    });
    socket.on('disconnect', (reason) => {
      console.log('Got a disconnect...', reason);
      state.players = state.players.filter(s => s.id != socket.id );
      state.players.forEach((s, i) => s.emit('obeliskAssignUser',  i+1));
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
    'test': Test,
    'exit': null
  }
  state.activeMode?.deactivate ? state.activeMode.deactivate() : 0;
  state.activeMode = modes[mode];
  if (config.initPanel && state.matrix) {
    if (!state.activeMode){ // Aka, exit
      state.matrix.afterSync(() => {});
      state.matrix.clear().sync();
      //process.exit(0);
    } else {
      state.matrix.afterSync(() => {});
      state.matrix.clear().sync();
      state.activeMode.init(state);
    }
  }
}

if (config.initPanel) {
  (async () => {
    try {
      state.matrix = new LedMatrix(matrixOptions, runtimeOptions);
      state.matrix.clear();
    }
    catch (error) {
      console.error(`${__filename} caught: `, error);
    }
  })();

}