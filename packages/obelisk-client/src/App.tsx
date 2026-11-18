import { BrowserRouter, Route, Routes, useSearchParams } from 'react-router-dom';
import './App.css';
import Controller from './components/Controller';
import InfoBar from './components/InfoBar';
import ModeSelector from './components/ModeSelector';
import PanelDisplay from './display/PanelDisplay';
import SimulatorLink from './display/SimulatorLink';
import { ConnectProvider } from './providers/ConnectionContext';

function ControllerApp() {
  const [params] = useSearchParams();
  const embedded = params.get('embed') === '1';
  const query = embedded ? '?embed=1' : '';

  return (
    <ConnectProvider controllerPath={`/controller${query}`}>
      <div className={embedded ? 'App App--embedded' : 'App'}>
        <header className="App-header">
          <InfoBar embedded={embedded} />
        </header>
        {!embedded && <SimulatorLink />}
        <Routes>
          <Route path="/" element={<ModeSelector embedded={embedded} />} />
          <Route path="/controller" element={<Controller embedded={embedded} homePath={`/${query}`} />} />
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
