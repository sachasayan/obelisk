import { useEffect, useState } from 'react';
import { MINUTES_PER_DAY, simulatorGeometry } from '../../../../shared/simulator';
import type { SimulatorSettings, SimulatorUpdate } from '../../../../shared/simulator';

const layoutFields = [
  'Tile width', 'Tile height', 'Tiles across', 'Tiles down',
];
const layouts = [
  ['32x16:4x1', '128 × 16 · 4 wide'],
  ['16x16:2x2', '32 × 32 · 2 by 2'],
  ['16x16:1x3', '16 × 48 · 3 tall'],
  ['8x8:2x1', '16 × 8 · 2 wide'],
  ['8x8:1x1', '8 × 8 · 1 tile'],
];

function formatMinute(value: number) {
  if (value === MINUTES_PER_DAY) return '12:00 AM';
  const hours = Math.floor(value / 60);
  const minutes = Math.floor(value % 60).toString().padStart(2, '0');
  return `${hours % 12 || 12}:${minutes} ${hours < 12 ? 'AM' : 'PM'}`;
}

function getMinute(timeZone: string) {
  const format = new Intl.DateTimeFormat('en-GB', {
    timeZone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  });
  const [hours, minutes] = format.format().split(':').map(Number);
  return hours * 60 + minutes;
}

function PanelLayout({ value, update }: { value: string; update(change: SimulatorUpdate): void }) {
  const [fields, setFields] = useState(() => value.split(/[x:]/));
  const [applied, setApplied] = useState(value);
  const layout = `${fields[0]}x${fields[1]}:${fields[2]}x${fields[3]}`;
  const geometry = simulatorGeometry(layout);
  const dirty = applied !== layout;
  return (
    <form className="device-card" onSubmit={(event) => {
      event.preventDefault();
      if (geometry && dirty) {
        setApplied(layout);
        update({ layout });
      }
    }}>
      <h2>Panel layout</h2>
      <label className="device-field">
        Presets
        <select value={layouts.some(([preset]) => preset === layout) ? layout : ''}
          onChange={({ currentTarget }) => setFields(currentTarget.value.split(/[x:]/))}>
          <option value="" disabled>Custom layout</option>
          {layouts.map(([preset, label]) => <option key={preset} value={preset}>{label}</option>)}
        </select>
      </label>
      <div className="device-layout-fields">
        {layoutFields.map((label, index) => (
          <label key={label} className="device-field">{label}
            <input type="number" min={index < 2 ? 8 : 1} max="512" required value={fields[index]}
              onChange={({ currentTarget }) => {
                const value = currentTarget.value;
                setFields((fields) => fields.map((field, i) => i === index ? value : field));
              }} />
          </label>
        ))}
      </div>
      <p>{geometry ? `${geometry.width} × ${geometry.height} pixels` : 'Use tiles at least 8 × 8, up to 512 pixels per side and 65,536 pixels total.'}</p>
      {dirty && geometry && <p>Applying a layout restarts the active mode.</p>}
      <button type="submit" className="panel-tool device-apply" disabled={!geometry || !dirty}>Apply layout</button>
    </form>
  );
}

export default function DeviceSettings({ settings, update }: {
  settings: SimulatorSettings;
  update(change: SimulatorUpdate): void;
}) {
  const { timeZone, sunset } = settings;
  const [liveMinute, setLiveMinute] = useState(() => getMinute(timeZone));
  useEffect(() => {
    const timer = window.setInterval(() => setLiveMinute(getMinute(timeZone)), 20_000);
    return () => window.clearInterval(timer);
  }, [timeZone]);

  const live = settings.minute === null;
  const minute = settings.minute ?? liveMinute;
  const preview = (minute: number) => update({ minute });

  return (
    <div className="device-settings">
      <section className="device-card" aria-labelledby="device-time-title">
        <div className="device-card-title">
          <h2 id="device-time-title">Sunlight time</h2>
          <span className="device-pill">{live ? 'Live time' : 'Simulated'}</span>
        </div>
        <div className="device-time"><output id="preview-time">{formatMinute(minute)}</output><span>{timeZone.replaceAll('_', ' ')}</span></div>
        <input type="range" aria-label="Time of day" aria-valuetext={formatMinute(minute)} min="0" max={MINUTES_PER_DAY}
          value={minute} onChange={({ currentTarget }) => preview(currentTarget.valueAsNumber)} />
        <div className="device-time-labels" aria-hidden="true"><span>12 AM</span><span>Noon</span><span>12 AM</span></div>
        <div className="device-presets">
          <button type="button" className="panel-tool" disabled={sunset === null}
            onClick={() => sunset !== null && preview(Math.round(sunset + (MINUTES_PER_DAY - sunset) * .1))}>Sunset</button>
          <button type="button" className="panel-tool" disabled={sunset === null}
            onClick={() => sunset !== null && preview(Math.round(sunset + (MINUTES_PER_DAY - sunset) * .82))}>Late night</button>
          <button type="button" className="panel-tool" onClick={() => preview(MINUTES_PER_DAY)}>Midnight</button>
        </div>
        <p>{sunset === null ? 'No local sunset today.' : `Local sunset is at ${formatMinute(sunset)}. The animation continues while you scrub.`}</p>
        <button type="button" className="panel-tool" disabled={live} onClick={() => update({ minute: null })}>Return to live time</button>
      </section>

      <PanelLayout key={settings.layout} value={settings.layout} update={update} />

      <section className="device-card" aria-labelledby="device-brightness-title">
        <div className="device-card-title">
          <h2 id="device-brightness-title">Panel brightness</h2>
          <output>{settings.brightness}%</output>
        </div>
        <input type="range" aria-label="Panel brightness" aria-valuetext={`${settings.brightness}%`} min="0" max="100"
          value={settings.brightness} onChange={({ currentTarget }) => update({ brightness: currentTarget.valueAsNumber })} />
      </section>
    </div>
  );
}
