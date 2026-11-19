import { useEffect, useRef, useState } from 'react';
import type { DisplayFrame } from './frame';
import { createPanelScene } from './panel-scene';

export default function PanelThree({ frame, gestureZoom }: { frame: DisplayFrame; gestureZoom: boolean }) {
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
    scene.current?.setGestureZoom(gestureZoom);
  }, [gestureZoom, width, height, tileWidth, tileHeight]);

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
          <p>{gestureZoom ? 'Drag to orbit · Scroll or pinch to zoom' : 'Drag to orbit · Scroll the page'}</p>
          <div className="panel-camera-buttons">
            <button type="button" className="panel-tool panel-zoom" aria-label="Zoom in" title="Zoom in" onClick={() => scene.current?.zoomIn()}>+</button>
            <button type="button" className="panel-tool panel-zoom" aria-label="Zoom out" title="Zoom out" onClick={() => scene.current?.zoomOut()}>−</button>
            <button type="button" className="panel-tool" onClick={() => scene.current?.front()}>Front view</button>
            <button type="button" className="panel-tool" onClick={() => scene.current?.reset()}>Reset camera</button>
            <a className="panel-tool panel-asset-credits" href={import.meta.env.BASE_URL + 'room/credits.html'} target="_blank" rel="noreferrer">Asset credits</a>
          </div>
        </div>
      )}
    </div>
  );
}
