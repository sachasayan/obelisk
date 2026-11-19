import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { join } from 'node:path';
import { test } from 'node:test';
import type { TestContext } from 'node:test';
import { io } from 'socket.io-client';
import type { Socket } from 'socket.io-client';
import { GAME_INPUT, GAME_JOIN, GAME_STATUS, games } from '../../../shared/games';
import type { GameStatus } from '../../../shared/games';
import { MINUTES_PER_DAY, SIMULATOR_SETTINGS, UPDATE_SIMULATOR_SETTINGS } from '../../../shared/simulator';
import type { SimulatorSettings } from '../../../shared/simulator';
import { DISPLAY_FRAME, DISPLAY_NAMESPACE } from '../../../shared/panel';
import type { PanelFrame } from '../../../shared/panel';
import { UPDATE_VISUAL_SETTINGS } from '../../../shared/visual-settings';

type Frame = PanelFrame<Buffer>;

function waitForFrame(socket: Socket, testFrame: (frame: Frame) => boolean) {
  return new Promise<Frame>((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off(DISPLAY_FRAME, onFrame);
      reject(new Error('Timed out waiting for a matching panel frame'));
    }, 4000);

    function onFrame(frame: Frame) {
      if (testFrame(frame)) {
        clearTimeout(timer);
        socket.off(DISPLAY_FRAME, onFrame);
        resolve(frame);
      }
    }

    socket.on(DISPLAY_FRAME, onFrame);
  });
}

function pixel(frame: Frame, x: number, y: number) {
  const offset = (y * frame.width + x) * 3;
  return Array.from(frame.rgb.subarray(offset, offset + 3));
}

function receive(socket: Socket, event: string) {
  return new Promise<unknown>((resolve) => socket.once(event, resolve));
}

function litPositions(frame: Frame) {
  const positions: number[] = [];
  for (let i = 0; i < frame.rgb.length; i += 3) {
    if (frame.rgb[i] || frame.rgb[i + 1] || frame.rgb[i + 2]) positions.push(i / 3);
  }
  return positions;
}

async function startSimulator(t: TestContext, environment: NodeJS.ProcessEnv = {}) {
  const offlineTransit = 'data:text/javascript,' + encodeURIComponent('globalThis.fetch = async () => new Response(null, {status: 503});');
  const server = spawn(process.execPath, [
    '--import', 'tsx', '--import', offlineTransit, join(__dirname, '../index.ts'), '--simulate',
  ], {
    env: {
      ...process.env, HOST: '127.0.0.1', PORT: '0',
      OBELISK_SIM_LAYOUT: '32x16:4x1', OBELISK_START_MODE: 'clock', ...environment,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  t.after(async () => {
    if (server.exitCode !== null || server.signalCode !== null) return;
    const closed = once(server, 'close');
    server.kill();
    await closed;
  });

  let output = '';
  server.stderr.on('data', (chunk) => { output += String(chunk); });
  const port = await new Promise<string>((resolve, reject) => {
    server.stdout.on('data', (chunk) => {
      output += String(chunk);
      const match = /Obelisk listening on 127.0.0.1:(\d+)/.exec(output);
      if (match) resolve(match[1]);
    });
    server.once('error', reject);
    server.once('exit', () => reject(new Error(output)));
  });

  return `http://127.0.0.1:${port}`;
}

test('the simulator renders real modes and reflects live controller input', { timeout: 15_000 }, async (t) => {
  const url = await startSimulator(t);
  const response = await fetch(url + '/api/panel');
  assert.deepEqual(await response.json(), { simulated: true });

  const viewer = io(url + DISPLAY_NAMESPACE, { autoConnect: false, transports: ['websocket'] });
  t.after(() => { viewer.disconnect(); });
  const clockFrame = waitForFrame(viewer, (frame) => frame.mode === 'clock' && frame.rgb.some(Boolean));
  viewer.connect();
  const clock = await clockFrame;
  assert.deepEqual([clock.width, clock.height, clock.tileWidth, clock.tileHeight], [128, 16, 32, 16]);
  assert.equal(clock.rgb.length, 128 * 16 * 3);

  const controller = io(url, { autoConnect: false, transports: ['websocket'] });
  t.after(() => { controller.disconnect(); });
  const assignment = new Promise((resolve) => controller.once('obeliskAssignUser', resolve));
  controller.connect();
  assert.equal(await assignment, 0, 'a display viewer does not occupy a player slot');

  const openedClock = receive(controller, 'obeliskInitController');
  const greenClock = waitForFrame(viewer, (frame) => frame.mode === 'clock' && frame.rgb.includes(210));
  controller.emit('changeMode', 'clock');
  controller.emit(UPDATE_VISUAL_SETTINGS, { mode: 'clock', font: 'studio', color: '#00d200' });
  assert.equal(await openedClock, 'clock');
  assert.ok((await greenClock).rgb.every((value, i) => i % 3 === 1 || value === 0));

  const sunlightFrame = waitForFrame(viewer, (frame) => frame.mode === 'sunlight');
  controller.emit('changeMode', 'sunlight');
  assert.equal((await sunlightFrame).rgb.length, 128 * 16 * 3);

  const firstSpace = waitForFrame(viewer, (frame) => frame.mode === 'space' && frame.rgb.some(Boolean));
  controller.emit('changeMode', 'starry-night');
  const space = await firstSpace;
  const twinkled = await waitForFrame(viewer, (frame) => frame.mode === 'space' && !frame.rgb.equals(space.rgb));
  assert.deepEqual(litPositions(twinkled), litPositions(space));

  const openedPulse = receive(controller, 'obeliskInitController');
  const dimPulse = waitForFrame(viewer, (frame) => frame.mode === 'pulse' && frame.rgb.some(Boolean)
    && frame.rgb.every((value, i) => i % 3 === 0 ? value <= 102 : value === 0));
  controller.emit(UPDATE_VISUAL_SETTINGS, { mode: 'pulse', color: '#ff0000', intensity: 40 });
  controller.emit('changeMode', 'pulse');
  assert.equal(await openedPulse, 'pulse');
  await dimPulse;
  const mutedPulse = waitForFrame(viewer, (frame) => frame.mode === 'pulse' && !frame.rgb.some(Boolean));
  controller.emit(UPDATE_VISUAL_SETTINGS, { mode: 'pulse', intensity: 0 });
  await mutedPulse;

  const lightcyclesFrame = waitForFrame(viewer, (frame) => frame.mode === 'lightcycles' && frame.rgb.some(Boolean));
  controller.emit('changeMode', 'lightcycles');
  await lightcyclesFrame;

  const lowerPaddle = waitForFrame(viewer, (frame) =>
    frame.mode === 'pong' && pixel(frame, 0, 12)[0] === 255 && pixel(frame, 0, 3)[0] === 0);
  controller.emit('changeMode', 'pong');
  controller.emit('drawing', { y: 0.8 });
  await lowerPaddle;

  const upperPaddle = waitForFrame(viewer, (frame) =>
    frame.mode === 'pong' && pixel(frame, 0, 3)[0] === 255 && pixel(frame, 0, 12)[0] === 0);
  controller.emit('drawing', { y: 0.2 });
  await upperPaddle;

  const blank = waitForFrame(viewer, (frame) => frame.mode === 'exit');
  controller.emit('changeMode', 'exit');
  assert.equal((await blank).rgb.some(Boolean), false);
});

test('Lava Lamp pauses motion and applies color and blob updates while paused', { timeout: 8000 }, async (t) => {
  const url = await startSimulator(t);
  const viewer = io(url + DISPLAY_NAMESPACE, { autoConnect: false, transports: ['websocket'] });
  const remote = io(url, { autoConnect: false, transports: ['websocket'] });
  t.after(() => { viewer.disconnect(); remote.disconnect(); });

  const initial = waitForFrame(viewer, (frame) => frame.mode === 'clock');
  const assigned = receive(remote, 'obeliskAssignUser');
  viewer.connect();
  remote.connect();
  await Promise.all([initial, assigned]);

  const first = waitForFrame(viewer, (frame) => frame.mode === 'lava-lamp');
  remote.emit(UPDATE_VISUAL_SETTINGS, { mode: 'lava-lamp', speed: 0 });
  remote.emit('changeMode', 'lava-lamp');
  const magma = await first;
  assert.ok(magma.rgb.some((value, i) => i % 3 === 0 && value > 200));

  const palette = waitForFrame(viewer, (frame) => frame.mode === 'lava-lamp'
    && pixel(frame, 0, 0)[2] > pixel(frame, 0, 0)[0]);
  remote.emit(UPDATE_VISUAL_SETTINGS, { mode: 'lava-lamp', palette: 'lagoon' });
  const lagoon = await palette;
  assert.ok(!lagoon.rgb.equals(magma.rgb));

  const noMotion = new Promise<boolean>((resolve) => {
    const timer = setTimeout(() => { viewer.off(DISPLAY_FRAME, changed); resolve(true); }, 180);
    function changed() { clearTimeout(timer); resolve(false); }
    viewer.once(DISPLAY_FRAME, changed);
  });
  assert.ok(await noMotion);

  const newBlob = waitForFrame(viewer, (frame) => frame.mode === 'lava-lamp' && !frame.rgb.equals(lagoon.rgb));
  remote.emit(UPDATE_VISUAL_SETTINGS, { mode: 'lava-lamp', blobs: 8 });
  await newBlob;

  const moving = waitForFrame(viewer, (frame) => frame.mode === 'lava-lamp' && frame.rgb.some(Boolean));
  remote.emit(UPDATE_VISUAL_SETTINGS, { mode: 'lava-lamp', speed: 150 });
  const firstMoving = await moving;
  await waitForFrame(viewer, (frame) => frame.mode === 'lava-lamp' && !frame.rgb.equals(firstMoving.rgb));
});

test('the calibration pattern is still available at startup', { timeout: 5000 }, async (t) => {
  const url = await startSimulator(t, { OBELISK_START_MODE: 'test' });
  const viewer = io(url + DISPLAY_NAMESPACE, { autoConnect: false, transports: ['websocket'] });
  t.after(() => { viewer.disconnect(); });
  const pattern = waitForFrame(viewer, (frame) => frame.mode === 'test');
  viewer.connect();
  assert.deepEqual(pixel(await pattern, 0, 0), [255, 0, 0]);
});

test('all remote modes render on small and stacked panels, and off stops frame updates', { timeout: 25_000 }, async (t) => {
  for (const [layout, width, height, tileWidth, tileHeight] of [
    ['8x8:1x1', 8, 8, 8, 8],
    ['8x8:2x1', 16, 8, 8, 8],
    ['16x16:2x2', 32, 32, 16, 16],
    ['16x16:1x3', 16, 48, 16, 16],
  ] as const) {
    await t.test(layout, async (subtest) => {
      const url = await startSimulator(subtest, { OBELISK_SIM_LAYOUT: layout, OBELISK_START_MODE: 'off' });
      const viewer = io(url + DISPLAY_NAMESPACE, { autoConnect: false, transports: ['websocket'] });
      const controller = io(url, { autoConnect: false, transports: ['websocket'] });
      subtest.after(() => { viewer.disconnect(); controller.disconnect(); });
      const firstFrame = waitForFrame(viewer, (frame) => frame.mode === 'exit');
      const assigned = new Promise((resolve) => controller.once('obeliskAssignUser', resolve));
      viewer.connect();
      controller.connect();
      const off = await firstFrame;
      await assigned;
      assert.deepEqual([off.width, off.height, off.tileWidth, off.tileHeight], [width, height, tileWidth, tileHeight]);
      assert.equal(off.rgb.some(Boolean), false);

      for (const mode of ['billboard', 'clock', 'lava-lamp', 'pulse', 'space', 'sunlight', 'lightcycles', 'pong', ...Object.keys(games)]) {
        const painted = waitForFrame(viewer, (frame) => frame.mode === mode && (mode === 'sunlight' || frame.rgb.some(Boolean)));
        controller.emit('changeMode', mode);
        assert.equal((await painted).rgb.length, width * height * 3, mode);
      }

      const stopped = waitForFrame(viewer, (frame) => frame.mode === 'exit');
      controller.emit('changeMode', 'exit');
      assert.equal((await stopped).rgb.some(Boolean), false);
      const unexpected = await new Promise<boolean>((resolve) => {
        const timer = setTimeout(() => resolve(false), 375);
        viewer.once(DISPLAY_FRAME, () => { clearTimeout(timer); resolve(true); });
      });
      assert.equal(unexpected, false, 'the previous animation did not schedule another frame');
    });
  }
});

test('simulated time controls Sunlight immediately and layout and brightness apply to the live panel', { timeout: 8000 }, async (t) => {
  const url = await startSimulator(t, { OBELISK_SUNLIGHT_TIME_ZONE: 'America/Toronto' });
  const viewer = io(url + DISPLAY_NAMESPACE, { autoConnect: false, transports: ['websocket'] });
  t.after(() => { viewer.disconnect(); });

  const settings = receive(viewer, SIMULATOR_SETTINGS);
  viewer.connect();
  const initial = await settings as SimulatorSettings;
  assert.equal(initial.minute, null);
  assert.equal(initial.layout, '32x16:4x1');
  assert.ok(initial.sunset !== null);
  const { sunset } = initial;

  function total(frame: Frame, channel: number) {
    return frame.rgb.reduce((sum, value, i) => i % 3 === channel ? sum + value : sum, 0);
  }

  const warm = waitForFrame(viewer, (frame) => frame.mode === 'sunlight' && total(frame, 0) > total(frame, 2) * 1.6);
  viewer.emit(UPDATE_SIMULATOR_SETTINGS, { minute: Math.round(sunset + (MINUTES_PER_DAY - sunset) * .1) });
  await warm;
  const blue = waitForFrame(viewer, (frame) => frame.mode === 'sunlight' && total(frame, 2) > total(frame, 0) * 2);
  viewer.emit(UPDATE_SIMULATOR_SETTINGS, { minute: Math.round(sunset + (MINUTES_PER_DAY - sunset) * .82) });
  await blue;
  const midnight = waitForFrame(viewer, (frame) => frame.mode === 'sunlight' && !frame.rgb.some(Boolean));
  viewer.emit(UPDATE_SIMULATOR_SETTINGS, { minute: MINUTES_PER_DAY });
  await midnight;

  const reset = receive(viewer, SIMULATOR_SETTINGS);
  const resized = waitForFrame(viewer, (frame) => frame.width === 16 && frame.height === 48 && frame.brightness === 43);
  viewer.emit(UPDATE_SIMULATOR_SETTINGS, { minute: null, layout: '16x16:1x3', brightness: 43 });
  assert.equal((await reset as SimulatorSettings).minute, null);
  assert.equal((await resized).rgb.length, 16 * 48 * 3);

  const rejected = receive(viewer, SIMULATOR_SETTINGS);
  viewer.emit(UPDATE_SIMULATOR_SETTINGS, { minute: -1, layout: '4000x4000:1x1', brightness: 101 });
  const current = await rejected as SimulatorSettings;
  assert.equal(current.minute, null);
  assert.equal(current.layout, '16x16:1x3');
  assert.equal(current.brightness, 43);
});

function waitForGame(socket: Socket, predicate: (value: GameStatus) => boolean) {
  return new Promise<GameStatus>((resolve) => {
    function listener(value: GameStatus | null) {
      if (!value || !predicate(value)) return;
      socket.off(GAME_STATUS, listener);
      resolve(value);
    }
    socket.on(GAME_STATUS, listener);
  });
}

test('two remotes join one round and playing a game updates the panel', { timeout: 12_000 }, async (t) => {
  const url = await startSimulator(t);
  const viewer = io(url + DISPLAY_NAMESPACE, { autoConnect: false, transports: ['websocket'] });
  const first = io(url, { autoConnect: false, transports: ['websocket'] });
  const second = io(url, { autoConnect: false, transports: ['websocket'] });
  t.after(() => { viewer.disconnect(); first.disconnect(); second.disconnect(); });
  viewer.connect();
  const assigned = [receive(first, 'obeliskAssignUser'), receive(second, 'obeliskAssignUser')];
  first.connect();
  second.connect();
  await Promise.all(assigned);

  for (const mode of ['deep-scan', 'stack-duel', 'signal-run', 'echo-keys'] as const) {
    const modeFrame = waitForFrame(viewer, (frame) => frame.mode === mode);
    const primary = waitForGame(first, (status) => status.mode === mode && status.seat === 0);
    first.emit('changeMode', mode);
    first.emit(GAME_JOIN, mode);
    await primary;
    await modeFrame;

    if (games[mode].players === 2) {
      const joined = waitForGame(second, (status) => status.mode === mode && status.seat === 1 && status.players === 2);
      second.emit('changeMode', mode);
      second.emit(GAME_JOIN, mode);
      await joined;
    }

    const latestPaint = waitForFrame(viewer, (frame) => frame.mode === mode && frame.rgb.some(Boolean));
    first.emit(GAME_INPUT, { mode, action: 'restart' });
    const before = await latestPaint;
    const modified = waitForFrame(viewer, (frame) => frame.mode === mode && !frame.rgb.equals(before.rgb));
    first.emit(GAME_INPUT, { mode, action: mode === 'signal-run' ? 'up' : 'action' });
    await modified;
  }
});
