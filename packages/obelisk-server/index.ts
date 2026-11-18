import { existsSync } from 'node:fs';
import { createServer } from 'node:http';
import { join, resolve } from 'node:path';
import express from 'express';
import { Server } from 'socket.io';
import type { Socket } from 'socket.io';
import type { FontInstance } from 'rpi-led-matrix';
import { DISPLAY_CAPABILITY, DISPLAY_FRAME, DISPLAY_NAMESPACE } from '../../shared/panel';
import { config, getHardwareOptions, panelOptions } from './config';
import { BitmapFont } from './panel/bitmap-font';
import type { PanelMatrix, PlayerData } from './panel/types';
import { VirtualMatrix } from './panel/virtual-matrix';

const modeNames = [
  'billboard', 'clock', 'lightcycles', 'munchman', 'pong',
  'pulse', 'space', 'sunlight', 'test', 'exit',
] as const;

type ModeName = typeof modeNames[number];

export function createControllerServer(
  playerData: (PlayerData | undefined)[],
  changeMode: (mode: ModeName) => void,
  display?: VirtualMatrix,
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

  if (display) {
    io.of(DISPLAY_NAMESPACE).on('connection', (socket) => {
      socket.emit(DISPLAY_FRAME, display.latest());
    });
  }

  app.get(DISPLAY_CAPABILITY, (_request, response) => {
    response.json({ simulated: Boolean(display) });
  });

  const clientBuild = resolve(__dirname, '../obelisk-client/build');
  app.use(express.static(clientBuild));
  app.get(['/controller', '/display'], (_request, response) => {
    response.sendFile(join(clientBuild, 'index.html'));
  });

  return { http, io };
}

function main() {
  const simulate = process.argv.includes('--simulate');
  const playerData: (PlayerData | undefined)[] = [];
  const fonts = new Map<string, FontInstance>();
  let createFont = (name: string, path: string): FontInstance => new BitmapFont(name, path);
  let controller: ReturnType<typeof createControllerServer> | undefined;
  let matrix: PanelMatrix | undefined;

  let lastFrameMode: string | undefined;
  const virtualMatrix = simulate ? new VirtualMatrix({
    width: panelOptions.cols * panelOptions.chainLength,
    height: panelOptions.rows * panelOptions.parallel,
    tileWidth: panelOptions.cols,
    tileHeight: panelOptions.rows,
  }, panelOptions.brightness, (frame) => {
    const viewers = controller?.io.of(DISPLAY_NAMESPACE);
    if (frame.mode === lastFrameMode) viewers?.volatile.emit(DISPLAY_FRAME, frame);
    else viewers?.emit(DISPLAY_FRAME, frame);
    lastFrameMode = frame.mode;
  }) : undefined;

  if (virtualMatrix) {
    matrix = virtualMatrix;
  } else if (config.initPanel) {
    const native = require('rpi-led-matrix') as typeof import('rpi-led-matrix');
    const { matrixOptions, runtimeOptions } = getHardwareOptions(native);
    matrix = new native.LedMatrix(matrixOptions, runtimeOptions);
    createFont = (name, path) => new native.Font(name, path);
  }

  function loadFont(name: string) {
    let font = fonts.get(name);
    if (!font) {
      font = createFont(name, join(__dirname, 'fonts', name + '.bdf'));
      fonts.set(name, font);
    }
    return font;
  }

  const panelModes = matrix ? require('./modes') as typeof import('./modes') : undefined;
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
    virtualMatrix?.setMode(mode);
    matrix.afterSync(() => {});
    matrix.clear().sync();
    activeMode = modes[mode];
    activeMode?.init({ matrix, playerData, loadFont });
  }

  if (config.runServer || simulate) {
    const dyndnsPath = join(__dirname, 'dyndnsconfig.json');
    if (!simulate && config.initPanel && existsSync(dyndnsPath)) {
      const DynDNSClient = require('node-dyndns-client');
      new DynDNSClient(require(dyndnsPath));
    }

    controller = createControllerServer(playerData, changeMode, virtualMatrix);
    const { http } = controller;
    const port = Number(process.env.PORT ?? 3001);
    const host = process.env.HOST ?? '127.0.0.1';
    http.listen(port, host, () => {
      const address = http.address();
      console.log(`Obelisk listening on ${host}:${address && typeof address === 'object' ? address.port : port}`);
    });
  }

  if (matrix) changeMode('clock');
}

if (require.main === module) main();
