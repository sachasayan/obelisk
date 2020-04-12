import React, { useContext } from 'react';
import './ModeSelector.css';
import {
  Button,
  Grid,
  Paper
}  from '@material-ui/core';
import { ConnectionContext, ConnectionState } from '../providers/ConnectionContext';


function ModeSelector() {
  let connection: ConnectionState | undefined = useContext(ConnectionContext);
  let modes = [
    'billboard',
    'clock',
    'lightcycles',
    'munchman',
    'pong',
    'pulse',
    'space',
    'sunlight',
    'test',
    'exit',
  ];

  const changeMode = (mode: string) => {
    console.log('Changing mode... ', mode);
    connection?.socket.emit('changeMode', mode);
  }
  return (
    <>
      <Grid item className="ModeSelector">
        {modes.map((m) => (
          <Paper className="Paper" key={m} elevation={3} style={{backgroundImage: `url(/modes/${m}.jpg)`}} >
            <Button className="Button" variant="contained" color="primary" aria-label="delete"  onClick={() => {changeMode(m)} }>
            {m}
            </Button>
          </Paper>
        ))}
      </Grid>
    </>
  )
}

export default ModeSelector;