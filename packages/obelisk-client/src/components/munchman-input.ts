import type { MunchmanDirection } from '../../../../shared/munchman';

const keys = new Map<string, MunchmanDirection>([
  ['arrowup', 'up'], ['w', 'up'],
  ['arrowleft', 'left'], ['a', 'left'],
  ['arrowdown', 'down'], ['s', 'down'],
  ['arrowright', 'right'], ['d', 'right'],
]);

export function munchmanDirectionForKey(event: KeyboardEvent) {
  if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey ||
      (event.target instanceof Element &&
        event.target.closest('input, textarea, select, [contenteditable], [role="separator"]'))) return;

  return keys.get(event.key.toLowerCase());
}
