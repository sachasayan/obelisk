import React, { useContext, useState } from 'react';
import './App.css';
import {
  Button,
  Grid,
  Typography,
  List,
  ListItem,
  ListItemText,
  Avatar,
}  from '@material-ui/core';
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
    <div>
        <>
          <Grid item xs={12} md={6}>
            <div>
              <List >
                {modes.map((m) => (
                  <ListItem key={m}>
                    <Button  aria-label="delete"  onClick={() => {changeMode(m)} }>
                    <Avatar>
                    </Avatar>
                    <ListItemText
                      primary={m}
                    />
                    </Button>
                  </ListItem>
                ))}
              </List>
            </div>
          </Grid>
        </>
    </div>
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

  //connectionState.socket.on('obeliskAssignUser', setUser);

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