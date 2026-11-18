import { EventEmitter } from 'node:events';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { io } from 'socket.io-client';
import { afterEach, expect, test, vi } from 'vitest';
import App from './App';

vi.mock('socket.io-client', () => ({ io: vi.fn() }));
afterEach(cleanup);

test('selects Pong after assignment and keeps the connection when navigating home', () => {
  const socket = Object.assign(new EventEmitter(), {
    connected: true,
    connect: vi.fn(),
    disconnect: vi.fn(),
  });
  vi.mocked(io).mockReturnValue(socket);
  const send = vi.spyOn(socket, 'emit');
  const { unmount } = render(<App />);

  const pong = screen.getByRole('button', { name: 'pong' });
  expect(pong).toBeDisabled();
  act(() => socket.emit('obeliskAssignUser', 0));
  expect(pong).toBeEnabled();

  fireEvent.click(pong);
  expect(send).toHaveBeenCalledWith('changeMode', 'pong');
  act(() => socket.emit('obeliskInitController', 'pong'));
  expect(screen.getByLabelText('Pong touch controller')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('link', { name: 'Home' }));
  expect(screen.getByRole('button', { name: 'pong' })).toBeEnabled();
  expect(socket.connect).toHaveBeenCalledTimes(1);

  act(() => socket.emit('disconnect'));
  expect(screen.getByRole('button', { name: 'pong' })).toBeDisabled();

  unmount();
  expect(socket.listenerCount('obeliskAssignUser')).toBe(0);
  expect(socket.disconnect).toHaveBeenCalledTimes(1);
});

test('the embedded remote stays compact and keeps its connection through Pong and back', () => {
  window.history.replaceState({}, '', '/?embed=1');
  try {
    const socket = Object.assign(new EventEmitter(), {
      connected: true,
      connect: vi.fn(),
      disconnect: vi.fn(),
    });
    vi.mocked(io).mockReturnValue(socket);
    render(<App />);

    act(() => socket.emit('obeliskAssignUser', 0));
    expect(screen.getByRole('status')).toHaveTextContent('Player 1');
    fireEvent.click(screen.getByRole('button', { name: 'pong' }));
    act(() => socket.emit('obeliskInitController', 'pong'));
    expect(window.location.pathname + window.location.search).toBe('/controller?embed=1');
    expect(screen.getByLabelText('Pong touch controller')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Home' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('link', { name: 'Back to modes' }));
    expect(window.location.pathname + window.location.search).toBe('/?embed=1');
    expect(screen.getByRole('button', { name: 'pong' })).toBeEnabled();
    expect(socket.connect).toHaveBeenCalledTimes(1);
  } finally {
    window.history.replaceState({}, '', '/');
  }
});

test('collapsing the dock keeps the same iframe mounted', () => {
  window.history.replaceState({}, '', '/display');
  try {
    vi.mocked(io).mockReturnValue(Object.assign(new EventEmitter(), {
      connect: vi.fn(),
      disconnect: vi.fn(),
    }));
    render(<App />);

    const remote = screen.getByTitle('Obelisk remote');
    const toggle = screen.getByRole('button', { name: 'Remote' });
    expect(remote).toHaveAttribute('src', '/?embed=1');
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
