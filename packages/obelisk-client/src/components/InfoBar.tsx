import { useContext } from 'react';
import { useMatch } from 'react-router-dom';
import { fleetMode } from '../../../../shared/fleet-strike';
import { controllerPaths } from '../../../../shared/modes';
import { ConnectionContext } from '../providers/ConnectionContext';

export default function InfoBar() {
  const connection = useContext(ConnectionContext);
  const user = connection?.user ?? -1;
  const fleet = useMatch(controllerPaths[fleetMode]);
  const gameStatus = connection?.gameStatus;
  const seat = gameStatus?.mode === fleetMode ? gameStatus.seat : null;
  const label = user < 0 ? 'Connecting…'
    : fleet ? (seat === null ? 'Connected' : `Player ${seat + 1}`) : `Player ${user + 1}`;

  return (
    <header className="Remote-header">
      <h1>
        <img className="Remote-logo-mark" src={import.meta.env.BASE_URL + 'brand/keystone-mark.svg'} alt="" width={197} height={336} />
        <img className="Remote-logo-wordmark" src={import.meta.env.BASE_URL + 'brand/keystone-wordmark.svg'} alt="Obelisk" width={938} height={211} />
      </h1>
      <div className="Remote-player" role="status">
        <span className={user >= 0 ? 'Remote-player-dot is-connected' : 'Remote-player-dot'} aria-hidden="true" />
        {label}
      </div>
    </header>
  );
}
