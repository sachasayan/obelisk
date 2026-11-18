import type { ModeState } from '../panel/types';

let frameTimer: NodeJS.Timeout;

function init({ matrix, loadFont }: ModeState) {
  const font = loadFont('tom-thumb');

  matrix.afterSync(() => {
    const text = new Date().toLocaleString('en-US', {
      timeZone: 'America/Toronto',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      hour12: true,
    });
    const lines: string[] = [];
    let line = '';
    for (const word of text.split(' ')) {
      const candidate = line ? `${line} ${word}` : word;
      if (line && font.stringWidth(candidate) > matrix.width()) {
        lines.push(line);
        line = word;
      } else {
        line = candidate;
      }
    }
    lines.push(line);

    matrix.clear();
    const top = Math.floor((matrix.height() - lines.length * font.height()) / 2);
    for (const [index, line] of lines.entries()) {
      const x = Math.floor((matrix.width() - font.stringWidth(line)) / 2);
      matrix.drawText(line, x, top + index * font.height());
    }
    frameTimer = setTimeout(() => matrix.sync(), 1000);
  });

  matrix.clear().font(font).brightness(100).fgColor(0x111111).sync();
}

export const Clock = {
  init,
  deactivate() {
    clearTimeout(frameTimer);
  },
};
