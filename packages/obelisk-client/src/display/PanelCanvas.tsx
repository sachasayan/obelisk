import { useLayoutEffect, useRef } from 'react';
import type { CSSProperties } from 'react';
import { writeRgba } from './frame';
import type { DisplayFrame } from './frame';

export default function PanelCanvas({ frame, grid }: { frame: DisplayFrame; grid: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const buffer = useRef<ImageData | undefined>(undefined);
  const { width, height, tileWidth, tileHeight } = frame;

  useLayoutEffect(() => {
    const context = canvas.current?.getContext('2d');
    if (!context) return;

    if (buffer.current?.width !== frame.width || buffer.current.height !== frame.height) {
      buffer.current = context.createImageData(frame.width, frame.height);
    }
    writeRgba(frame, buffer.current.data);
    context.putImageData(buffer.current, 0, 0);
  }, [frame]);

  const panelStyle = {
    aspectRatio: width / height,
    '--panel-ratio': width / height,
    '--pixel-width': `${100 / width}%`,
    '--pixel-height': `${100 / height}%`,
  } as CSSProperties;

  return (
    <div className="panel-flat-stage">
      <div className="panel-flat" style={panelStyle}>
        <canvas ref={canvas} width={width} height={height} aria-label="Live 2D LED panel" role="img" />
        {grid && <div className="panel-pixel-grid" aria-hidden="true" />}
        {Array.from({ length: width / tileWidth - 1 }, (_, index) => (
          <span className="panel-tile-seam" key={index} style={{ left: `${(index + 1) * tileWidth / width * 100}%` }} />
        ))}
        {Array.from({ length: height / tileHeight - 1 }, (_, index) => (
          <span className="panel-tile-seam panel-tile-seam-horizontal" key={index} style={{ top: `${(index + 1) * tileHeight / height * 100}%` }} />
        ))}
      </div>
    </div>
  );
}
