import { Fragment, useContext, useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { canPlaceShip, fleetCoordinate, fleetLengths, fleetMode, fleetSize, shipCells } from '../../../../shared/fleet-strike';
import type { FleetAction, FleetCell, FleetShip } from '../../../../shared/fleet-strike';
import { GAME_INPUT, GAME_JOIN, GAME_LEAVE, games } from '../../../../shared/games';
import { ConnectionContext } from '../providers/ConnectionContext';
import './FleetController.css';

const glyph = { water: '', ship: '', miss: '·', hit: '×', sunk: '⊗' };
const fleetArt = `${import.meta.env.BASE_URL}fleet/`;

function FleetGrid({ label, cells, selected, ship = [], vessels = [], allowed, onSelect }: {
  label: string;
  cells: FleetCell[];
  selected?: number | null;
  ship?: number[];
  vessels?: FleetShip[];
  allowed?(cell: number): boolean;
  onSelect?(cell: number): void;
}) {
  return (
    <section className="Fleet-board" aria-label={label}>
      <h3>{label}</h3>
      <div className="Fleet-grid" style={{ gridTemplateColumns: `1.3rem repeat(${fleetSize}, 1fr)` }}>
        <img className="Fleet-water" src={`${fleetArt}water.webp`} alt="" draggable={false}
          style={{ gridArea: `2 / 2 / span ${fleetSize} / span ${fleetSize}` }} />
        <span />
        {Array.from({ length: fleetSize }, (_, column) => <span aria-hidden="true" key={column}>{column + 1}</span>)}
        {Array.from({ length: fleetSize }, (_, row) => (
          <Fragment key={row}>
            <span aria-hidden="true">{String.fromCharCode(65 + row)}</span>
            {cells.slice(row * fleetSize, (row + 1) * fleetSize).map((state, column) => {
              const cell = row * fleetSize + column;
              const name = `${fleetCoordinate(cell)}${state === 'water' ? '' : `, ${state}`}`;
              const className = `Fleet-cell Fleet-cell--${state}${ship.includes(cell) ? ' Fleet-cell--selected-ship' : ''}`;
              return onSelect ? (
                <button key={cell} type="button" className={className} aria-label={name}
                  aria-pressed={cell === selected} disabled={!(allowed?.(cell) ?? true)}
                  onClick={() => onSelect(cell)}>
                  <span className="Fleet-mark" aria-hidden="true">{glyph[state]}</span>
                </button>
              ) : <span key={cell} className={className} role="img" aria-label={name}>
                <span className="Fleet-mark" aria-hidden="true">{glyph[state]}</span>
              </span>;
            })}
          </Fragment>
        ))}
        {vessels.map((vessel, index) => {
          const length = fleetLengths[index];
          const row = Math.floor(vessel.bow / fleetSize) + 2;
          const column = vessel.bow % fleetSize + 2;
          const wreck = cells[vessel.bow] === 'sunk';
          const style = {
            gridArea: `${row} / ${column} / span ${vessel.vertical ? length : 1} / span ${vessel.vertical ? 1 : length}`,
            '--fleet-span': length,
          } as CSSProperties;
          return (
            <span aria-hidden="true" key={index} style={style}
              className={`Fleet-vessel${vessel.vertical ? ' Fleet-vessel--vertical' : ''}${wreck ? ' Fleet-vessel--wreck' : ''}`}>
              <img src={`${fleetArt}overhead.webp`} alt="" draggable={false} />
            </span>
          );
        })}
      </div>
    </section>
  );
}

export default function FleetController() {
  const connection = useContext(ConnectionContext);
  const socket = connection?.socket;
  const connected = Boolean(socket?.connected && connection && connection.user >= 0);
  const status = connection?.gameStatus?.mode === fleetMode ? connection.gameStatus : null;
  const fleet = status?.fleet;
  const [selectedShip, selectShip] = useState(0);
  const [target, selectTarget] = useState<number | null>(null);

  useEffect(() => {
    if (!connected || !socket) return;
    socket.emit(GAME_JOIN, fleetMode);
    return () => { if (socket.connected) socket.emit(GAME_LEAVE, fleetMode); };
  }, [socket, connected]);

  function send(action: FleetAction) {
    if (connected && status?.seat != null) socket?.emit(GAME_INPUT, { mode: fleetMode, action });
  }

  function join() {
    if (!status) socket?.emit('changeMode', fleetMode);
    socket?.emit(GAME_JOIN, fleetMode);
  }

  const ship = fleet?.ships[selectedShip];
  const setup = fleet?.phase === 'setup';
  const arranging = setup && connected && !fleet?.ready;
  const canAim = connected && fleet?.phase === 'aim' && status?.seat === fleet.turn;
  const canFire = canAim && target !== null && fleet.targets[target] === 'water';
  const shot = fleet?.lastShot;
  const canRotate = arranging && fleet && ship && canPlaceShip(fleet.ships, selectedShip, { ...ship, vertical: !ship.vertical });
  const staticDemo = import.meta.env.MODE === 'website';

  return (
    <section className="Remote-control Fleet-control" aria-labelledby="fleet-title">
      <div className="Fleet-heading">
        <h2 id="fleet-title">{games[fleetMode].title}</h2>
        <img src={`${fleetArt}broadside.webp`} alt="" draggable={false} />
      </div>
      {fleet && status ? (
        <>
          <div className="Fleet-status" role="status">
            <strong>{status.message}</strong>
            {shot && <span>{shot.seat === status.seat ? 'You' : 'Rival'} · {fleetCoordinate(shot.cell)} · {shot.result}</span>}
          </div>
          {setup ? (
            <>
              {staticDemo && <p>For a two-phone match, open both remotes on the same Obelisk server.</p>}
              <FleetGrid label="Your fleet" cells={fleet.board} vessels={fleet.ships}
                ship={ship ? shipCells(ship, fleetLengths[selectedShip]) : undefined}
                allowed={(bow) => Boolean(ship && canPlaceShip(fleet.ships, selectedShip, { ...ship, bow }))}
                onSelect={arranging && ship ? (bow) => send({ type: 'place', ship: selectedShip, bow, vertical: ship.vertical }) : undefined} />
              <div className="Fleet-arrange">
                <div role="group" aria-label="Select a ship" className="Fleet-tools">
                  {fleetLengths.map((length, index) => (
                    <button type="button" className="Remote-home" key={index} aria-pressed={index === selectedShip}
                      disabled={!arranging} onClick={() => selectShip(index)} aria-label={`Ship ${index + 1}, ${length} cells`}>
                      {'■'.repeat(length)}{index > 0 && <sup>{index}</sup>}
                    </button>
                  ))}
                </div>
                <div className="Fleet-tools">
                  <button type="button" className="Remote-home" disabled={!canRotate} onClick={() => {
                    if (ship) send({ type: 'place', ship: selectedShip, bow: ship.bow, vertical: !ship.vertical });
                  }}>Rotate</button>
                  <button type="button" className="Remote-home" disabled={!arranging} onClick={() => send({ type: 'shuffle' })}>Shuffle</button>
                </div>
              </div>
              <button type="button" className="Game-action Fleet-action" disabled={!connected}
                onClick={() => send({ type: 'ready', ready: !fleet.ready })}>{fleet.ready ? 'Unlock fleet' : 'Lock fleet'}</button>
            </>
          ) : (
            <>
              <div className="Fleet-score" aria-label="Ships sunk">
                <span>You <b>{status.scores[status.seat ?? 0]} / {fleetLengths.length}</b></span>
                <span>Rival <b>{status.scores[status.seat === 0 ? 1 : 0]} / {fleetLengths.length}</b></span>
              </div>
              <FleetGrid label="Target waters" cells={fleet.targets} selected={canAim ? target : null}
                allowed={(cell) => fleet.targets[cell] === 'water'} onSelect={canAim ? selectTarget : undefined} />
              {fleet.phase === 'over' ? (
                <button type="button" className="Game-action Fleet-action" disabled={!connected || fleet.ready}
                  onClick={() => send({ type: 'rematch' })}>{fleet.ready ? 'Waiting for rival' : 'Rematch'}</button>
              ) : (
                <button type="button" className="Game-action Fleet-action" disabled={!canFire} onClick={() => {
                  if (canFire && target !== null) { send({ type: 'fire', cell: target }); selectTarget(null); }
                }}>{canFire && target !== null ? `Fire at ${fleetCoordinate(target)}` : 'Fire'}</button>
              )}
              <FleetGrid label="Your fleet" cells={fleet.board} vessels={fleet.ships} />
              <div className="Fleet-legend"><span>· Miss</span><span>× Hit</span><span>⊗ Sunk</span></div>
            </>
          )}
          <Link className="Remote-home Fleet-leave" to="/">Leave game</Link>
        </>
      ) : (
        <>
          <p role="status">{!connected ? 'Connecting to Obelisk' : status?.players === 2 ? 'Both seats are taken' : games[fleetMode].instructions}</p>
          <div className="Game-navigation">
            <Link className="Remote-home" to="/">Home</Link>
            <button className="Remote-home" type="button" disabled={!connected || status?.players === 2} onClick={join}>Join Fleet Strike</button>
          </div>
        </>
      )}
    </section>
  );
}
