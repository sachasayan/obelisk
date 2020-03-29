//LED Matrix
import { LedMatrix } from 'rpi-led-matrix';
import { Billboard, Lightcycles, Munchman, Pong, Pulse, Space, Sunlight, Test } from './modes';

// CLI
import * as prompts from 'prompts';

//Config
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
    socket.on('drawing', (data) => {
      playerData[0] = {y: data.y};
    });
    socket.on('disconnect', (reason) => {
      players = players.filter(s => s.id != socket.id );
      players.forEach((s, i) => s.emit('obeliskAssignUser',  i+1));
    });
  };
  server.io.on('connection', onConnection);
  server.app.use(express.static(__dirname + '/public'));
  server.http.listen(server.port, () => console.log('Server started. Listening on :' + server.port));
}

if (config.initPanel) {

  const createModeSelector = () => {
    return async () => {
      const { mode } = await prompts({
        name: 'mode',
        type: 'select',
        message: 'What would you like to do?',
        hint: 'Use tab or arrow keys and press enter to select.',
        choices: [
          { value: CliMode.Billboard, title:'🔤 => Billboard' },
          { value: CliMode.Pong, title:'🎾 => Pong' },
          { value: CliMode.Lightcycles, title:'🏍\s => Lightcycles' },
          { value: CliMode.Munchman, title:  '🟡 => Munchman' },
          { value: CliMode.Space, title: '🚀 => Space Adventure' },
          { value: CliMode.Pulse, title:'🕺 => Twinkle' },
          { value: CliMode.Exit, title: '🚪 => Exit' },
          { value: CliMode.Sunlight, title: '🟠 => Sunlight' },
          { value: CliMode.Test, title:  '(Test Mode)' },
        ],
      });
      return mode as CliMode;
    };
  };
  const chooseMode = createModeSelector();

  (async () => {
    try {
      const matrix = new LedMatrix(matrixOptions, runtimeOptions);
      matrix.clear();

      while (true) {
        switch (await chooseMode()) {
          case CliMode.Billboard: {
            matrix.afterSync(() => {});
            Billboard.init(matrix);
            break;
          }
          case CliMode.Test: {
            matrix.afterSync(() => {});
            Test.init(matrix);
            break;
          }
          case CliMode.Munchman: {
            matrix.afterSync(() => {});
            Munchman.init(matrix);
            break;
          }
          case CliMode.Space: {
            matrix.afterSync(() => {});
            Space.init(matrix);
            break;
          }
          case CliMode.Sunlight: {
            matrix.afterSync(() => {});
            Sunlight.init(matrix);
            break;
          }
          case CliMode.Pulse: {
            matrix.afterSync(() => {});
            Pulse.init(matrix);
            break;
          }
          case CliMode.Pong: {
            matrix.afterSync(() => {});
            Pong.init(matrix, playerData);
            break;
          }
          case CliMode.Lightcycles: {
            matrix.afterSync(() => {});
            Lightcycles.init(matrix);
            break;
          }
          case CliMode.Exit: {
            matrix.afterSync(() => {});
            matrix.clear().sync();
            process.exit(0);
          }
        }
      }
    }
    catch (error) {
      console.error(`${__filename} caught: `, error);
    }
  })();

}