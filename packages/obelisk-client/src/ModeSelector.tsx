import React, { useContext } from 'react';
import './ModeSelector.css';
import {
  Button,
  Grid,
  Paper
}  from '@material-ui/core';
import { palette, spacing, typography } from '@material-ui/system';
import { ConnectionContext, ConnectionState } from './ConnectionContext';


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