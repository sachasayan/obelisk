import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import { DISPLAY_FRAME, DISPLAY_NAMESPACE } from '../../../../shared/panel';
import PanelCanvas from './PanelCanvas';
import type { DisplayFrame } from './frame';
import './display.css';

const PanelThree = lazy(() => import('./PanelThree'));

type Status = 'connecting' | 'live' | 'reconnecting' | 'unavailable';

const statusText: Record<Status, string> = {
  connecting: 'Connecting',
  live: 'Live',
  reconnecting: 'Reconnecting',
  unavailable: 'Simulator unavailable',
};

export default function PanelDisplay() {
  const [params, setParams] = useSearchParams();
  const view = params.get('view') === '3d' ? '3d' : '2d';
  const [frame, setFrame] = useState<DisplayFrame>();
  const [status, setStatus] = useState<Status>('connecting');
  const [grid, setGrid] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const viewport = useRef<HTMLElement>(null);

  useEffect(() => {
    const socket = io(DISPLAY_NAMESPACE, { autoConnect: false });
    socket.on(DISPLAY_FRAME, (next: DisplayFrame) => {
      if (!(next.rgb instanceof ArrayBuffer) || next.rgb.byteLength !== next.width * next.height * 3) return;

      setFrame(next);
      setStatus('live');
    });
    socket.on('connect_error', () => {
      setStatus(socket.active ? 'reconnecting' : 'unavailable');
    });
    socket.on('disconnect', () => setStatus('reconnecting'));
    socket.connect();

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    function update() {
      setFullscreen(document.fullscreenElement === viewport.current);
    }
    document.addEventListener('fullscreenchange', update);
    return () => document.removeEventListener('fullscreenchange', update);
  }, []);

  function selectView(next: '2d' | '3d') {
    setParams(next === '3d' ? { view: '3d' } : {}, { replace: true });
  }

  async function toggleFullscreen() {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await viewport.current?.requestFullscreen();
  }

  return (
    <main className="panel-app">
      <header className="panel-header">
        <div>
          <p className="panel-brand">OBELISK</p>
          <h1>Virtual panel</h1>
        </div>
        <Link className="panel-control-link" to="/" target="_blank" rel="noopener">
          Open controller <span aria-hidden="true">↗</span>
        </Link>
      </header>

      <section ref={viewport} className="panel-workspace" aria-label="Display preview">
        <div className="panel-toolbar">
          <div className="panel-switch" role="group" aria-label="Panel view">
            <button type="button" aria-pressed={view === '2d'} onClick={() => selectView('2d')}>2D panel</button>
            <button type="button" aria-pressed={view === '3d'} onClick={() => selectView('3d')}>3D installation</button>
          </div>
          <div className="panel-actions">
            {view === '2d' && (
              <button type="button" className="panel-tool" aria-pressed={grid} onClick={() => setGrid(!grid)}>Pixel grid</button>
            )}
            {document.fullscreenEnabled && (
              <button type="button" className="panel-tool" onClick={() => void toggleFullscreen().catch(() => {})}>
                {fullscreen ? 'Exit full screen' : 'Full screen'}
              </button>
            )}
          </div>
        </div>

        <div className="panel-viewport">
          {!frame ? (
            <div className="panel-empty" role="status">
              <strong>{statusText[status]}</strong>
              {status === 'unavailable' && <p>Run <code>npm run simulate</code> to start the virtual panel.</p>}
            </div>
          ) : view === '2d' ? (
            <PanelCanvas frame={frame} grid={grid} />
          ) : (
            <Suspense fallback={<div className="panel-empty" role="status">Loading 3D view…</div>}>
              <PanelThree frame={frame} />
            </Suspense>
          )}
        </div>

        <footer className="panel-status">
          <div className="panel-status-line" role="status">
            <span className={`panel-status-dot ${status === 'live' ? 'panel-status-live' : ''}`} />
            {statusText[status]}
          </div>
          {frame && (
            <div className="panel-metadata">
              <span className="panel-mode">{frame.mode === 'exit' ? 'Idle' : frame.mode}</span>
              <span>{frame.width} × {frame.height} pixels</span>
              <span>{(frame.width / frame.tileWidth) * (frame.height / frame.tileHeight)} tiles</span>
              <span>{frame.brightness}% brightness</span>
            </div>
          )}
        </footer>
      </section>
    </main>
  );
}
