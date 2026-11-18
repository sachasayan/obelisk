import { useEffect, useRef, useState } from 'react';
import type { DisplayFrame } from './frame';
import { createPanelScene } from './panel-scene';

export default function PanelThree({ frame }: { frame: DisplayFrame }) {
  const container = useRef<HTMLDivElement>(null);
  const scene = useRef<ReturnType<typeof createPanelScene> | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const { width, height, tileWidth, tileHeight } = frame;

  useEffect(() => {
    if (!container.current) return;

    try {
      scene.current = createPanelScene(container.current, { width, height, tileWidth, tileHeight });
    } catch {
      setUnavailable(true);
    }

    return () => {
      scene.current?.dispose();
      scene.current = null;
    };
  }, [width, height, tileWidth, tileHeight]);

  useEffect(() => {
    scene.current?.paint(frame);
  }, [frame]);

  return (
    <div className="panel-three-stage">
      <div ref={container} className="panel-three-scene" />
      {unavailable ? (
        <div className="panel-empty panel-three-fallback" role="status">
          <strong>WebGL is unavailable</strong>
          <p>Switch to the 2D panel to see the live display.</p>
        </div>
      ) : (
        <div className="panel-camera">
          <p>Drag to orbit · Scroll or pinch to zoom</p>
          <div className="panel-camera-buttons">
            <button type="button" className="panel-tool" onClick={() => scene.current?.front()}>Front view</button>
            <button type="button" className="panel-tool" onClick={() => scene.current?.reset()}>Reset camera</button>
          </div>
        </div>
      )}
    </div>
  );
}
