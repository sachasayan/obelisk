import { useContext } from 'react';
import { ConnectionContext } from '../providers/ConnectionContext';
import './ModeSelector.css';

const posters = [
  ['billboard', 'Billboard'],
  ['clock', 'Clock'],
  ['lightcycles', 'Lightcycles'],
  ['munchman', 'Munchman'],
  ['pong', 'Pong'],
  ['pulse', 'Pulse'],
  ['space', 'Space'],
  ['sunlight', 'Sunlight'],
  ['test', 'Test'],
] as const;

export default function ModeSelector() {
  const connection = useContext(ConnectionContext);
  const disabled = !connection || connection.user < 0;

  function select(mode: string) {
    if (connection?.socket.connected) connection.socket.emit('changeMode', mode);
  }

  return (
    <section className="ModeSelector" aria-label="Display modes">
      <div className="ModeSelector-grid">
        {posters.map(([mode, title]) => (
          <button
            type="button"
            className="ModePoster"
            key={mode}
            disabled={disabled}
            onClick={() => select(mode)}
          >
            <img src={`/posters/${mode}.webp`} alt="" decoding="async" />
            <span>{title}</span>
          </button>
        ))}
      </div>
      <button
        type="button"
        className="ModeSelector-exit"
        disabled={disabled}
        onClick={() => select('exit')}
      >
        Exit
      </button>
    </section>
  );
}
