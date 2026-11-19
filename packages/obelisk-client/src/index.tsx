import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/bebas-neue';
import './index.css';
import App from './App';

const root = document.getElementById('root');
if (!root) throw new Error('Obelisk could not find its root element.');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
