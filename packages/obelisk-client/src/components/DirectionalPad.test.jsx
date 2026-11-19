import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import DirectionalPad, { directionAtPoint } from './DirectionalPad';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

test('a diagonal keeps the held direction until the next arm is decisive', () => {
  expect(directionAtPoint(.5, -.51, 'right')).toBe('right');
  expect(directionAtPoint(.5, -.72, 'right')).toBe('up');
  expect(directionAtPoint(0, .02, 'up')).toBeUndefined();
  expect(directionAtPoint(1.25, 0, 'right')).toBeUndefined();
});

test('a held canvas gesture steers across arms, pauses in the center, and stops on release', () => {
  vi.useFakeTimers();
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  const sendDirection = vi.fn();
  render(<DirectionalPad id="help" label="Directional pad" disabled={false} onDirection={sendDirection} />);
  const canvas = screen.getByLabelText('Drag or hold to steer');
  vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({ left: 0, top: 0, width: 240, height: 240 });
  const touch = { pointerId: 1, isPrimary: true, pointerType: 'touch' };

  fireEvent.pointerDown(canvas, { ...touch, button: 0, clientX: 120, clientY: 52 });
  act(() => vi.advanceTimersByTime(120));
  expect(sendDirection.mock.calls).toEqual([['up'], ['up']]);

  fireEvent.pointerMove(canvas, { ...touch, clientX: 120, clientY: 120 });
  act(() => vi.advanceTimersByTime(360));
  expect(sendDirection).toHaveBeenCalledTimes(2);

  fireEvent.pointerMove(canvas, { ...touch, clientX: 185, clientY: 120 });
  expect(sendDirection).toHaveBeenLastCalledWith('right');
  fireEvent.pointerUp(canvas, touch);
  act(() => vi.advanceTimersByTime(360));
  expect(sendDirection).toHaveBeenCalledTimes(3);
});
