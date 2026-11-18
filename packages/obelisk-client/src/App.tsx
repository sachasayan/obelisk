import { BrowserRouter, Route, Routes } from 'react-router-dom';
import './App.css';
import Controller from './components/Controller';
import InfoBar from './components/InfoBar';
import ModeSelector from './components/ModeSelector';
import PanelDisplay from './display/PanelDisplay';
import SimulatorLink from './display/SimulatorLink';
import { ConnectProvider } from './providers/ConnectionContext';

function ControllerApp() {
  return (
    <ConnectProvider>
      <div className="App">
        <header className="App-header">
          <InfoBar />
        </header>
        <SimulatorLink />
        <Routes>
          <Route path="/" element={<ModeSelector />} />
          <Route path="/controller" element={<Controller />} />
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
