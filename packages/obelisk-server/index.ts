import { existsSync, readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { join, resolve } from 'node:path';
import express from 'express';
import { Server } from 'socket.io';
import type { FontInstance } from 'rpi-led-matrix';
import { controllerPaths, findMode } from '../../shared/modes';
import type { ModeName } from '../../shared/modes';
import { SIMULATOR_SETTINGS, simulatorLayout, UPDATE_SIMULATOR_SETTINGS } from '../../shared/simulator';
import type { SimulatorSettings } from '../../shared/simulator';
import { DISPLAY_CAPABILITY, DISPLAY_FRAME, DISPLAY_NAMESPACE } from '../../shared/panel';
import { defaultVisualSettings } from '../../shared/visual-settings';
import { config, getHardwareOptions, panelOptions } from './config';
import { createGameSession } from './games/session';
import { createPanelRuntime } from './panel/runtime';
import { createControllerHub } from './controller-hub';
import { BitmapFont } from './panel/bitmap-font';
import { resolveSimLayout } from './panel/sim-layout';
import type { PanelMatrix, PlayerData } from './panel/types';
import { VirtualMatrix } from './panel/virtual-matrix';

export function createControllerServer(
  playerData: (PlayerData | undefined)[],
  changeMode: (mode: ModeName) => void,
  display?: {
    matrix: VirtualMatrix;
    settings(): SimulatorSettings;
    update(value: unknown): void;
  },
  game?: ReturnType<typeof createGameSession>,
) {
  const app = express();
  const http = createServer(app);
  const io = new Server(http, {
    allowRequest(request, done) {
      const { origin, host } = request.headers;
      done(null, !origin || Boolean(host && URL.parse(origin)?.host === host));
    },
  });
  const hub = createControllerHub(playerData, changeMode, game);
  io.on('connection', hub.connect);

  if (display) {
    const viewers = io.of(DISPLAY_NAMESPACE);
    viewers.on('connection', (socket) => {
      socket.emit(DISPLAY_FRAME, display.matrix.latest());
      socket.emit(SIMULATOR_SETTINGS, display.settings());
      socket.on(UPDATE_SIMULATOR_SETTINGS, (value: unknown) => {
        display.update(value);
        viewers.emit(SIMULATOR_SETTINGS, display.settings());
      });
    });
  }

  app.get(DISPLAY_CAPABILITY, (_request, response) => {
    response.json({ simulated: Boolean(display) });
  });

  const clientBuild = resolve(__dirname, '../obelisk-client/build');
  app.use(express.static(clientBuild));
  app.get([...Object.values(controllerPaths), '/display'], (_request, response) => {
    response.sendFile(join(clientBuild, 'index.html'));
  });

  return {
    http, io,
    getVisualSettings: hub.getVisualSettings, refreshGame: hub.refreshGame,
  };
}

function main() {
  const simulate = process.argv.includes('--simulate');
  const startValue = process.env.OBELISK_START_MODE?.toLowerCase();
  const startMode = startValue === 'off' ? 'exit' : startValue === 'test' ? 'test' : findMode(startValue ?? 'clock');
  if (!startMode) throw new Error('OBELISK_START_MODE must be a display mode, test, or off.');
  const playerData: (PlayerData | undefined)[] = [];
  const fonts = new Map<string, FontInstance>();
  let createFont = (name: string, path: string): FontInstance => new BitmapFont(name, path, readFileSync(path, 'utf8'));
  let controller: ReturnType<typeof createControllerServer> | undefined;
  let matrix: PanelMatrix | undefined;

  const game = createGameSession(() => controller?.refreshGame());
  const brightness = panelOptions.brightness;
  const geometry = resolveSimLayout(simulate ? process.env.OBELISK_SIM_LAYOUT : undefined, {
    width: panelOptions.cols * panelOptions.chainLength,
    height: panelOptions.rows * panelOptions.parallel,
    tileWidth: panelOptions.cols,
    tileHeight: panelOptions.rows,
  });
  let lastReliableFrame: string | undefined;
  const virtualMatrix = simulate ? new VirtualMatrix(geometry, brightness, (frame) => {
    const signature = `${frame.mode}:${simulatorLayout(frame)}:${frame.brightness}`;
    const viewers = controller?.io.of(DISPLAY_NAMESPACE);
    if (viewers?.sockets.size) {
      if (signature === lastReliableFrame) viewers.volatile.emit(DISPLAY_FRAME, frame);
      else viewers.emit(DISPLAY_FRAME, frame);
    }
    lastReliableFrame = signature;
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
  const runtime = createPanelRuntime({
    matrix, virtualMatrix, panelModes, game, playerData, loadFont, startMode, geometry, brightness,
    visualSettings: () => controller?.getVisualSettings() ?? defaultVisualSettings,
  });
  function changeMode(mode: ModeName | 'test') {
    if (config.verbose && matrix) console.log('Changing mode to', mode);
    runtime.changeMode(mode);
  }

  if (config.runServer || simulate) {
    const dyndnsPath = join(__dirname, 'dyndnsconfig.json');
    if (!simulate && config.initPanel && existsSync(dyndnsPath)) {
      const DynDNSClient = require('node-dyndns-client');
      new DynDNSClient(require(dyndnsPath));
    }

    controller = createControllerServer(playerData, changeMode, virtualMatrix && {
      matrix: virtualMatrix, settings: runtime.getSimulatorSettings, update: runtime.updateSimulatorSettings,
    }, game);
    const { http } = controller;
    const port = Number(process.env.PORT ?? 3001);
    const host = process.env.HOST ?? '127.0.0.1';
    http.listen(port, host, () => {
      const address = http.address();
      console.log(`Obelisk listening on ${host}:${address && typeof address === 'object' ? address.port : port}`);
    });
  }

  if (matrix) changeMode(startMode);
}

if (require.main === module) main();
