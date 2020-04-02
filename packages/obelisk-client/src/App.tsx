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
    <Router>
      <ConnectProvider>
        <div className="App">
          <header className="App-header">
            <InfoBar/>
          </header>
          <Switch>
            <Route exact path="/">
              <ModeSelector/>
            </Route>
            <Route path="/controller">
              <Controller/>
            </Route>
          </Switch>
        </div>
      </ConnectProvider>
    </Router>
  );
}

export default App;