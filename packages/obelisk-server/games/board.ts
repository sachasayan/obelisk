import type { ModeState, PanelMatrix } from '../panel/types';

export const seatColors = [0x49ddc6, 0xec549a];
export const quietCell = 0x111927;

export interface GameBoard {
  cell(x: number, y: number, color: number): void;
  surround(color: number): void;
}

function fill(matrix: PanelMatrix, x: number, y: number, width: number, height: number, color: number) {
  matrix.fgColor(color);
  for (let row = y; row < y + height; row++) matrix.drawLine(x, row, x + width - 1, row);
}

export function drawBoards(
  { matrix }: ModeState, columns: number, rows: number, count: number, active: number,
  paint: (board: GameBoard, index: number) => void,
) {
  const width = matrix.width();
  const height = matrix.height();
  const layouts = count > 1
    ? [{ across: 2, down: 1 }, { across: 1, down: 2 }]
    : [{ across: 1, down: 1 }];
  const fits = layouts.map(({ across, down }) => ({
    across, down,
    scale: Math.floor(Math.min((width / across - (across - 1)) / columns,
      (height / down - (down - 1)) / rows)),
  })).filter(({ scale }) => scale > 0).sort((a, b) => b.scale - a.scale);
  const { across, down, scale } = fits[0] ?? { across: 1, down: 1, scale: 1 };

  const stretch = width >= height * 4
    ? Math.max(1, Math.min(3, Math.floor(width / across / (columns * scale * 1.7))))
    : 1;
  const pitchX = scale * stretch;
  for (let i = 0; i < across * down; i++) {
    const index = across * down < count ? active : i;
    const x = Math.floor((i % across + .5) * width / across - columns * pitchX / 2);
    const y = Math.floor((Math.floor(i / across) + .5) * height / down - rows * scale / 2);
    const cellHeight = scale >= 3 ? scale - 1 : scale;
    const cellWidth = pitchX >= 3 ? pitchX - 1 : pitchX;
    paint({
      cell(cx, cy, color) {
        if (cx >= 0 && cx < columns && cy >= 0 && cy < rows) {
          fill(matrix, x + cx * pitchX, y + cy * scale, cellWidth, cellHeight, color);
        }
      },
      surround(color) {
        if (x >= 1 && y >= 1 && x + columns * pitchX < width && y + rows * scale < height) {
          matrix.fgColor(color).drawRect(x - 1, y - 1, columns * pitchX + 1, rows * scale + 1);
        }
      },
    }, index);
  }
}
