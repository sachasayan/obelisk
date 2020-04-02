import React from 'react';
import './App.css';

import { ConnectProvider } from './providers/ConnectionContext';

import ModeSelector from './components/ModeSelector';
import InfoBar from './components/InfoBar';
import Controller from './components/Controller';


import {
  BrowserRouter as Router,
  Switch,
  Route,
  Link
} from 'react-router-dom';


function App() {


  return (
    <ConnectProvider>
      <div className="App">
        <header className="App-header">
          <InfoBar/>
          <Controller />
          <ModeSelector/>
          <canvas className="whiteboard" ></canvas>
        </header>
      </div>
    </ConnectProvider>
);
}

export default App;