import assert from 'node:assert/strict';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import { test } from 'node:test';
import { io } from 'socket.io-client';
import type { Socket } from 'socket.io-client';
import { createControllerServer } from '../index';

function receive(socket: Socket, event: string) {
  return new Promise<unknown>((resolve) => socket.once(event, resolve));
}

test('a disconnected player leaves the remaining controller in the correct slot', { timeout: 5000 }, async (t) => {
  const playerData: ({ y: number } | undefined)[] = [];
  const selected: string[] = [];
  const server = createControllerServer(playerData, (mode) => selected.push(mode));

  const listening = once(server.http, 'listening');
  server.http.listen(0, '127.0.0.1');
  await listening;
  t.after(() => server.io.close());

  const { port } = server.http.address() as AddressInfo;
  const url = `http://127.0.0.1:${port}`;
  const first = io(url, { forceNew: true, autoConnect: false });
  const second = io(url, { forceNew: true, autoConnect: false });
  t.after(() => {
    first.disconnect();
    second.disconnect();
  });

  const firstAssignment = receive(first, 'obeliskAssignUser');
  first.connect();
  assert.equal(await firstAssignment, 0);

  const secondAssignment = receive(second, 'obeliskAssignUser');
  second.connect();
  assert.equal(await secondAssignment, 1);

  const opened = receive(second, 'obeliskInitController');
  second.emit('drawing', { x: 0.5, y: 0.75, player: 1 });
  second.emit('changeMode', 'pong');
  assert.equal(await opened, 'pong');
  assert.deepEqual(selected, ['pong']);
  assert.deepEqual(playerData, [undefined, { y: 0.75 }]);

  const reassigned = receive(second, 'obeliskAssignUser');
  first.disconnect();
  assert.equal(await reassigned, 0);
  assert.deepEqual(playerData, [{ y: 0.75 }]);

  const reopened = receive(second, 'obeliskInitController');
  second.emit('drawing', { x: 0.5, y: 0.25, player: 0 });
  second.emit('changeMode', 'pong');
  await reopened;
  assert.deepEqual(playerData, [{ y: 0.25 }]);
});
