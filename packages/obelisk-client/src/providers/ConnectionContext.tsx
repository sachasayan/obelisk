import React, { useState, useEffect } from 'react';
import { IProps } from './types';
import io from 'socket.io-client';
import { useHistory } from 'react-router-dom';

export interface ConnectionState {
  socket: any,
  user: number,
  setUser: any
};

export const ConnectionContext = React.createContext<ConnectionState | undefined>(undefined);

export function ConnectProvider({children}: IProps) {
  const history = useHistory();

  const setUser = (u: number)  => {
    console.log('Setting user..', u);
    updateConnection(prevState => {
      if (prevState.user) { alert("You've been reassigned as player " + u); }
      return {
        ...prevState,
        user: u
      }
    });
  }

  const initController = (u: number)  => {
    console.log('Launching controller...', u);

    history.push('/controller');
  }



  const connectionState: ConnectionState = {
    socket: undefined,
    user: 0,
    setUser: setUser
  };

  useEffect(() => {
    connectionState.socket = io();
    connectionState.socket.on('obeliskAssignUser', setUser);
    console.log('Listening for user assignment...');
    connectionState.socket.on('obeliskInitController', initController);
    console.log('Listening for control signals...');
    return () => {
      connectionState.socket.off('obeleiskAssignUser');
      connectionState.socket.off('obeliskInitController');
      console.log('Cleaning up listeners...');
    };


  }, []);

  const [connection, updateConnection] = useState(connectionState);

  return (
    <ConnectionContext.Provider value={connection}>
      {children}
    </ConnectionContext.Provider>
  );
}

