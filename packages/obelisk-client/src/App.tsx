import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { MUNCHMAN_CONTROLLER_PATH } from '../../../shared/munchman';
import './App.css';
import Controller from './components/Controller';
import InfoBar from './components/InfoBar';
import ModeSelector from './components/ModeSelector';
import MunchmanController from './components/MunchmanController';
import PanelDisplay from './display/PanelDisplay';
import { ConnectProvider } from './providers/ConnectionContext';

function ControllerApp() {
  return (
    <ConnectProvider>
      <div className="App">
        <header className="App-header">
          <InfoBar />
        </header>
        <Routes>
          <Route path="/" element={<ModeSelector />} />
          <Route path="/controller" element={<Controller />} />
          <Route path={MUNCHMAN_CONTROLLER_PATH} element={<MunchmanController />} />
        </Routes>
      </div>
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
