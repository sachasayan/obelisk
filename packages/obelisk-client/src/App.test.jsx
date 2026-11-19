import { EventEmitter } from 'node:events';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { io } from 'socket.io-client';
import { afterEach, expect, test, vi } from 'vitest';
import App from './App';

vi.mock('socket.io-client', () => ({ io: vi.fn() }));
afterEach(() => {
  cleanup();
  window.history.replaceState({}, '', '/');
});

test('selects Pong after assignment and keeps the connection when navigating home', () => {
  const socket = Object.assign(new EventEmitter(), {
    connected: true,
    connect: vi.fn(),
    disconnect: vi.fn(),
  });
  vi.mocked(io).mockReturnValue(socket);
  const send = vi.spyOn(socket, 'emit');
  const { unmount } = render(<App />);

  expect(screen.getByRole('heading', { name: 'Obelisk', level: 1 })).toBeInTheDocument();
  expect(screen.queryByRole('link', { name: /open virtual panel/i })).not.toBeInTheDocument();
  const visuals = screen.getByRole('region', { name: 'Visuals' });
  const games = screen.getByRole('region', { name: 'Games' });
  expect(within(visuals).getAllByRole('button')).toHaveLength(6);
  expect(within(visuals).getByRole('button', { name: 'Starry Night' })).toBeInTheDocument();
  expect(within(visuals).queryByRole('button', { name: 'Space', exact: true })).not.toBeInTheDocument();
  expect(within(games).getAllByRole('button')).toHaveLength(4);
  expect(within(games).queryByRole('button', { name: 'Munchman' })).not.toBeInTheDocument();
  const pong = within(games).getByRole('button', { name: 'Pong' });
  expect(pong).toBeDisabled();
  act(() => socket.emit('obeliskAssignUser', 0));
  expect(pong).toBeEnabled();

  fireEvent.click(pong);
  expect(send).toHaveBeenCalledWith('changeMode', 'pong');
  act(() => socket.emit('obeliskInitController', 'pong'));
  expect(screen.getByLabelText('Pong touch controller')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('link', { name: 'Home' }));
  expect(screen.getByRole('button', { name: 'Pong' })).toBeEnabled();
  expect(socket.connect).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole('button', { name: 'Turn display off' }));
  expect(send).toHaveBeenCalledWith('changeMode', 'exit');

  act(() => socket.emit('disconnect'));
  expect(screen.getByRole('button', { name: 'Pong' })).toBeDisabled();

  unmount();
  expect(socket.listenerCount('obeliskAssignUser')).toBe(0);
  expect(socket.disconnect).toHaveBeenCalledTimes(1);
});

test('Pulse and Clock open dedicated controls from the mode catalog', () => {
  const socket = Object.assign(new EventEmitter(), { connected: true, connect: vi.fn(), disconnect: vi.fn() });
  vi.mocked(io).mockReturnValue(socket);
  const send = vi.spyOn(socket, 'emit');
  render(<App />);
  act(() => socket.emit('obeliskAssignUser', 0));

  fireEvent.click(screen.getByRole('button', { name: 'Pulse' }));
  expect(send).toHaveBeenCalledWith('changeMode', 'pulse');
  act(() => socket.emit('obeliskInitController', 'pulse'));
  expect(window.location.pathname).toBe('/controller/pulse');
  fireEvent.change(screen.getByRole('slider', { name: 'Intensity' }), { target: { value: '48' } });
  expect(send).toHaveBeenCalledWith('visual:updateSettings', { mode: 'pulse', intensity: 48 });
  fireEvent.click(screen.getByRole('button', { name: 'Rose' }));
  expect(send).toHaveBeenCalledWith('visual:updateSettings', { mode: 'pulse', color: '#ff699c' });

  fireEvent.click(screen.getByRole('link', { name: 'Home' }));
  fireEvent.click(screen.getByRole('button', { name: 'Clock' }));
  expect(send).toHaveBeenCalledWith('changeMode', 'clock');
  act(() => socket.emit('obeliskInitController', 'clock'));
  expect(window.location.pathname).toBe('/controller/clock');
  fireEvent.change(screen.getByRole('combobox', { name: 'Font' }), { target: { value: 'studio' } });
  expect(send).toHaveBeenCalledWith('visual:updateSettings', { mode: 'clock', font: 'studio' });
  fireEvent.click(screen.getByRole('button', { name: 'Mint' }));
  expect(send).toHaveBeenCalledWith('visual:updateSettings', { mode: 'clock', color: '#56ebba' });
  fireEvent.click(screen.getByRole('link', { name: 'Home' }));
});

test('Fleet Strike renders both private grids and confirms a selected shot', () => {
  const socket = Object.assign(new EventEmitter(), { connected: true, connect: vi.fn(), disconnect: vi.fn() });
  vi.mocked(io).mockReturnValue(socket);
  const send = vi.spyOn(socket, 'emit');
  render(<App />);
  act(() => socket.emit('obeliskAssignUser', 4));

  fireEvent.click(screen.getByRole('button', { name: 'Fleet Strike' }));
  act(() => socket.emit('obeliskInitController', 'fleet-strike'));
  expect(send).toHaveBeenCalledWith('game:join', 'fleet-strike');

  const board = Array(36).fill('water');
  for (const cell of [0, 1, 2, 6, 12, 16, 22]) board[cell] = 'ship';
  const targets = Array(36).fill('water');
  targets[35] = 'miss';
  const status = {
    mode: 'fleet-strike', seat: 0, players: 2, message: 'Your turn', scores: [0, 0],
    fleet: { phase: 'aim', board, targets, ships: [
      { bow: 0, vertical: false }, { bow: 6, vertical: true }, { bow: 16, vertical: true },
    ], ready: true, turn: 0, winner: null, lastShot: null },
  };
  act(() => socket.emit('game:status', status));
  expect(screen.getByText('Player 1')).toBeInTheDocument();

  const aim = screen.getByRole('region', { name: 'Target waters' });
  const ownFleet = screen.getByRole('region', { name: 'Your fleet' });
  expect(within(ownFleet).getByLabelText('A1, ship')).toBeInTheDocument();
  expect(ownFleet.querySelectorAll('.Fleet-vessel--vertical')).toHaveLength(2);
  expect(aim.querySelector('.Fleet-vessel')).toBeNull();
  expect(within(aim).queryByLabelText('A1, ship')).not.toBeInTheDocument();
  expect(within(aim).getByRole('button', { name: 'F6, miss' })).toBeDisabled();
  fireEvent.click(within(aim).getByRole('button', { name: 'B4' }));
  fireEvent.click(screen.getByRole('button', { name: 'Fire at B4' }));
  expect(send).toHaveBeenCalledWith('game:input', { mode: 'fleet-strike', action: { type: 'fire', cell: 9 } });

  act(() => socket.emit('game:status', { ...status, fleet: { ...status.fleet, phase: 'firing' } }));
  expect(screen.getByRole('button', { name: 'Fire' })).toBeDisabled();
  fireEvent.click(screen.getByRole('link', { name: 'Leave game' }));
  expect(send).toHaveBeenCalledWith('game:leave', 'fleet-strike');
});

test('Lava Lamp opens and sends its palette, speed, and blob count', () => {
  const socket = Object.assign(new EventEmitter(), { connected: true, connect: vi.fn(), disconnect: vi.fn() });
  vi.mocked(io).mockReturnValue(socket);
  const send = vi.spyOn(socket, 'emit');
  render(<App />);
  act(() => socket.emit('obeliskAssignUser', 0));
  fireEvent.click(screen.getByRole('button', { name: 'Lava Lamp' }));
  expect(send).toHaveBeenCalledWith('changeMode', 'lava-lamp');
  act(() => socket.emit('obeliskInitController', 'lava-lamp'));
  expect(window.location.pathname).toBe('/controller/lava-lamp');

  fireEvent.change(screen.getByRole('combobox', { name: 'Palette' }), { target: { value: 'lagoon' } });
  expect(send).toHaveBeenCalledWith('visual:updateSettings', { mode: 'lava-lamp', palette: 'lagoon' });
  fireEvent.change(screen.getByRole('slider', { name: 'Motion speed' }), { target: { value: '0' } });
  expect(screen.getByRole('slider', { name: 'Motion speed' })).toHaveAttribute('aria-valuetext', 'Paused');
  expect(send).toHaveBeenCalledWith('visual:updateSettings', { mode: 'lava-lamp', speed: 0 });
  fireEvent.change(screen.getByRole('slider', { name: 'Blob count' }), { target: { value: '7' } });
  expect(send).toHaveBeenCalledWith('visual:updateSettings', { mode: 'lava-lamp', blobs: 7 });
});

test('Stack Duel joins its game and sends keyboard and pad input', () => {
  const canvas = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  const socket = Object.assign(new EventEmitter(), { connected: true, connect: vi.fn(), disconnect: vi.fn() });
  vi.mocked(io).mockReturnValue(socket);
  const send = vi.spyOn(socket, 'emit');
  render(<App />);

  act(() => socket.emit('obeliskAssignUser', 0));
  fireEvent.click(screen.getByRole('button', { name: 'Stack Duel' }));
  expect(send).toHaveBeenCalledWith('changeMode', 'stack-duel');
  act(() => socket.emit('obeliskInitController', 'stack-duel'));
  expect(send).toHaveBeenCalledWith('game:join', 'stack-duel');
  act(() => socket.emit('game:status', { mode: 'stack-duel', seat: 0, players: 1, message: 'Solo', scores: [0, 0] }));

  expect(window.location.pathname).toBe('/controller/stack-duel');
  fireEvent.keyDown(window, { key: 'ArrowRight' });
  expect(send).toHaveBeenCalledWith('game:input', { mode: 'stack-duel', action: 'right' });
  fireEvent.click(screen.getByRole('button', { name: 'Move down' }));
  expect(send).toHaveBeenCalledWith('game:input', { mode: 'stack-duel', action: 'down' });
  fireEvent.click(screen.getByRole('button', { name: 'Drop' }));
  expect(send).toHaveBeenCalledWith('game:input', { mode: 'stack-duel', action: 'action' });

  fireEvent.click(screen.getByRole('link', { name: 'Home' }));
  expect(send).toHaveBeenCalledWith('game:leave');
  expect(screen.getByRole('button', { name: 'Stack Duel' })).toBeEnabled();
  expect(socket.connect).toHaveBeenCalledTimes(1);
  canvas.mockRestore();
});

test('the dock embeds the standard remote and keeps it mounted when collapsed', () => {
  window.history.replaceState({}, '', '/display');
  try {
    vi.mocked(io).mockReturnValue(Object.assign(new EventEmitter(), {
      connect: vi.fn(),
      disconnect: vi.fn(),
    }));
    render(<App />);

    const remote = screen.getByTitle('Obelisk remote');
    const toggle = screen.getByRole('button', { name: 'Sidebar' });
    expect(remote).toHaveAttribute('src', '/');
    fireEvent.click(screen.getByRole('tab', { name: 'Device Settings' }));
    expect(screen.getByRole('tabpanel', { name: 'Device Settings' })).toBeVisible();
    expect(remote.closest('[role=tabpanel]')).toHaveAttribute('hidden');
    fireEvent.keyDown(screen.getByRole('tab', { name: 'Device Settings' }), { key: 'ArrowLeft' });
    expect(remote.closest('[role=tabpanel]')).not.toHaveAttribute('hidden');
    expect(toggle).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(toggle);
    expect(remote.closest('aside')).toHaveAttribute('hidden');
    fireEvent.click(toggle);
    expect(screen.getByTitle('Obelisk remote')).toBe(remote);
    expect(toggle).toHaveAttribute('aria-pressed', 'true');
  } finally {
    window.history.replaceState({}, '', '/');
  }
});
