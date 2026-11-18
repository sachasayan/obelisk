import { useContext } from 'react';
import SportsEsportsIcon from '@mui/icons-material/SportsEsports';
import ViewWeekIcon from '@mui/icons-material/ViewWeek';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import { ConnectionContext } from '../providers/ConnectionContext';

function InfoBar({ embedded }: { embedded: boolean }) {
  const user = useContext(ConnectionContext)?.user ?? -1;

  if (embedded) {
    return (
      <div className="EmbeddedConnection" role="status">
        <span className={user >= 0 ? 'EmbeddedConnection-dot is-connected' : 'EmbeddedConnection-dot'} />
        {user >= 0 ? `Player ${user + 1}` : 'Connecting…'}
      </div>
    );
  }

  return (
    <AppBar position="static">
      <Toolbar sx={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr' }}>
        <ViewWeekIcon sx={{ gridColumn: 2 }} />
        <Typography variant="h6" color="inherit" sx={{ justifySelf: 'end' }}>
          <SportsEsportsIcon />
          {user >= 0 ? user + 1 : ''}
        </Typography>
      </Toolbar>
    </AppBar>
  );
}

export default InfoBar;
