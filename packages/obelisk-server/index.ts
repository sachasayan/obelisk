import { existsSync } from 'node:fs';
import { createServer } from 'node:http';
import { join, resolve } from 'node:path';
import express from 'express';
import { Server } from 'socket.io';
import type { Socket } from 'socket.io';
import type { LedMatrixInstance } from 'rpi-led-matrix';
import { config, matrixOptions, runtimeOptions } from './config';

const modeNames = [
  'billboard', 'clock', 'lightcycles', 'munchman', 'pong',
  'pulse', 'space', 'sunlight', 'test', 'exit',
] as const;

type ModeName = typeof modeNames[number];

interface PlayerData {
  y: number;
}

export function createControllerServer(
  playerData: (PlayerData | undefined)[],
  changeMode: (mode: ModeName) => void,
) {
  const app = express();
  const http = createServer(app);
  const io = new Server(http, {
    allowRequest(request, done) {
      const { origin, host } = request.headers;
      done(null, !origin || Boolean(host && URL.parse(origin)?.host === host));
    },
  });
  const sockets: Socket[] = [];

  io.on('connection', (socket) => {
    const player = sockets.push(socket) - 1;
    playerData.push(undefined);
    socket.emit('obeliskAssignUser', player);

    socket.on('changeMode', (value: unknown) => {
      if (typeof value !== 'string') return;

      const mode = modeNames.find((name) => name === value.toLowerCase());
      if (!mode) return;

      changeMode(mode);
      if (mode === 'pong') socket.emit('obeliskInitController', 'pong');
    });

    socket.on('drawing', (value: { y?: unknown } | null) => {
      const y = value?.y;
      if (typeof y !== 'number' || !Number.isFinite(y) || y < 0 || y > 1) return;

      const player = sockets.indexOf(socket);
      if (player !== -1) playerData[player] = { y };
    });

    socket.on('disconnect', () => {
      const player = sockets.indexOf(socket);
      if (player === -1) return;

      sockets.splice(player, 1);
      playerData.splice(player, 1);
      sockets.forEach((client, index) => client.emit('obeliskAssignUser', index));
    });
  });

  const clientBuild = resolve(__dirname, '../obelisk-client/build');
  app.use(express.static(clientBuild));
  app.get('/controller', (_request, response) => {
    response.sendFile(join(clientBuild, 'index.html'));
  });

  return { http, io };
}

function main() {
  const playerData: (PlayerData | undefined)[] = [];
  let matrix: LedMatrixInstance | undefined;
  const panelModes = config.initPanel ? require('./modes') as typeof import('./modes') : undefined;
  const modes = {
    billboard: panelModes?.Billboard,
    clock: panelModes?.Clock,
    lightcycles: panelModes?.Lightcycles,
    munchman: panelModes?.Munchman,
    pong: panelModes?.Pong,
    pulse: panelModes?.Pulse,
    space: panelModes?.Space,
    sunlight: panelModes?.Sunlight,
    test: panelModes?.Test,
    exit: undefined,
  };
  let activeMode: typeof modes[ModeName];

  function changeMode(mode: ModeName) {
    if (config.verbose) console.log('Changing mode to', mode);
    if (!matrix) return;

    activeMode?.deactivate();
    matrix.afterSync(() => {});
    matrix.clear().sync();
    activeMode = modes[mode];
    activeMode?.init({ matrix, playerData });
  }

  if (config.initPanel && matrixOptions && runtimeOptions) {
    const { LedMatrix } = require('rpi-led-matrix') as typeof import('rpi-led-matrix');
    matrix = new LedMatrix(matrixOptions, runtimeOptions);
    changeMode('clock');
  }

  if (config.runServer) {
    const dyndnsPath = join(__dirname, 'dyndnsconfig.json');
    if (config.initPanel && existsSync(dyndnsPath)) {
      const DynDNSClient = require('node-dyndns-client');
      new DynDNSClient(require(dyndnsPath));
    }

    const { http } = createControllerServer(playerData, changeMode);
    const port = Number(process.env.PORT ?? 3001);
    const host = process.env.HOST ?? '127.0.0.1';
    http.listen(port, host, () => {
      const address = http.address();
      console.log(`Obelisk listening on ${host}:${address && typeof address === 'object' ? address.port : port}`);
    });
  }
}

if (require.main === module) main();
