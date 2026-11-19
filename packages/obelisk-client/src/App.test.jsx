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
  expect(within(visuals).getAllByRole('button')).toHaveLength(5);
  expect(within(games).getAllByRole('button')).toHaveLength(3);
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

test('Munchman opens its browser controls and sends keyboard and directional input', () => {
  const canvas = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  const socket = Object.assign(new EventEmitter(), {
    connected: true,
    connect: vi.fn(),
    disconnect: vi.fn(),
  });
  vi.mocked(io).mockReturnValue(socket);
  const send = vi.spyOn(socket, 'emit');
  render(<App />);

  act(() => socket.emit('obeliskAssignUser', 0));
  fireEvent.click(screen.getByRole('button', { name: 'Munchman' }));
  expect(send).toHaveBeenCalledWith('changeMode', 'munchman');
  act(() => socket.emit('obeliskInitController', 'munchman'));

  expect(window.location.pathname).toBe('/controller/munchman');
  fireEvent.keyDown(window, { key: 'ArrowRight' });
  expect(send).toHaveBeenCalledWith('munchman:move', 'right');
  fireEvent.keyDown(window, { key: 'w' });
  expect(send).toHaveBeenCalledWith('munchman:move', 'up');
  fireEvent.click(screen.getByRole('button', { name: 'Move down' }));
  expect(send).toHaveBeenCalledWith('munchman:move', 'down');

  fireEvent.click(screen.getByRole('link', { name: 'Home' }));
  expect(screen.getByRole('button', { name: 'Munchman' })).toBeEnabled();
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
    const toggle = screen.getByRole('button', { name: 'Remote' });
    expect(remote).toHaveAttribute('src', '/');
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
