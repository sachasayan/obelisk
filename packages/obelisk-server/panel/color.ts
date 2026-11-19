export function mixColor(from: number, to: number, amount: number) {
  const red = Math.round((from >> 16) * (1 - amount) + (to >> 16) * amount);
  const green = Math.round(((from >> 8) & 255) * (1 - amount) + ((to >> 8) & 255) * amount);
  const blue = Math.round((from & 255) * (1 - amount) + (to & 255) * amount);
  return (red << 16) | (green << 8) | blue;
}

export function scaleColor(color: number, brightness: number) {
  return mixColor(0, color, brightness);
}
