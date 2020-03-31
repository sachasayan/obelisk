import React, { useContext } from 'react';
import MenuIcon from '@material-ui/icons/Menu';
import SportsEsportsIcon from '@material-ui/icons/SportsEsports';
import './App.css';
import {
  Grid,
  Typography,
  Toolbar,
  AppBar
}  from '@material-ui/core';
import { palette, spacing, typography } from '@material-ui/system';
import { ConnectionContext, ConnectionState } from './ConnectionContext';

function InfoBar() {
  let socket: ConnectionState | undefined  = useContext(ConnectionContext);
  return (

    <AppBar position="static">
      <Toolbar>
        <Grid
          container
          direction="row"
          justify="space-between"
          alignItems="center"
        >
          <Typography variant="h6" color="inherit">
            Obelisk
          </Typography>
            <MenuIcon />
          <Typography variant="h6" color="inherit">
            <SportsEsportsIcon />
            {socket?.user}
          </Typography>
        </Grid>
      </Toolbar>
    </AppBar>

  ) ;
}

export default InfoBar;