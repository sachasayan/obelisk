import { BrowserRouter, Route, Routes } from 'react-router-dom';
import './App.css';
import Controller from './components/Controller';
import InfoBar from './components/InfoBar';
import ModeSelector from './components/ModeSelector';
import { ConnectProvider } from './providers/ConnectionContext';

function App() {
  return (
    <BrowserRouter>
      <ConnectProvider>
        <div className="App">
          <header className="App-header">
            <InfoBar />
          </header>
          <Routes>
            <Route path="/" element={<ModeSelector />} />
            <Route path="/controller" element={<Controller />} />
          </Routes>
        </div>
      </ConnectProvider>
    </BrowserRouter>
  );
}

export default App;
