import { BrowserRouter, HashRouter, Route, Routes } from 'react-router-dom';
import { games, isGameMode } from '../../../shared/games';
import { controllerPaths } from '../../../shared/modes';
import './App.css';
import Controller from './components/Controller';
import InfoBar from './components/InfoBar';
import ModeSelector from './components/ModeSelector';
import GameController from './components/GameController';
import VisualController from './components/VisualController';
import PanelDisplay from './display/PanelDisplay';
import { ConnectProvider } from './providers/ConnectionContext';

function ControllerApp() {
  return (
    <ConnectProvider>
      <main className="App">
        <InfoBar />
        <Routes>
          <Route path="/" element={<ModeSelector />} />
          <Route path={controllerPaths.pong} element={<Controller />} />
          {Object.keys(games).filter(isGameMode).map((mode) => (
            <Route key={mode} path={controllerPaths[mode]} element={<GameController key={mode} mode={mode} />} />
          ))}
          <Route path={controllerPaths.pulse} element={<VisualController mode="pulse" />} />
          <Route path={controllerPaths['lava-lamp']} element={<VisualController mode="lava-lamp" />} />
          <Route path={controllerPaths.clock} element={<VisualController mode="clock" />} />
        </Routes>
      </main>
    </ConnectProvider>
  );
}

function App() {
  const Router = import.meta.env.MODE === 'website' ? HashRouter : BrowserRouter;
  return (
    <Router>
      <Routes>
        <Route path="/display" element={<PanelDisplay />} />
        <Route path="*" element={<ControllerApp />} />
      </Routes>
    </Router>
  );
}

export default App;
