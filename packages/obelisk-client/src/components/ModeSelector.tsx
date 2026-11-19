import { useContext } from 'react';
import { modeGroups } from '../../../../shared/modes';
import type { ModeName } from '../../../../shared/modes';
import { ConnectionContext } from '../providers/ConnectionContext';
import './ModeSelector.css';

export default function ModeSelector() {
  const connection = useContext(ConnectionContext);
  const disabled = !connection || connection.user < 0;

  function select(mode: ModeName) {
    if (connection?.socket.connected) connection.socket.emit('changeMode', mode);
  }

  return (
    <div className="ModeSelector">
      {modeGroups.map(({ title, modes }) => (
        <section className="ModeSelector-group" key={title} aria-labelledby={`modes-${title.toLowerCase()}`}>
          <h2 id={`modes-${title.toLowerCase()}`}>{title}</h2>
          <div className="ModeSelector-grid">
            {modes.map(([mode, label]) => (
              <button type="button" className="ModePoster" key={mode} disabled={disabled} onClick={() => select(mode)}>
                <img src={`${import.meta.env.BASE_URL}posters/${mode}.webp`} alt="" decoding="async" />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </section>
      ))}
      <button
        type="button"
        className="ModeSelector-exit"
        disabled={disabled}
        onClick={() => select('exit')}
      >
        Turn display off
      </button>
    </div>
  );
}
