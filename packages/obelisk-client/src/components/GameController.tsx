import { useContext, useEffect, useEffectEvent } from 'react';
import { Link } from 'react-router-dom';
import { GAME_INPUT, GAME_JOIN, GAME_LEAVE, games, isGameAction } from '../../../../shared/games';
import type { GameAction, GameMode } from '../../../../shared/games';
import { ConnectionContext } from '../providers/ConnectionContext';
import DirectionalPad from './DirectionalPad';
import { gameActionForKey } from './game-input';

export default function GameController({ mode }: { mode: GameMode }) {
  const connection = useContext(ConnectionContext);
  const { title, instructions, players, action } = games[mode];
  const socket = connection?.socket;
  const connected = Boolean(socket?.connected && connection && connection.user >= 0);
  const status = connection?.gameStatus?.mode === mode ? connection.gameStatus : null;
  const joined = status?.seat != null;

  function send(action: GameAction) {
    if (connected && joined) socket?.emit(GAME_INPUT, { mode, action });
  }

  const keyInput = useEffectEvent((event: KeyboardEvent) => {
    if (!connected || !joined) return;
    const action = gameActionForKey(event);
    if (!action) return;
    event.preventDefault();
    send(action);
  });
  const previewInput = useEffectEvent((event: MessageEvent) => {
    if (window.parent === window || event.source !== window.parent || event.origin !== window.location.origin) return;
    if (event.data?.type === GAME_INPUT && event.data.mode === mode && isGameAction(event.data.action)) {
      send(event.data.action);
    }
  });

  useEffect(() => {
    if (connected) socket?.emit(GAME_JOIN, mode);
  }, [connected, socket, mode]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => keyInput(event);
    const onMessage = (event: MessageEvent) => previewInput(event);
    window.addEventListener('keydown', onKey);
    window.addEventListener('message', onMessage);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('message', onMessage);
    };
  }, []);

  function takeSeat() {
    if (!status) socket?.emit('changeMode', mode);
    socket?.emit(GAME_JOIN, mode);
  }

  return (
    <section aria-labelledby="game-title" className="Remote-control Game-control">
      <h2 id="game-title">{title}</h2>
      <p id="game-input">{instructions}</p>
      {joined && status ? (
        <>
          <div className="Game-status">
            <div className="Game-score">
              {status.scores.map((score, seat) => (
                <span key={seat} className={seat === status.seat ? 'is-local' : undefined}>
                  {seat === status.seat ? 'You' : `P${seat + 1}`}
                  <b>{score}</b>
                </span>
              ))}
            </div>
            <p role="status">{status.message}</p>
          </div>
          <DirectionalPad id="game-input" label={`${title} directional pad`} disabled={!connected} onDirection={send} />
          <button type="button" className="Game-action" disabled={!connected} aria-keyshortcuts="Space Enter"
            onClick={() => send('action')}>{action}</button>
          <div className="Game-navigation">
            <Link className="Remote-home" to="/" onClick={() => socket?.emit(GAME_LEAVE)}>Home</Link>
            <button type="button" className="Remote-home" disabled={!connected} onClick={() => send('restart')}>Restart</button>
          </div>
        </>
      ) : (
        <div className="Game-navigation">
          <Link className="Remote-home" to="/">Home</Link>
          <button className="Remote-home" type="button" disabled={!connected || (status?.players ?? 0) >= players}
            onClick={takeSeat}>{status === null ? 'Play' : status.players >= players ? 'Seats full' : 'Join game'}</button>
        </div>
      )}
    </section>
  );
}
