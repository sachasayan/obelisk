import type { ModeName } from '../../../shared/modes';
import { isGameMode } from '../../../shared/games';
import type { PanelGeometry } from '../../../shared/panel';
import { MINUTES_PER_DAY, simulatorGeometry, simulatorLayout } from '../../../shared/simulator';
import type { SimulatorSettings } from '../../../shared/simulator';
import type { createGameSession } from '../games/session';
import { readSunlightClock } from '../modes/sunlight.index';
import type { ModeState, PanelMatrix } from './types';
import type { VirtualMatrix } from './virtual-matrix';

type StartMode = ModeName | 'test';

export function createPanelRuntime({ matrix, virtualMatrix, panelModes, game, playerData, loadFont,
  visualSettings, startMode, geometry, brightness }: Omit<ModeState, 'matrix'> & {
  matrix?: PanelMatrix;
  virtualMatrix?: VirtualMatrix;
  panelModes?: typeof import('../modes');
  game: ReturnType<typeof createGameSession>;
  startMode: StartMode;
  geometry: PanelGeometry;
  brightness: number;
}) {
  let simulatedMinute: number | null = null;
  const modes = {
    billboard: panelModes?.Billboard,
    clock: panelModes?.Clock,
    'lava-lamp': panelModes?.LavaLamp,
    lightcycles: panelModes?.Lightcycles,
    pong: panelModes?.Pong,
    pulse: panelModes?.Pulse,
    space: panelModes?.Space,
    sunlight: panelModes?.Sunlight,
    test: panelModes?.Test,
    exit: undefined,
  };
  let activeMode: StartMode | undefined;

  function changeMode(mode: StartMode, resize = false) {
    if (!matrix || (!resize && isGameMode(mode) && activeMode === mode)) return;
    const preserveSeats = resize && activeMode === mode && isGameMode(mode);
    if (isGameMode(activeMode)) {
      if (!preserveSeats) game.stop();
    } else if (activeMode) modes[activeMode]?.deactivate();

    activeMode = mode;
    virtualMatrix?.setMode(mode);
    matrix.afterSync(() => {});
    matrix.brightness(brightness).clear();
    const state = {
      matrix, playerData, loadFont,
      visualSettings,
      simulatedMinute: virtualMatrix ? () => simulatedMinute : undefined,
    };

    if (isGameMode(mode)) game.start(mode, state, preserveSeats);
    else if (modes[mode]) modes[mode].init(state);
    else matrix.sync();
  }

  function getSimulatorSettings(): SimulatorSettings {
    const { sunset, timeZone } = readSunlightClock();
    return {
      minute: simulatedMinute, sunset: sunset < MINUTES_PER_DAY ? sunset : null,
      timeZone, layout: simulatorLayout(geometry), brightness,
    };
  }

  function updateSimulatorSettings(value: unknown) {
    if (!virtualMatrix || !value || typeof value !== 'object') return;
    let updateTime = false;
    let previewSunlight = false;
    if ('minute' in value) {
      const { minute } = value;
      if (minute === null || (typeof minute === 'number' && Number.isInteger(minute) && minute >= 0 && minute <= MINUTES_PER_DAY)) {
        updateTime = minute !== simulatedMinute;
        simulatedMinute = typeof minute === 'number' ? minute : null;
        previewSunlight = simulatedMinute !== null;
      }
    }
    if ('brightness' in value && typeof value.brightness === 'number' && Number.isInteger(value.brightness)
        && value.brightness >= 0 && value.brightness <= 100) {
      brightness = value.brightness;
      virtualMatrix.brightness(brightness).sync();
    }
    const next = 'layout' in value ? simulatorGeometry(value.layout) : undefined;
    if (next && simulatorLayout(next) !== simulatorLayout(geometry)) {
      geometry = next;
      virtualMatrix.configure(next);
      changeMode(previewSunlight ? 'sunlight' : activeMode ?? startMode, true);
    } else if (previewSunlight && activeMode !== 'sunlight') changeMode('sunlight');
    else if (updateTime && activeMode === 'sunlight') modes.sunlight?.refresh();
  }

  return { changeMode, getSimulatorSettings, updateSimulatorSettings };
}
