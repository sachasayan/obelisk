import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { join } from 'node:path';
import { test } from 'node:test';
import { io } from 'socket.io-client';
import type { Socket } from 'socket.io-client';
import { MUNCHMAN_MOVE } from '../../../shared/munchman';
import { DISPLAY_FRAME, DISPLAY_NAMESPACE } from '../../../shared/panel';
import type { PanelFrame } from '../../../shared/panel';

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

test('the simulator renders real modes and reflects live controller input', { timeout: 15_000 }, async (t) => {
  const server = spawn(process.execPath, [
    '--import', 'tsx', join(__dirname, '../index.ts'), '--simulate',
  ], {
    env: { ...process.env, HOST: '127.0.0.1', PORT: '0' },
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

  const url = `http://127.0.0.1:${port}`;
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

  const testPattern = waitForFrame(viewer, (frame) => frame.mode === 'test');
  controller.emit('changeMode', 'test');
  const pattern = await testPattern;
  assert.deepEqual(pixel(pattern, 0, 0), [255, 0, 0]);
  assert.deepEqual(pixel(pattern, 18, 0), [0, 0, 255]);

  const sunlightFrame = waitForFrame(viewer, (frame) => frame.mode === 'sunlight');
  controller.emit('changeMode', 'sunlight');
  assert.deepEqual(pixel(await sunlightFrame, 0, 0), [204, 221, 204]);

  const firstSpace = waitForFrame(viewer, (frame) => frame.mode === 'space' && frame.rgb.some(Boolean));
  controller.emit('changeMode', 'space');
  const space = await firstSpace;
  await waitForFrame(viewer, (frame) => frame.mode === 'space' && !frame.rgb.equals(space.rgb));

  for (const mode of ['pulse', 'lightcycles']) {
    const frame = waitForFrame(viewer, (frame) => frame.mode === mode && frame.rgb.some(Boolean));
    controller.emit('changeMode', mode);
    await frame;
  }

  const opened = new Promise((resolve) => controller.once('obeliskInitController', resolve));
  const movedRight = waitForFrame(viewer, (frame) =>
    frame.mode === 'munchman' && pixel(frame, 2, 1).join() === '255,255,0');
  controller.emit('changeMode', 'munchman');
  controller.emit(MUNCHMAN_MOVE, 'right');
  assert.equal(await opened, 'munchman');
  const right = await movedRight;

  const afterWall = waitForFrame(viewer, (frame) =>
    frame.mode === 'munchman' && frame.sequence >= right.sequence + 20);
  controller.emit(MUNCHMAN_MOVE, 'up');
  assert.deepEqual(pixel(await afterWall, 2, 1), [255, 255, 0]);

  const movedLeft = waitForFrame(viewer, (frame) =>
    frame.mode === 'munchman' && pixel(frame, 1, 1).join() === '255,255,0');
  controller.emit(MUNCHMAN_MOVE, 'left');
  await movedLeft;

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
