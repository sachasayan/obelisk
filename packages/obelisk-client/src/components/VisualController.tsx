import { useContext } from 'react';
import { Link } from 'react-router-dom';
import {
  clockFonts, defaultVisualSettings, isClockFont, isLavaPalette, lavaPalettes,
  maxLavaBlobs, maxLavaSpeed, minLavaBlobs,
} from '../../../../shared/visual-settings';
import type { VisualSettings, VisualSettingsUpdate } from '../../../../shared/visual-settings';
import { modeLabel } from '../../../../shared/modes';
import { ConnectionContext } from '../providers/ConnectionContext';

const colorPresets = [
  ['White', '#ffffff'], ['Amber', '#ffad48'], ['Rose', '#ff699c'],
  ['Mint', '#56ebba'], ['Sky', '#68bbff'], ['Violet', '#b18cff'],
];

function LavaFields({ settings, update }: {
  settings: VisualSettings['lava-lamp'];
  update(change: VisualSettingsUpdate): void;
}) {
  const { palette, speed, blobs } = settings;
  const speedText = speed === 0 ? 'Paused' : `${speed}%`;
  const gradient = lavaPalettes[palette].colors.map((color) => `#${color.toString(16).padStart(6, '0')}`).join(', ');
  return (
    <>
      <label className="Visual-field">
        <span>Palette</span>
        <select value={palette} onChange={({ currentTarget }) => {
          if (isLavaPalette(currentTarget.value)) update({ mode: 'lava-lamp', palette: currentTarget.value });
        }}>
          {Object.entries(lavaPalettes).map(([value, { label }]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <span aria-hidden="true" className="Visual-palette-preview" style={{ backgroundImage: `linear-gradient(90deg, ${gradient})` }} />
      </label>
      <label className="Visual-field">
        <span>Motion speed <output>{speedText}</output></span>
        <input type="range" aria-label="Motion speed" aria-valuetext={speedText} min="0" max={maxLavaSpeed} step="5" value={speed}
          onChange={({ currentTarget }) => update({ mode: 'lava-lamp', speed: currentTarget.valueAsNumber })} />
      </label>
      <label className="Visual-field">
        <span>Blob count <output>{blobs}</output></span>
        <input type="range" aria-label="Blob count" min={minLavaBlobs} max={maxLavaBlobs} value={blobs}
          onChange={({ currentTarget }) => update({ mode: 'lava-lamp', blobs: currentTarget.valueAsNumber })} />
      </label>
    </>
  );
}

export default function VisualController({ mode }: { mode: keyof VisualSettings }) {
  const connection = useContext(ConnectionContext);
  const { clock, pulse, 'lava-lamp': lava } = connection?.visualSettings ?? defaultVisualSettings;
  const title = modeLabel(mode);
  const color = mode === 'pulse' ? pulse.color : clock.color;
  const update = (change: VisualSettingsUpdate) => connection?.updateVisualSettings(change);
  const setColor = (color: string) => {
    if (mode !== 'lava-lamp') update({ mode, color });
  };

  return (
    <section aria-labelledby="visual-title" className="Remote-control Visual-control">
      <h2 id="visual-title">{title}</h2>
      <fieldset className="Visual-fields" aria-labelledby="visual-title" disabled={!connection || connection.user < 0}>
        {mode === 'lava-lamp' ? <LavaFields settings={lava} update={update} /> : (
          <>
            {mode === 'pulse' ? (
              <label className="Visual-field">
                <span>Intensity <output>{pulse.intensity}%</output></span>
                <input aria-label="Intensity" type="range" min="0" max="100" value={pulse.intensity}
                  onChange={({ currentTarget }) => update({ mode, intensity: currentTarget.valueAsNumber })} />
              </label>
            ) : (
              <label className="Visual-field">
                <span>Font</span>
                <select value={clock.font} onChange={({ currentTarget }) => {
                  if (isClockFont(currentTarget.value)) update({ mode, font: currentTarget.value });
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
                {colorPresets.map(([name, value]) => (
                  <button key={value} type="button" aria-label={name} aria-pressed={color === value} onClick={() => setColor(value)}>
                    <span style={{ backgroundColor: value }} />
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </fieldset>
      <Link className="Remote-home" to="/">Home</Link>
    </section>
  );
}
