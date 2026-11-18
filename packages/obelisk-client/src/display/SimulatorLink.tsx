import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { DISPLAY_CAPABILITY } from '../../../../shared/panel';
import './display.css';

export default function SimulatorLink() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const abort = new AbortController();
    fetch(DISPLAY_CAPABILITY, { signal: abort.signal })
      .then((response) => response.ok ? response.json() : undefined)
      .then((config) => setEnabled(config?.simulated === true))
      .catch(() => {});
    return () => abort.abort();
  }, []);

  if (!enabled) return null;

  return <Link className="panel-simulator-link" to="/display" target="_blank" rel="noopener">Open virtual panel ↗</Link>;
}
