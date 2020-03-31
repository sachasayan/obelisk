import React from 'react';
import './App.css';

import { ConnectProvider } from './providers/ConnectionContext';

import ModeSelector from './components/ModeSelector';
import InfoBar from './components/InfoBar';

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