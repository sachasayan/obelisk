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
import { ConnectionContext, ConnectionService } from './ConnectionContext';

export interface UserInfo {
  player: number | null;
};

function UserInfo() {
  let socket: ConnectionService | undefined  = useContext(ConnectionContext);
  return (
    <Typography variant="h6">
      Hello. You are connected as {socket?.user.player}
    </Typography>
  ) ;
}

function ModeSelector() {
  let socket: ConnectionService | undefined = useContext(ConnectionContext);
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

  return (
    <div>
        <>
          <Grid item xs={12} md={6}>
            <div>
              <List >
                {modes.map((m) => (
                  <ListItem key={m}>
                    <Button  aria-label="delete"  onClick={() => {socket?.changeMode(m)} }>
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

function App() {
  let connectionService = new ConnectionService();
  connectionService.initSocket();

  return (
    <ConnectionContext.Provider value={connectionService}>
      <div className="App">
        <header className="App-header">
          <UserInfo/>
          <ModeSelector/>
          <canvas className="whiteboard" ></canvas>
        </header>
      </div>
    </ConnectionContext.Provider>
);
}

export default App;