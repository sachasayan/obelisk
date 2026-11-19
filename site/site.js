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
