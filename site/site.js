for (const gallery of document.querySelectorAll('[data-gallery]')) {
  const controls = gallery.querySelector('[data-gallery-controls]');
  if (!controls) continue;
  const buttons = [...controls.querySelectorAll('[data-select-view]')];
  const images = [...gallery.querySelectorAll('[data-view]')];
  const captions = [...gallery.querySelectorAll('[data-caption]')];

  function show(view) {
    for (const image of images) image.hidden = image.dataset.view !== view;
    for (const caption of captions) caption.hidden = caption.dataset.caption !== view;
    for (const button of buttons) button.setAttribute('aria-pressed', String(button.dataset.selectView === view));
  }

  controls.hidden = false;
  for (const button of buttons) button.addEventListener('click', () => show(button.dataset.selectView));
}

if (navigator.clipboard && window.isSecureContext) {
  for (const snippet of document.querySelectorAll('[data-snippet]')) {
    const code = snippet.querySelector('code');
    if (!code) continue;

    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = 'Copy commands';
    button.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(code.textContent);
        button.textContent = 'Copied';
      } catch {
        button.textContent = 'Select the commands to copy';
      }
    });
    snippet.prepend(button);
  }
}
