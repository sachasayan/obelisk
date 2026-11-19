import { useContext, useEffect, useEffectEvent, useRef } from 'react';
import type { PointerEvent } from 'react';
import { Link } from 'react-router-dom';
import { isMunchmanDirection, MUNCHMAN_MOVE } from '../../../../shared/munchman';
import type { MunchmanDirection } from '../../../../shared/munchman';
import { ConnectionContext } from '../providers/ConnectionContext';
import { munchmanDirectionForKey } from './munchman-input';
import './MunchmanController.css';

const buttons = [
  { direction: 'up', arrow: '↑', shortcuts: 'ArrowUp W' },
  { direction: 'left', arrow: '←', shortcuts: 'ArrowLeft A' },
  { direction: 'down', arrow: '↓', shortcuts: 'ArrowDown S' },
  { direction: 'right', arrow: '→', shortcuts: 'ArrowRight D' },
] as const;

export default function MunchmanController() {
  const connection = useContext(ConnectionContext);
  const repeatTimer = useRef<number | undefined>(undefined);

  function sendDirection(direction: MunchmanDirection) {
    if (connection?.socket.connected && connection.user >= 0) {
      connection.socket.emit(MUNCHMAN_MOVE, direction);
    }
  }

  const sendFromListener = useEffectEvent(sendDirection);

  function stopRepeating() {
    window.clearInterval(repeatTimer.current);
    repeatTimer.current = undefined;
  }

  function startRepeating(event: PointerEvent<HTMLButtonElement>, direction: MunchmanDirection) {
    if (event.button !== 0 || !event.isPrimary) return;

    stopRepeating();
    event.currentTarget.setPointerCapture(event.pointerId);
    sendDirection(direction);
    repeatTimer.current = window.setInterval(() => sendDirection(direction), 140);
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const direction = munchmanDirectionForKey(event);
      if (!direction) return;

      event.preventDefault();
      sendFromListener(direction);
    }

    function onPreviewInput(event: MessageEvent) {
      if (window.parent === window || event.source !== window.parent || event.origin !== window.location.origin) return;
      if (event.data?.type === MUNCHMAN_MOVE && isMunchmanDirection(event.data.direction)) {
        sendFromListener(event.data.direction);
      }
    }

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('message', onPreviewInput);
    window.addEventListener('blur', stopRepeating);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('message', onPreviewInput);
      window.removeEventListener('blur', stopRepeating);
      stopRepeating();
    };
  }, []);

  return (
    <section aria-labelledby="munchman-title" className="Remote-control">
      <h2 id="munchman-title">Munchman</h2>
      <p>Use the arrow keys, WASD, or the directional pad.</p>
      <div className="MunchmanController-pad" role="group" aria-label="Munchman directional pad">
        {buttons.map(({ direction, arrow, shortcuts }) => (
          <button
            key={direction}
            type="button"
            className={`MunchmanController-${direction}`}
            aria-label={`Move ${direction}`}
            aria-keyshortcuts={shortcuts}
            disabled={!connection || connection.user < 0}
            onPointerDown={(event) => startRepeating(event, direction)}
            onPointerUp={stopRepeating}
            onPointerCancel={stopRepeating}
            onLostPointerCapture={stopRepeating}
            onClick={(event) => {
              if (event.detail === 0) sendDirection(direction);
            }}
          >
            {arrow}
          </button>
        ))}
      </div>
      <Link className="Remote-home" to="/">Home</Link>
    </section>
  );
}
