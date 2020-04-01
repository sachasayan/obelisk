import React, { useState, useEffect } from 'react';
import { IProps } from './types';
import io from 'socket.io-client';

export interface ConnectionState {
  socket: any,
  user: number,
  setUser: any
};

export const ConnectionContext = React.createContext<ConnectionState | undefined>(undefined);

export function ConnectProvider({children}: IProps) {

  const setUser = (u: number)  => {
    console.log('Setting user..', u);
    updateConnection(prevState => {
      return {
        ...prevState,
        user: u
      }
    })
  }

  const connectionState: ConnectionState = {
    socket: undefined,
    user: 4,
    setUser: setUser
  };

  useEffect(() => {
    connectionState.socket = io();
    connectionState.socket.on('obeliskAssignUser', setUser);
    console.log('Listening for user assignment...');
    connectionState.socket.on('obeliskLaunchController', setUser);
    console.log('Listening for control signals...');
    return () => {
      connectionState.socket.off('obeleiskAssignUser');
      connectionState.socket.off('obeliskLaunchController');
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