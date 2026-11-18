import { createContext, useEffect, useEffectEvent, useState } from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import type { Socket } from 'socket.io-client';
import { MUNCHMAN_CONTROLLER_PATH } from '../../../../shared/munchman';

interface ConnectionState {
  socket: Socket;
  user: number;
}

export const ConnectionContext = createContext<ConnectionState | undefined>(undefined);

export function ConnectProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [socket] = useState(() => io({ autoConnect: false }));
  const [user, setUser] = useState(-1);
  const openController = useEffectEvent((mode: unknown) => {
    if (mode === 'pong') navigate('/controller');
    if (mode === 'munchman') navigate(MUNCHMAN_CONTROLLER_PATH);
  });

  useEffect(() => {
    const resetUser = () => setUser(-1);
    const initController = (mode: unknown) => openController(mode);

    socket.on('obeliskAssignUser', setUser);
    socket.on('obeliskInitController', initController);
    socket.on('disconnect', resetUser);
    socket.connect();

    return () => {
      socket.off('obeliskAssignUser', setUser);
      socket.off('obeliskInitController', initController);
      socket.off('disconnect', resetUser);
      socket.disconnect();
    };
  }, [socket]);

  return (
    <ConnectionContext.Provider value={{ socket, user }}>
      {children}
    </ConnectionContext.Provider>
  );
}
