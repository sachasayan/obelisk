import React, { useContext } from 'react';
import ViewWeekIcon from '@material-ui/icons/ViewWeek';
import SportsEsportsIcon from '@material-ui/icons/SportsEsports';

import {
  Grid,
  Typography,
  Toolbar,
  AppBar
}  from '@material-ui/core';
import { ConnectionContext, ConnectionState } from '../providers/ConnectionContext';

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
          &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
          </Typography>
            <ViewWeekIcon />
          <Typography variant="h6" color="inherit">
            <SportsEsportsIcon />
            {socket ? socket.user >= 0 ? socket.user + 1 : '' : ''}
          </Typography>
        </Grid>
      </Toolbar>
    </AppBar>
  ) ;
}

export default InfoBar;