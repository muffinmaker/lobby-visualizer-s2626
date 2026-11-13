export function mountHelpMode(roots, buttons) {
  const tip = document.createElement('div');
  tip.className = 'help-tip';
  tip.hidden = true;
  document.body.append(tip);

  let enabled = false;
  const buttonList = buttons.filter(Boolean);

  function setEnabled(next) {
    enabled = next;
    for (const button of buttonList) {
      button.classList.toggle('is-active', enabled);
      button.setAttribute('aria-pressed', String(enabled));
    }
    for (const root of roots) root?.classList.toggle('help-mode', enabled);
    if (!enabled) tip.hidden = true;
  }

  function toggle() {
    setEnabled(!enabled);
  }

  function describe(event) {
    const node = event.target;
    if (!(node instanceof Element)) return '';
    const marked = node.closest('[data-help]');
    if (marked?.dataset.help) return marked.dataset.help;
    const buttonEl = node.closest('button');
    if (buttonEl) return buttonEl.getAttribute('aria-label') || buttonEl.getAttribute('title') || '';
    const title = node.closest('.lil-gui:not(.root) > .title');
    if (title) {
      const name = title.textContent.replace(/[▾▸]/g, '').trim();
      return name ? `${name} holds the controls for that part of the picture.` : '';
    }
    return '';
  }

  function onOver(event) {
    if (!enabled) return;
    const text = describe(event);
    if (!text) {
      tip.hidden = true;
      return;
    }
    tip.textContent = text;
    tip.hidden = false;
    move(event);
  }

  function move(event) {
    if (tip.hidden) return;
    const pad = 14;
    const rect = tip.getBoundingClientRect();
    let x = event.clientX + pad;
    let y = event.clientY + pad;
    if (x + rect.width > window.innerWidth - 8) x = event.clientX - rect.width - pad;
    if (y + rect.height > window.innerHeight - 8) y = event.clientY - rect.height - pad;
    tip.style.left = `${Math.max(8, x)}px`;
    tip.style.top = `${Math.max(8, y)}px`;
  }

  for (const root of roots) {
    if (!root) continue;
    root.addEventListener('pointerover', onOver);
    root.addEventListener('pointermove', move);
    root.addEventListener('pointerleave', () => {
      tip.hidden = true;
    });
  }

  return { setEnabled, toggle };
}
