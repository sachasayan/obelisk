import { useContext } from 'react';
import { ConnectionContext } from '../providers/ConnectionContext';

export default function InfoBar() {
  const user = useContext(ConnectionContext)?.user ?? -1;

  return (
    <header className="Remote-header">
      <h1>Obelisk</h1>
      <div className="Remote-player" role="status">
        <span className={user >= 0 ? 'Remote-player-dot is-connected' : 'Remote-player-dot'} aria-hidden="true" />
        {user >= 0 ? `Player ${user + 1}` : 'Connecting…'}
      </div>
    </header>
  );
}
