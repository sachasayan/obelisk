import { useEffect, useEffectEvent, useRef, useState } from 'react';
import type { PointerEvent } from 'react';
import type { GameDirection } from '../../../../shared/games';
import './DirectionalPad.css';

const directions = [
  { name: 'up', x: 120, y: 53, rotation: 0, shortcut: 'ArrowUp W' },
  { name: 'right', x: 187, y: 120, rotation: Math.PI / 2, shortcut: 'ArrowRight D' },
  { name: 'down', x: 120, y: 187, rotation: Math.PI, shortcut: 'ArrowDown S' },
  { name: 'left', x: 53, y: 120, rotation: -Math.PI / 2, shortcut: 'ArrowLeft A' },
] as const;

type Direction = GameDirection;

const faceSize = 240;
const bitmapSize = 600;

export function directionAtPoint(x: number, y: number, previous?: Direction) {
  if (Math.hypot(x, y) < .19 || Math.hypot(x, y) > 1.09) return undefined;

  const horizontal = x < 0 ? 'left' : 'right';
  const vertical = y < 0 ? 'up' : 'down';
  if (Math.abs(Math.abs(x) - Math.abs(y)) < .12 && (previous === horizontal || previous === vertical)) {
    return previous;
  }
  return Math.abs(x) > Math.abs(y) ? horizontal : vertical;
}

function paint(canvas: HTMLCanvasElement, active: Direction | undefined) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const factor = bitmapSize / faceSize;
  ctx.setTransform(factor, 0, 0, factor, 0, 0);
  ctx.clearRect(0, 0, faceSize, faceSize);

  const housing = ctx.createLinearGradient(0, 10, 0, 232);
  housing.addColorStop(0, '#272522');
  housing.addColorStop(1, '#0a090c');
  ctx.fillStyle = housing;
  ctx.strokeStyle = '#3c3630';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(120, 120, 111, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = '#17151a';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(120, 120, 103, 0, Math.PI * 2);
  ctx.stroke();

  const cross = new Path2D('M104 29H136Q150 29 150 43V90H197Q211 90 211 104V136Q211 150 197 150H150V197Q150 211 136 211H104Q90 211 90 197V150H43Q29 150 29 136V104Q29 90 43 90H90V43Q90 29 104 29Z');
  ctx.save();
  ctx.translate(0, 5);
  ctx.fillStyle = '#08070a';
  ctx.fill(cross);
  ctx.restore();

  const surface = ctx.createLinearGradient(38, 29, 188, 208);
  surface.addColorStop(0, '#423b31');
  surface.addColorStop(.58, '#292520');
  surface.addColorStop(1, '#201d1d');
  ctx.fillStyle = surface;
  ctx.fill(cross);
  ctx.strokeStyle = '#635344';
  ctx.lineWidth = 1.4;
  ctx.stroke(cross);

  for (const { name, x, y, rotation } of directions) {
    ctx.save();
    ctx.translate(x, y);

    if (active === name) {
      const accent = ctx.createRadialGradient(0, 0, 4, 0, 0, 21);
      accent.addColorStop(0, '#edab5490');
      accent.addColorStop(1, '#edab5400');
      ctx.fillStyle = accent;
      ctx.fillRect(-21, -21, 42, 42);
    }

    ctx.rotate(rotation);
    ctx.strokeStyle = active === name ? '#fff0b0' : '#d8bd88';
    ctx.lineWidth = 3;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-9, 4);
    ctx.lineTo(0, -5);
    ctx.lineTo(9, 4);
    ctx.stroke();
    ctx.restore();
  }

  ctx.beginPath();
  ctx.arc(120, 120, 16, 0, Math.PI * 2);
  ctx.fillStyle = '#201d1c';
  ctx.fill();
  ctx.strokeStyle = '#484032';
  ctx.lineWidth = 1;
  ctx.stroke();
}

export default function DirectionalPad({ id, label, disabled, onDirection }: {
  id: string;
  label: string;
  disabled: boolean;
  onDirection: (direction: Direction) => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const pointer = useRef<{ id: number; direction?: Direction } | null>(null);
  const [active, setActive] = useState<Direction>();
  const sendRepeat = useEffectEvent(onDirection);

  function release() {
    pointer.current = null;
    setActive(undefined);
  }

  useEffect(() => {
    if (canvas.current) paint(canvas.current, disabled ? undefined : active);
    if (disabled || !active) return;

    const timer = window.setInterval(() => {
      if (pointer.current?.direction === active) sendRepeat(active);
    }, 120);
    return () => window.clearInterval(timer);
  }, [active, disabled]);

  useEffect(() => {
    window.addEventListener('blur', release);
    return () => window.removeEventListener('blur', release);
  }, []);

  useEffect(() => {
    if (disabled) release();
  }, [disabled]);

  function update(event: PointerEvent<HTMLCanvasElement>) {
    const current = pointer.current;
    if (disabled || !current || current.id !== event.pointerId) return;

    const { left, top, width, height } = event.currentTarget.getBoundingClientRect();
    if (!width || !height) return;
    const x = 2 * (event.clientX - left) / width - 1;
    const y = 2 * (event.clientY - top) / height - 1;
    const direction = directionAtPoint(x, y, current.direction);
    if (direction === current.direction) return;

    current.direction = direction;
    setActive(direction);
    if (direction) onDirection(direction);
  }

  function begin(event: PointerEvent<HTMLCanvasElement>) {
    if (disabled || pointer.current || !event.isPrimary || event.button !== 0) return;

    pointer.current = { id: event.pointerId };
    event.currentTarget.setPointerCapture?.(event.pointerId);
    update(event);
  }

  function end(event: PointerEvent<HTMLCanvasElement>) {
    if (pointer.current?.id === event.pointerId) release();
  }

  return (
    <div className="DirectionalPad" role="group" aria-label={label}>
      <canvas
        ref={canvas}
        width={bitmapSize}
        height={bitmapSize}
        aria-label="Drag or hold to steer"
        aria-describedby={id}
        aria-disabled={disabled}
        tabIndex={disabled ? -1 : 0}
        onPointerDown={begin}
        onPointerMove={update}
        onPointerUp={end}
        onPointerCancel={end}
        onLostPointerCapture={end}
      />
      <div className="DirectionalPad-shortcuts">
        {directions.map(({ name, shortcut }) => (
          <button
            key={name}
            type="button"
            aria-keyshortcuts={shortcut}
            disabled={disabled}
            onClick={() => onDirection(name)}
          >
            Move {name}
          </button>
        ))}
      </div>
    </div>
  );
}
