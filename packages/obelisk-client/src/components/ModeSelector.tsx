import { useContext } from 'react';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import { ConnectionContext } from '../providers/ConnectionContext';
import './ModeSelector.css';

const modes = [
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

function ModeSelector({ embedded }: { embedded: boolean }) {
  const connection = useContext(ConnectionContext);

  return (
    <div className="ModeSelector">
      {embedded && <h1>Modes</h1>}
      {modes.map((mode) => (
        <Paper
          className="Paper"
          key={mode}
          elevation={3}
          style={embedded || mode === 'clock' || mode === 'exit' ? undefined : { backgroundImage: `url(/modes/${mode}.jpg)` }}
        >
          <Button
            className="Button"
            variant={embedded ? "outlined" : "contained"}
            color="primary"
            disabled={!connection || connection.user < 0}
            onClick={() => {
              if (connection?.socket.connected) connection.socket.emit('changeMode', mode);
            }}
          >
            {mode}
          </Button>
        </Paper>
      ))}
    </div>
  );
}

export default ModeSelector;
