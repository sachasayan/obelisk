import { useContext } from 'react';
import { ConnectionContext } from '../providers/ConnectionContext';

export default function InfoBar() {
  const user = useContext(ConnectionContext)?.user ?? -1;

  return (
    <header className="Remote-header">
      <h1>
        <img className="Remote-logo-mark" src={import.meta.env.BASE_URL + 'brand/keystone-mark.svg'} alt="" width={197} height={336} />
        <img className="Remote-logo-wordmark" src={import.meta.env.BASE_URL + 'brand/keystone-wordmark.svg'} alt="Obelisk" width={938} height={211} />
      </h1>
      <div className="Remote-player" role="status">
        <span className={user >= 0 ? 'Remote-player-dot is-connected' : 'Remote-player-dot'} aria-hidden="true" />
        {user >= 0 ? `Player ${user + 1}` : 'Connecting…'}
      </div>
    </header>
  );
}
