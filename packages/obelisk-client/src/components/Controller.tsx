import { useContext, useRef } from 'react';
import type { PointerEvent } from 'react';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import { Link } from 'react-router-dom';
import { ConnectionContext } from '../providers/ConnectionContext';
import './Controller.css';

function Controller() {
  const connection = useContext(ConnectionContext);
  const activePointer = useRef<number | null>(null);
  const lastMove = useRef(0);

  function move(event: PointerEvent<HTMLCanvasElement>) {
    const canvas = event.currentTarget;
    const bounds = canvas.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;

    const x = Math.min(1, Math.max(0, (event.clientX - bounds.left) / bounds.width));
    const y = Math.min(1, Math.max(0, (event.clientY - bounds.top) / bounds.height));
    const context = canvas.getContext('2d');
    if (context) {
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.beginPath();
      context.arc(x * canvas.width, y * canvas.height, 10, 0, 2 * Math.PI);
      context.stroke();
      context.fill();
    }

    if (connection?.socket.connected && connection.user >= 0) {
      connection.socket.emit('drawing', { x, y, player: connection.user });
    }
  }

  function start(event: PointerEvent<HTMLCanvasElement>) {
    if (event.button !== 0 || activePointer.current !== null) return;

    activePointer.current = event.pointerId;
    lastMove.current = event.timeStamp;
    event.currentTarget.setPointerCapture(event.pointerId);
    move(event);
  }

  function drag(event: PointerEvent<HTMLCanvasElement>) {
    if (activePointer.current !== event.pointerId || event.timeStamp - lastMove.current < 10) return;

    lastMove.current = event.timeStamp;
    move(event);
  }

  function stop(event: PointerEvent<HTMLCanvasElement>) {
    if (activePointer.current !== event.pointerId) return;

    activePointer.current = null;
    const canvas = event.currentTarget;
    canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
  }

  return (
    <>
      <Paper className="Controller-Paper" elevation={3}>
        <canvas
          aria-label="Pong touch controller"
          width={300}
          height={300}
          onPointerDown={start}
          onPointerMove={drag}
          onPointerUp={stop}
          onPointerCancel={stop}
          onLostPointerCapture={stop}
        />
      </Paper>
      <div style={{ color: 'white', margin: '10px' }}>Psst.. Touch me to control me. ✌️</div>
      <Button className="close" component={Link} to="/">Home</Button>
    </>
  );
}

export default Controller;
