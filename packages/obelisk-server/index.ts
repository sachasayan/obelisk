import { existsSync } from 'node:fs';
import { createServer } from 'node:http';
import { join, resolve } from 'node:path';
import express from 'express';
import { Server } from 'socket.io';
import type { Socket } from 'socket.io';
import type { FontInstance } from 'rpi-led-matrix';
import { controllerPath, controllerPaths, findMode } from '../../shared/modes';
import type { ModeName } from '../../shared/modes';
import { GAME_INPUT, GAME_JOIN, GAME_LEAVE, GAME_STATUS, isGameAction, isGameMode } from '../../shared/games';
import { MINUTES_PER_DAY, SIMULATOR_SETTINGS, simulatorGeometry, simulatorLayout, UPDATE_SIMULATOR_SETTINGS } from '../../shared/simulator';
import type { SimulatorSettings } from '../../shared/simulator';
import { DISPLAY_CAPABILITY, DISPLAY_FRAME, DISPLAY_NAMESPACE } from '../../shared/panel';
import { applyVisualSettings, defaultVisualSettings, UPDATE_VISUAL_SETTINGS, VISUAL_SETTINGS } from '../../shared/visual-settings';
import { config, getHardwareOptions, panelOptions } from './config';
import { createGameSession } from './games/session';
import { readSunlightClock } from './modes/sunlight.index';
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
  const sockets: Socket[] = [];
  let visualSettings = defaultVisualSettings;

  io.on('connection', (socket) => {
    const player = sockets.push(socket) - 1;
    playerData.push(undefined);
    socket.emit('obeliskAssignUser', player);
    socket.emit(VISUAL_SETTINGS, visualSettings);

    socket.on('changeMode', (value: unknown) => {
      if (typeof value !== 'string') return;

      const mode = findMode(value);
      if (!mode) return;

      changeMode(mode);
      if (isGameMode(mode)) sendGameStatus(socket);
      if (controllerPath(mode)) socket.emit('obeliskInitController', mode);
    });

    socket.on(UPDATE_VISUAL_SETTINGS, (value: unknown) => {
      const next = applyVisualSettings(visualSettings, value);
      if (next === visualSettings) return;
      visualSettings = next;
      io.emit(VISUAL_SETTINGS, visualSettings);
    });

    socket.on(GAME_JOIN, (next: unknown) => {
      if (!isGameMode(next)) return;
      game?.join(next, socket.id);
      sendGameStatus(socket);
    });

    socket.on(GAME_LEAVE, () => game?.leave(socket.id));
    socket.on(GAME_INPUT, (value: unknown) => {
      if (value && typeof value === 'object' && 'mode' in value && 'action' in value
          && isGameMode(value.mode) && isGameAction(value.action)) {
        game?.input(value.mode, socket.id, value.action);
      }
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
      game?.leave(socket.id);
      sockets.forEach((client, index) => client.emit('obeliskAssignUser', index));
    });
  });

  function sendGameStatus(socket: Socket) {
    socket.emit(GAME_STATUS, game?.status(socket.id) ?? null);
  }

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
    getVisualSettings: () => visualSettings,
    refreshGame: () => sockets.forEach(sendGameStatus),
  };
}

type StartMode = ModeName | 'test';

function main() {
  const simulate = process.argv.includes('--simulate');
  const startValue = process.env.OBELISK_START_MODE?.toLowerCase();
  const startMode = startValue === 'off' ? 'exit' : startValue === 'test' ? 'test' : findMode(startValue ?? 'clock');
  if (!startMode) throw new Error('OBELISK_START_MODE must be a display mode, test, or off.');
  const playerData: (PlayerData | undefined)[] = [];
  const fonts = new Map<string, FontInstance>();
  let createFont = (name: string, path: string): FontInstance => new BitmapFont(name, path);
  let controller: ReturnType<typeof createControllerServer> | undefined;
  let matrix: PanelMatrix | undefined;

  const game = createGameSession(() => controller?.refreshGame());
  let simulatedMinute: number | null = null;
  let brightness = panelOptions.brightness;
  let geometry = resolveSimLayout(simulate ? process.env.OBELISK_SIM_LAYOUT : undefined, {
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
  const modes = {
    billboard: panelModes?.Billboard,
    clock: panelModes?.Clock,
    lightcycles: panelModes?.Lightcycles,
    pong: panelModes?.Pong,
    pulse: panelModes?.Pulse,
    space: panelModes?.Space,
    sunlight: panelModes?.Sunlight,
    test: panelModes?.Test,
    exit: undefined,
  };
  let activeMode: StartMode | undefined;

  function changeMode(mode: StartMode, resize = false) {
    if (!matrix || (!resize && isGameMode(mode) && activeMode === mode)) return;
    if (config.verbose) console.log('Changing mode to', mode);
    const preserveSeats = resize && activeMode === mode && isGameMode(mode);
    if (isGameMode(activeMode)) {
      if (!preserveSeats) game.stop();
    } else if (activeMode) modes[activeMode]?.deactivate();

    activeMode = mode;
    virtualMatrix?.setMode(mode);
    matrix.afterSync(() => {});
    matrix.brightness(brightness).clear();
    const state = {
      matrix, playerData, loadFont,
      visualSettings: () => controller?.getVisualSettings() ?? defaultVisualSettings,
      simulatedMinute: simulate ? () => simulatedMinute : undefined,
    };

    if (isGameMode(mode)) game.start(mode, state, preserveSeats);
    else if (modes[mode]) modes[mode].init(state);
    else matrix.sync();
  }

  function getSimulatorSettings(): SimulatorSettings {
    const { sunset, timeZone } = readSunlightClock();
    return {
      minute: simulatedMinute, sunset: sunset < MINUTES_PER_DAY ? sunset : null,
      timeZone, layout: simulatorLayout(geometry), brightness,
    };
  }

  function updateSimulatorSettings(value: unknown) {
    if (!virtualMatrix || !value || typeof value !== 'object') return;
    let updateTime = false;
    let previewSunlight = false;
    if ('minute' in value) {
      const { minute } = value;
      if (minute === null || (typeof minute === 'number' && Number.isInteger(minute) && minute >= 0 && minute <= MINUTES_PER_DAY)) {
        updateTime = minute !== simulatedMinute;
        simulatedMinute = typeof minute === 'number' ? minute : null;
        previewSunlight = simulatedMinute !== null;
      }
    }
    if ('brightness' in value && typeof value.brightness === 'number' && Number.isInteger(value.brightness)
        && value.brightness >= 0 && value.brightness <= 100) {
      brightness = value.brightness;
      virtualMatrix.brightness(brightness).sync();
    }
    const next = 'layout' in value ? simulatorGeometry(value.layout) : undefined;
    if (next && simulatorLayout(next) !== simulatorLayout(geometry)) {
      geometry = next;
      virtualMatrix.configure(next);
      changeMode(previewSunlight ? 'sunlight' : activeMode ?? startMode, true);
    } else if (previewSunlight && activeMode !== 'sunlight') changeMode('sunlight');
    else if (updateTime && activeMode === 'sunlight') modes.sunlight?.refresh();
  }

  if (config.runServer || simulate) {
    const dyndnsPath = join(__dirname, 'dyndnsconfig.json');
    if (!simulate && config.initPanel && existsSync(dyndnsPath)) {
      const DynDNSClient = require('node-dyndns-client');
      new DynDNSClient(require(dyndnsPath));
    }

    controller = createControllerServer(playerData, changeMode, virtualMatrix && {
      matrix: virtualMatrix, settings: getSimulatorSettings, update: updateSimulatorSettings,
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
