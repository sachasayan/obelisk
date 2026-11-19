import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { controllerPaths } from '../../../shared/modes';
import './App.css';
import Controller from './components/Controller';
import InfoBar from './components/InfoBar';
import ModeSelector from './components/ModeSelector';
import MunchmanController from './components/MunchmanController';
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
          <Route path={controllerPaths.munchman} element={<MunchmanController />} />
          <Route path={controllerPaths.pulse} element={<VisualController mode="pulse" />} />
          <Route path={controllerPaths.clock} element={<VisualController mode="clock" />} />
        </Routes>
      </main>
    </ConnectProvider>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/display" element={<PanelDisplay />} />
        <Route path="*" element={<ControllerApp />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
