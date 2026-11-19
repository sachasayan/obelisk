import { useContext, useEffect, useEffectEvent } from 'react';
import { Link } from 'react-router-dom';
import { isMunchmanDirection, MUNCHMAN_MOVE } from '../../../../shared/munchman';
import type { MunchmanDirection } from '../../../../shared/munchman';
import { ConnectionContext } from '../providers/ConnectionContext';
import DirectionalPad from './DirectionalPad';
import { munchmanDirectionForKey } from './munchman-input';

export default function MunchmanController() {
  const connection = useContext(ConnectionContext);

  function sendDirection(direction: MunchmanDirection) {
    if (connection?.socket.connected && connection.user >= 0) {
      connection.socket.emit(MUNCHMAN_MOVE, direction);
    }
  }

  const sendFromListener = useEffectEvent(sendDirection);

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
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('message', onPreviewInput);
    };
  }, []);

  return (
    <section aria-labelledby="munchman-title" className="Remote-control">
      <h2 id="munchman-title">Munchman</h2>
      <p id="munchman-input">Hold or drag on the pad to steer. Arrow keys and WASD also work.</p>
      <DirectionalPad
        id="munchman-input"
        label="Munchman directional pad"
        disabled={!connection || connection.user < 0}
        onDirection={sendDirection}
      />
      <Link className="Remote-home" to="/">Home</Link>
    </section>
  );
}
