import { DISPLAY_FRAME, DISPLAY_NAMESPACE } from '../../../shared/panel';
import { SIMULATOR_SETTINGS, UPDATE_SIMULATOR_SETTINGS } from '../../../shared/simulator';
import { createControllerHub } from '../../obelisk-server/controller-hub';
import type { ControllerPeer } from '../../obelisk-server/controller-hub';
import { createGameSession } from '../../obelisk-server/games/session';
import * as panelModes from '../../obelisk-server/modes';
import { BitmapFont } from '../../obelisk-server/panel/bitmap-font';
import { createPanelRuntime } from '../../obelisk-server/panel/runtime';
import type { PlayerData } from '../../obelisk-server/panel/types';
import { VirtualMatrix } from '../../obelisk-server/panel/virtual-matrix';
import fonts from 'virtual:panel-fonts';
import type { BrowserSession } from './connection';

export function createSession(): BrowserSession {
  const geometry = { width: 128, height: 16, tileWidth: 32, tileHeight: 16 };
  const brightness = 100;
  const startMode = 'space';
  const playerData: (PlayerData | undefined)[] = [];
  const viewers = new Set<ControllerPeer>();
  const matrix = new VirtualMatrix(geometry, brightness, frame => {
    for (const viewer of viewers) viewer.emit(DISPLAY_FRAME, { ...frame, rgb: frame.rgb.buffer });
  });
  const loaded = new Map<string, BitmapFont>();
  function loadFont(name: string) {
    if (!loaded.has(name)) loaded.set(name, new BitmapFont(name, name, fonts[name]));
    return loaded.get(name)!;
  }
  const game = createGameSession(() => hub.refreshGame());
  const hub = createControllerHub(playerData, mode => runtime.changeMode(mode), game);
  const runtime = createPanelRuntime({ matrix, virtualMatrix: matrix, panelModes, game, playerData,
    loadFont, startMode, geometry, brightness, visualSettings: hub.getVisualSettings });
  runtime.changeMode(startMode);

  return {
    attach(namespace, peer) {
      if (namespace !== DISPLAY_NAMESPACE) { hub.connect(peer); return; }
      viewers.add(peer);
      const frame = matrix.latest();
      peer.emit(DISPLAY_FRAME, { ...frame, rgb: frame.rgb.buffer });
      peer.emit(SIMULATOR_SETTINGS, runtime.getSimulatorSettings());
      peer.on(UPDATE_SIMULATOR_SETTINGS, update => {
        runtime.updateSimulatorSettings(update);
        peer.emit(SIMULATOR_SETTINGS, runtime.getSimulatorSettings());
      });
      peer.on('disconnect', () => viewers.delete(peer));
    },
  };
}
