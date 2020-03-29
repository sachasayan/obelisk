let fade = (t, freq, offset) => {
  return Math.abs(Math.sin(  Math.PI * (t % freq / freq - offset) ));
 };

let isViable = (coords, matrix) => {
  return coords.x >= 0 && coords.y >= 0 && coords.x < matrix.width() && coords.y < matrix.height();
}

let getAdjacent = (x, y, matrix) => {
  return [{x: x+1, y: y}, {x: x-1, y: y}, {x: x, y: y-1}, {x: x, y: y+1}]
    .filter(coords => isViable(coords,matrix));
}

export { fade, isViable, getAdjacent};