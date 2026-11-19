import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent, PointerEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';
import GridOnOutlinedIcon from '@mui/icons-material/GridOnOutlined';
import SettingsRemoteOutlinedIcon from '@mui/icons-material/SettingsRemoteOutlined';
import ViewInArOutlinedIcon from '@mui/icons-material/ViewInArOutlined';
import ViewSidebarOutlinedIcon from '@mui/icons-material/ViewSidebarOutlined';
import { io } from 'socket.io-client';
import { MUNCHMAN_CONTROLLER_PATH, MUNCHMAN_MOVE } from '../../../../shared/munchman';
import { munchmanDirectionForKey } from '../components/munchman-input';
import { DISPLAY_FRAME, DISPLAY_NAMESPACE } from '../../../../shared/panel';
import PanelCanvas from './PanelCanvas';
import type { DisplayFrame } from './frame';
import './display.css';

const PanelThree = lazy(() => import('./PanelThree'));
const minDockWidth = 248;
const maxDockWidth = 420;

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
  const [remoteOpen, setRemoteOpen] = useState(true);
  const [dockWidth, setDockWidth] = useState(330);
  const [resizing, setResizing] = useState(false);
  const resizeStart = useRef<{ x: number; width: number } | null>(null);
  const viewport = useRef<HTMLElement>(null);
  const remoteFrame = useRef<HTMLIFrameElement>(null);
  const mode = frame?.mode;

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

  useEffect(() => {
    if (mode !== 'munchman' || status !== 'live') return;

    function forwardMunchmanKey(event: globalThis.KeyboardEvent) {
      const direction = munchmanDirectionForKey(event);
      const remote = remoteFrame.current;
      if (!direction || remote?.contentDocument?.location.pathname !== MUNCHMAN_CONTROLLER_PATH) return;

      event.preventDefault();
      remote.contentWindow?.postMessage({ type: MUNCHMAN_MOVE, direction }, window.location.origin);
    }

    window.addEventListener('keydown', forwardMunchmanKey);
    return () => window.removeEventListener('keydown', forwardMunchmanKey);
  }, [mode, status]);

  function selectView(next: '2d' | '3d') {
    const nextParams = new URLSearchParams(params);
    if (next === '3d') nextParams.set('view', '3d');
    else nextParams.delete('view');
    setParams(nextParams, { replace: true });
  }

  async function toggleFullscreen() {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await viewport.current?.requestFullscreen();
  }

  function updateDockWidth(width: number) {
    const limit = Math.min(maxDockWidth, Math.floor(window.innerWidth * .48));
    setDockWidth(Math.max(minDockWidth, Math.min(width, limit)));
  }

  function startResize(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    event.preventDefault();
    resizeStart.current = { x: event.clientX, width: event.currentTarget.nextElementSibling?.clientWidth ?? dockWidth };
    event.currentTarget.setPointerCapture(event.pointerId);
    setResizing(true);
  }

  function moveResize(event: PointerEvent<HTMLDivElement>) {
    if (resizeStart.current) {
      const { x, width } = resizeStart.current;
      updateDockWidth(width + x - event.clientX);
    }
  }

  function stopResize() {
    resizeStart.current = null;
    setResizing(false);
  }

  function resizeWithKeyboard(event: KeyboardEvent<HTMLDivElement>) {
    const currentWidth = event.currentTarget.nextElementSibling?.clientWidth || dockWidth;
    let width: number;
    switch (event.key) {
      case 'ArrowLeft': width = currentWidth + 16; break;
      case 'ArrowRight': width = currentWidth - 16; break;
      case 'Home': width = minDockWidth; break;
      case 'End': width = maxDockWidth; break;
      default: return;
    }
    event.preventDefault();
    updateDockWidth(width);
  }

  const layout = { '--dock-width': `${dockWidth}px` } as CSSProperties;

  return (
    <main className={`panel-app${resizing ? ' panel-app--resizing' : ''}`} style={layout}>
      <header className="panel-header">
        <div className="panel-identity">
          <img src="/brand/keystone-mark.svg" alt="" width={197} height={336} />
          <h1>Obelisk Simulator</h1>
        </div>
        <button
          type="button"
          className="panel-tool"
          aria-controls="panel-remote"
          aria-pressed={remoteOpen}
          onClick={() => setRemoteOpen(!remoteOpen)}
        >
          <ViewSidebarOutlinedIcon aria-hidden="true" /> Remote
        </button>
      </header>

      <div className={`panel-layout${remoteOpen ? '' : ' panel-layout--collapsed'}`}>
        <section ref={viewport} className="panel-workspace" aria-label="Display preview">
          <div className="panel-toolbar">
            <div className="panel-switch" role="group" aria-label="Panel view">
              <button type="button" aria-pressed={view === '2d'} onClick={() => selectView('2d')}>
                <GridOnOutlinedIcon aria-hidden="true" /> 2D panel
              </button>
              <button type="button" aria-pressed={view === '3d'} onClick={() => selectView('3d')}>
                <ViewInArOutlinedIcon aria-hidden="true" /> 3D installation
              </button>
            </div>
            <div className="panel-actions">
              {view === '2d' && (
                <button type="button" className="panel-tool" aria-pressed={grid} onClick={() => setGrid(!grid)}>Pixel grid</button>
              )}
              {document.fullscreenEnabled && (
                <button
                  type="button"
                  className="panel-tool panel-icon-tool"
                  aria-label={fullscreen ? 'Exit full screen' : 'Full screen'}
                  title={fullscreen ? 'Exit full screen' : 'Full screen'}
                  onClick={() => void toggleFullscreen().catch(() => {})}
                >
                  {fullscreen ? <FullscreenExitIcon aria-hidden="true" /> : <FullscreenIcon aria-hidden="true" />}
                </button>
              )}
            </div>
          </div>

          <div className="panel-viewport" tabIndex={mode === 'munchman' ? 0 : undefined}>
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
        </section>
        {remoteOpen && (
          <div
            className="panel-divider"
            role="separator"
            aria-label="Resize remote"
            aria-controls="panel-remote"
            aria-orientation="vertical"
            aria-valuemin={minDockWidth}
            aria-valuemax={maxDockWidth}
            aria-valuenow={dockWidth}
            tabIndex={0}
            onKeyDown={resizeWithKeyboard}
            onPointerDown={startResize}
            onPointerMove={moveResize}
            onPointerUp={stopResize}
            onPointerCancel={stopResize}
            onLostPointerCapture={stopResize}
          />
        )}
        <aside className="panel-remote" id="panel-remote" aria-label="Remote dock" hidden={!remoteOpen}>
          <header className="panel-remote-title">
            <SettingsRemoteOutlinedIcon aria-hidden="true" />
            <h2>Remote</h2>
          </header>
          <iframe ref={remoteFrame} src="/" title="Obelisk remote" />
        </aside>
      </div>

      <footer className="panel-status">
        <div className="panel-status-line" role="status">
          <span className={`panel-status-dot ${status === 'live' ? 'panel-status-live' : ''}`} />
          {statusText[status]}
        </div>
        {frame && (
          <div className="panel-metadata">
            <span className="panel-mode">{frame.mode === 'exit' ? 'Display off' : frame.mode}</span>
            <span>{frame.width} × {frame.height} pixels</span>
            <span>{(frame.width / frame.tileWidth) * (frame.height / frame.tileHeight)} tiles</span>
            <span>{frame.brightness}% brightness</span>
          </div>
        )}
      </footer>
    </main>
  );
}
