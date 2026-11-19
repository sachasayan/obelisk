export function forEachOpaquePixel(image: { width: number; height: number; data: ArrayLike<number> }, visit: (x: number, y: number, color: number) => void) {
  for (let y = 0; y < image.height; y++) {
    for (let x = 0; x < image.width; x++) {
      const offset = (y * image.width + x) * 4;
      if (image.data[offset + 3] === 255) {
        visit(x, y, (image.data[offset] << 16) | (image.data[offset + 1] << 8) | image.data[offset + 2]);
      }
    }
  }
}
