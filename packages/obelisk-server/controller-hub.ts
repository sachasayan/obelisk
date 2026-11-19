import { controllerPath, findMode } from '../../shared/modes';
import type { ModeName } from '../../shared/modes';
import { GAME_INPUT, GAME_JOIN, GAME_LEAVE, GAME_STATUS, isGameAction, isGameMode } from '../../shared/games';
import { applyVisualSettings, defaultVisualSettings, UPDATE_VISUAL_SETTINGS, VISUAL_SETTINGS } from '../../shared/visual-settings';
import type { createGameSession } from './games/session';
import type { PlayerData } from './panel/types';

export interface ControllerPeer {
  id: string;
  on(event: string, listener: (value?: unknown) => void): void;
  emit(event: string, value: unknown): void;
}

export function createControllerHub(
  playerData: (PlayerData | undefined)[],
  changeMode: (mode: ModeName) => void,
  game?: ReturnType<typeof createGameSession>,
) {
  const sockets: ControllerPeer[] = [];
  let visualSettings = defaultVisualSettings;

  function connect(socket: ControllerPeer) {
    const player = sockets.push(socket) - 1;
    playerData.push(undefined);
    socket.emit('obeliskAssignUser', player);
    socket.emit(VISUAL_SETTINGS, visualSettings);

    socket.on('changeMode', (value: unknown) => {
      if (typeof value !== 'string') return;

      const mode = findMode(value);
      if (!mode) return;

      changeMode(mode);
      if (isGameMode(mode)) sendGameStatus(socket);
      if (controllerPath(mode)) socket.emit('obeliskInitController', mode);
    });

    socket.on(UPDATE_VISUAL_SETTINGS, (value: unknown) => {
      const next = applyVisualSettings(visualSettings, value);
      if (next === visualSettings) return;
      visualSettings = next;
      sockets.forEach((client) => client.emit(VISUAL_SETTINGS, visualSettings));
    });

    socket.on(GAME_JOIN, (next: unknown) => {
      if (!isGameMode(next)) return;
      game?.join(next, socket.id);
      sendGameStatus(socket);
    });

    socket.on(GAME_LEAVE, () => game?.leave(socket.id));
    socket.on(GAME_INPUT, (value: unknown) => {
      if (value && typeof value === 'object' && 'mode' in value && 'action' in value
          && isGameMode(value.mode) && isGameAction(value.action)) {
        game?.input(value.mode, socket.id, value.action);
      }
    });

    socket.on('drawing', (value: unknown) => {
      if (!value || typeof value !== 'object' || !('y' in value)) return;
      const { y } = value;
      if (typeof y !== 'number' || !Number.isFinite(y) || y < 0 || y > 1) return;

      const player = sockets.indexOf(socket);
      if (player !== -1) playerData[player] = { y };
    });

    socket.on('disconnect', () => {
      const player = sockets.indexOf(socket);
      if (player === -1) return;

      sockets.splice(player, 1);
      playerData.splice(player, 1);
      game?.leave(socket.id);
      sockets.forEach((client, index) => client.emit('obeliskAssignUser', index));
    });
  }

  function sendGameStatus(socket: ControllerPeer) {
    socket.emit(GAME_STATUS, game?.status(socket.id) ?? null);
  }

  return { connect, getVisualSettings: () => visualSettings, refreshGame: () => sockets.forEach(sendGameStatus) };
}
