import { useContext } from 'react';
import { Link } from 'react-router-dom';
import { clockFonts, defaultVisualSettings, isClockFont } from '../../../../shared/visual-settings';
import { ConnectionContext } from '../providers/ConnectionContext';

const palette = [
  ['White', '#ffffff'], ['Amber', '#ffad48'], ['Rose', '#ff699c'],
  ['Mint', '#56ebba'], ['Sky', '#68bbff'], ['Violet', '#b18cff'],
];

export default function VisualController({ mode }: { mode: 'pulse' | 'clock' }) {
  const connection = useContext(ConnectionContext);
  const { clock, pulse } = connection?.visualSettings ?? defaultVisualSettings;
  const title = mode === 'pulse' ? 'Pulse' : 'Clock';
  const color = mode === 'pulse' ? pulse.color : clock.color;
  const setColor = (color: string) => connection?.updateVisualSettings({ mode, color });

  return (
    <section aria-labelledby="visual-title" className="Remote-control Visual-control">
      <h2 id="visual-title">{title}</h2>
      <fieldset className="Visual-fields" aria-labelledby="visual-title" disabled={!connection || connection.user < 0}>
        {mode === 'pulse' ? (
          <label className="Visual-field">
            <span>Intensity <output>{pulse.intensity}%</output></span>
            <input aria-label="Intensity" type="range" min="0" max="100" value={pulse.intensity}
              onChange={({ currentTarget }) => connection?.updateVisualSettings({ mode, intensity: currentTarget.valueAsNumber })} />
          </label>
        ) : (
          <label className="Visual-field">
            <span>Font</span>
            <select value={clock.font} onChange={({ currentTarget }) => {
              if (isClockFont(currentTarget.value)) connection?.updateVisualSettings({ mode, font: currentTarget.value });
            }}>
              {Object.entries(clockFonts).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
        )}
        <div className="Visual-field">
          <label className="Visual-custom-color" htmlFor="visual-color">
            Color <input id="visual-color" type="color" value={color} onChange={({ currentTarget }) => setColor(currentTarget.value)} />
          </label>
          <div className="Visual-swatches" role="group" aria-label="Color presets">
            {palette.map(([name, value]) => (
              <button key={value} type="button" aria-label={name} aria-pressed={color === value} onClick={() => setColor(value)}>
                <span style={{ backgroundColor: value }} />
              </button>
            ))}
          </div>
        </div>
      </fieldset>
      <Link className="Remote-home" to="/">Home</Link>
    </section>
  );
}
