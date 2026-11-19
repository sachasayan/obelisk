import streetcarUrl from '../../obelisk-server/images/streetcar.png?url';

export async function loadStreetcar() {
  const image = new Image();
  image.src = streetcarUrl;
  await image.decode();
  const canvas = document.createElement('canvas');
  canvas.width = image.width;
  canvas.height = image.height;
  const context = canvas.getContext('2d')!;
  context.drawImage(image, 0, 0);
  return context.getImageData(0, 0, image.width, image.height);
}

export async function fetchArrivalMinutes(signal: AbortSignal) {
  const { nextArrivalMinutes, defaultStopId } = await import('../../obelisk-server/ttc');
  const response = await fetch('/simulator/transit/trips', { signal });
  if (!response.ok) throw new Error(`TTC feed returned HTTP ${response.status}`);
  return nextArrivalMinutes(new Uint8Array(await response.arrayBuffer()), defaultStopId);
}
