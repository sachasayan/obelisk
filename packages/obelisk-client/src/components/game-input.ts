import type { GameAction } from '../../../../shared/games';

const keys = new Map<string, GameAction>([
  ['arrowup', 'up'], ['w', 'up'],
  ['arrowleft', 'left'], ['a', 'left'],
  ['arrowdown', 'down'], ['s', 'down'],
  ['arrowright', 'right'], ['d', 'right'],
  [' ', 'action'], ['enter', 'action'],
]);

export function gameActionForKey(event: KeyboardEvent) {
  if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey ||
      (event.target instanceof Element &&
        event.target.closest('input, textarea, select, [contenteditable], [role="separator"], [role="tab"]'))) return;

  const action = keys.get(event.key.toLowerCase());
  if (action === 'action' && (event.repeat ||
      (event.target instanceof Element && event.target.closest('button, a')))) return;
  return action;
}
