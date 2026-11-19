import { createContext, useEffect, useEffectEvent, useState } from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import type { Socket } from 'socket.io-client';
import { controllerPath } from '../../../../shared/modes';
import { applyVisualSettings, defaultVisualSettings, UPDATE_VISUAL_SETTINGS, VISUAL_SETTINGS } from '../../../../shared/visual-settings';
import type { VisualSettings, VisualSettingsUpdate } from '../../../../shared/visual-settings';

interface ConnectionState {
  socket: Socket;
  user: number;
  visualSettings: VisualSettings;
  updateVisualSettings(update: VisualSettingsUpdate): void;
}

export const ConnectionContext = createContext<ConnectionState | undefined>(undefined);

export function ConnectProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [socket] = useState(() => io({ autoConnect: false }));
  const [user, setUser] = useState(-1);
  const [visualSettings, setVisualSettings] = useState(defaultVisualSettings);
  const openController = useEffectEvent((mode: unknown) => {
    const path = controllerPath(mode);
    if (path) navigate(path);
  });
  function updateVisualSettings(update: VisualSettingsUpdate) {
    if (!socket.connected || user < 0) return;
    setVisualSettings((current) => applyVisualSettings(current, update));
    socket.emit(UPDATE_VISUAL_SETTINGS, update);
  }

  useEffect(() => {
    const resetUser = () => setUser(-1);
    const initController = (mode: unknown) => openController(mode);

    socket.on('obeliskAssignUser', setUser);
    socket.on('obeliskInitController', initController);
    socket.on(VISUAL_SETTINGS, setVisualSettings);
    socket.on('disconnect', resetUser);
    socket.connect();

    return () => {
      socket.off('obeliskAssignUser', setUser);
      socket.off('obeliskInitController', initController);
      socket.off(VISUAL_SETTINGS, setVisualSettings);
      socket.off('disconnect', resetUser);
      socket.disconnect();
    };
  }, [socket]);

  return (
    <ConnectionContext.Provider value={{ socket, user, visualSettings, updateVisualSettings }}>
      {children}
    </ConnectionContext.Provider>
  );
}
