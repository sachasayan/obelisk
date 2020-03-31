import React, { useContext, useState, useEffect } from 'react';
import './App.css';
import {
  Button,
  ButtonGroup,
  Grid,
  Typography,
  Paper
}  from '@material-ui/core';
import { palette, spacing, typography } from '@material-ui/system';
import { ConnectionContext, ConnectionState } from './ConnectionContext';

import io from 'socket.io-client';

export interface UserInfo {
  player: number | null;
};

function UserInfo() {
  let socket: ConnectionState | undefined  = useContext(ConnectionContext);
  return (
    <Typography variant="h6">
      Hello. You are connected as {socket?.user}
    </Typography>
  ) ;
}

function ModeSelector() {
  let connection: ConnectionState | undefined = useContext(ConnectionContext);
  let modes = [
    'Billboard',
    'Lightcycles',
    'Munchman',
    'Pong',
    'Pulse',
    'Space',
    'Sunlight',
    'Test',
    'exit',
  ];

  const changeMode = (mode: string) => {
    console.log('Changing mode... ', mode);
    connection?.socket.emit('changeMode', mode);
  }

  return (
    <>
      <Paper elevation={3} style={{padding: '20px'}} >
        <Grid item >
          <ButtonGroup  orientation="vertical">
            {modes.map((m) => (
              <Button key={m} variant="contained" color="primary" aria-label="delete"  onClick={() => {changeMode(m)} }>
              {m}
              </Button>
            ))}
          </ButtonGroup>
        </Grid>
      </Paper>
    </>
  )
}

interface IProps {
  children: React.ReactNode;
  // any other props that come into the component
}


function ConnectProvider({children}: IProps) {
  //let connectionService = new ConnectionService();
  //connectionService.initSocket();

  const setUser = (u: number)  => {
    console.log('Setting user..', u);
    updateConnection(prevState => {
      return {
        ...prevState,
        user: u
      }
    })
  }


  const connectionState = {
    socket: io(),
    user: 4,
    setUser: setUser
  };


  useEffect(() => {
    connectionState.socket.on('obeliskAssignUser', setUser);
    console.log('Listening for user assignment...');
    return () => {
      console.log('Cleaning up listener...');
      connectionState.socket.off('obeleiskAssignUser');
    };
  }, []);


  const [connection, updateConnection] = useState(connectionState)

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
          <UserInfo/>
          <ModeSelector/>
          <canvas className="whiteboard" ></canvas>
        </header>
      </div>
    </ConnectProvider>
);
}

export default App;