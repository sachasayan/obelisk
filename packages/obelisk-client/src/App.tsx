import React, { useState, useEffect } from 'react';
import './App.css';
import io from 'socket.io-client';

import { ConnectionContext, ConnectionState } from './ConnectionContext';
import { IProps } from './types';
import ModeSelector from './ModeSelector';
import InfoBar from './InfoBar';

function ConnectProvider({children}: IProps) {

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
    return () => {
      console.log('Cleaning up listener...');
      connectionState.socket.off('obeleiskAssignUser');
    };
  }, []);


  const [connection, updateConnection] = useState(connectionState);

  return (
    <ConnectionContext.Provider value={connection}>
      {children}
    </ConnectionContext.Provider>
);
}

function App() {
  return (
    <ConnectProvider>
      <div className="App">
        <header className="App-header">
          <InfoBar/>
          <ModeSelector/>
          <canvas className="whiteboard" ></canvas>
        </header>
      </div>
    </ConnectProvider>
);
}

export default App;