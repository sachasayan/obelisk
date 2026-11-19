import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent, PointerEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';
import GridOnOutlinedIcon from '@mui/icons-material/GridOnOutlined';
import TuneOutlinedIcon from '@mui/icons-material/TuneOutlined';
import SettingsRemoteOutlinedIcon from '@mui/icons-material/SettingsRemoteOutlined';
import ViewInArOutlinedIcon from '@mui/icons-material/ViewInArOutlined';
import ViewSidebarOutlinedIcon from '@mui/icons-material/ViewSidebarOutlined';
import { io } from 'socket.io-client';
import type { Socket } from 'socket.io-client';
import { GAME_INPUT, isGameMode } from '../../../../shared/games';
import { controllerPaths, modeLabel } from '../../../../shared/modes';
import { SIMULATOR_SETTINGS, UPDATE_SIMULATOR_SETTINGS } from '../../../../shared/simulator';
import type { SimulatorSettings, SimulatorUpdate } from '../../../../shared/simulator';
import { gameActionForKey } from '../components/game-input';
import DeviceSettings from './DeviceSettings';
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
  const [device, setDevice] = useState<SimulatorSettings>();
  const dockTab = params.get('tab') === 'device' ? 'device' : 'remote';
  const displaySocket = useRef<Socket | null>(null);
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
    displaySocket.current = socket;
    socket.on(SIMULATOR_SETTINGS, setDevice);
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
      displaySocket.current = null;
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

  function forwardGameKey(event: KeyboardEvent<HTMLDivElement>) {
    if (!isGameMode(mode) || status !== 'live' || dockTab !== 'remote' || !remoteOpen ||
        (mode === 'echo-keys' && event.repeat)) return;
    const action = gameActionForKey(event.nativeEvent);
    const remote = remoteFrame.current;
    if (!action || remote?.contentDocument?.location.pathname !== controllerPaths[mode]) return;
    event.preventDefault();
    remote.contentWindow?.postMessage({ type: GAME_INPUT, mode, action }, window.location.origin);
  }

  function updateDevice(update: SimulatorUpdate) {
    if (!displaySocket.current?.connected) return;
    setDevice((current) => current && { ...current, minute: update.minute === undefined ? current.minute : update.minute,
      brightness: update.brightness ?? current.brightness });
    displaySocket.current.emit(UPDATE_SIMULATOR_SETTINGS, update);
  }

  function selectDockTab(tab: 'remote' | 'device') {
    const nextParams = new URLSearchParams(params);
    if (tab === 'device') nextParams.set('tab', 'device');
    else nextParams.delete('tab');
    setParams(nextParams, { replace: true });
  }

  function navigateDock(event: KeyboardEvent<HTMLDivElement>) {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const next = event.key === 'Home' ? 'remote' : event.key === 'End' ? 'device'
      : dockTab === 'remote' ? 'device' : 'remote';
    selectDockTab(next);
    event.currentTarget.querySelector<HTMLButtonElement>(`#dock-tab-${next}`)?.focus();
  }

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
          <ViewSidebarOutlinedIcon aria-hidden="true" /> Sidebar
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

          <div className="panel-viewport" tabIndex={isGameMode(mode) ? 0 : undefined} onKeyDown={forwardGameKey}>
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
            aria-label="Resize sidebar"
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
        <aside className="panel-remote" id="panel-remote" aria-label="Simulator sidebar" hidden={!remoteOpen}>
          <div className="panel-switch panel-dock-tabs" role="tablist" aria-label="Simulator sidebar" onKeyDown={navigateDock}>
            <button id="dock-tab-remote" type="button" role="tab" aria-selected={dockTab === 'remote'}
              tabIndex={dockTab === 'remote' ? 0 : -1} aria-controls="dock-remote" onClick={() => selectDockTab('remote')}>
              <SettingsRemoteOutlinedIcon aria-hidden="true" /> Remote
            </button>
            <button id="dock-tab-device" type="button" role="tab" aria-selected={dockTab === 'device'}
              tabIndex={dockTab === 'device' ? 0 : -1} aria-controls="dock-device" onClick={() => selectDockTab('device')}>
              <TuneOutlinedIcon aria-hidden="true" /> Device Settings
            </button>
          </div>
          <div className="panel-dock-content" role="tabpanel" id="dock-remote" aria-labelledby="dock-tab-remote" hidden={dockTab !== 'remote'}>
            <iframe ref={remoteFrame} src="/" title="Obelisk remote" />
          </div>
          <div className="panel-dock-content" role="tabpanel" id="dock-device" aria-labelledby="dock-tab-device" hidden={dockTab !== 'device'}>
            {device && status === 'live' ? <DeviceSettings settings={device} update={updateDevice} /> :
              <div className="panel-empty" role="status">{statusText[status]}</div>}
          </div>
        </aside>
      </div>

      <footer className="panel-status">
        <div className="panel-status-line" role="status">
          <span className={`panel-status-dot ${status === 'live' ? 'panel-status-live' : ''}`} />
          {statusText[status]}
        </div>
        {frame && (
          <div className="panel-metadata">
            <span className="panel-mode">{modeLabel(frame.mode)}</span>
            <span>{frame.width} × {frame.height} pixels</span>
            <span>{(frame.width / frame.tileWidth) * (frame.height / frame.tileHeight)} tiles</span>
            <span>{frame.brightness}% brightness</span>
          </div>
        )}
      </footer>
    </main>
  );
}
