import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { join } from 'node:path';
import { test } from 'node:test';
import type { TestContext } from 'node:test';
import { io } from 'socket.io-client';
import type { Socket } from 'socket.io-client';
import { MUNCHMAN_MOVE } from '../../../shared/munchman';
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
  controller.emit('changeMode', 'space');
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

  const opened = new Promise((resolve) => controller.once('obeliskInitController', resolve));
  const movedRight = waitForFrame(viewer, (frame) =>
    frame.mode === 'munchman' && pixel(frame, 2, 1).join() === '255,255,0');
  controller.emit('changeMode', 'munchman');
  controller.emit(MUNCHMAN_MOVE, 'right');
  assert.equal(await opened, 'munchman');
  const right = await movedRight;
  assert.deepEqual(pixel(right, 0, 0), [22, 180, 188]);
  assert.deepEqual(pixel(right, 3, 1), [0, 0, 0]);
  assert.deepEqual(pixel(right, 4, 1), [104, 39, 70]);

  const afterWall = waitForFrame(viewer, (frame) =>
    frame.mode === 'munchman' && frame.sequence >= right.sequence + 20);
  controller.emit(MUNCHMAN_MOVE, 'up');
  assert.deepEqual(pixel(await afterWall, 2, 1), [255, 255, 0]);

  const movedLeft = waitForFrame(viewer, (frame) =>
    frame.mode === 'munchman' && pixel(frame, 1, 1).join() === '255,255,0');
  controller.emit(MUNCHMAN_MOVE, 'left');
  assert.deepEqual(pixel(await movedLeft, 2, 1), [0, 0, 0]);

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

      for (const mode of ['billboard', 'clock', 'pulse', 'space', 'sunlight', 'lightcycles', 'munchman', 'pong']) {
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
