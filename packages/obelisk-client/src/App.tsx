import React from 'react';
import './App.css';

import { ConnectProvider } from './ConnectionContext';

import ModeSelector from './ModeSelector';
import InfoBar from './InfoBar';

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