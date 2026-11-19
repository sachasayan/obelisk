// The standalone URL opens the display. The inner iframe hosts its remote.
if (window.parent !== window) document.documentElement.classList.add('embedded-simulator');
const remote = !location.hash.startsWith('#/display') && window.parent !== window && window.parent.obeliskSession;
if (!remote) {
  if (!location.hash.startsWith('#/display')) history.replaceState(null, '', '#/display');
  const { createSession } = await import('./session');
  window.obeliskSession = createSession();
}
await import('../src/index');
