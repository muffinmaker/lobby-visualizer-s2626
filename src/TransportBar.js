function createBtn(label, title, className = 'transport-btn') {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = className;
  btn.setAttribute('aria-label', title);
  btn.setAttribute('title', title);
  btn.textContent = label;
  btn.addEventListener('click', (e) => e.stopPropagation());
  btn.addEventListener('pointerdown', (e) => e.stopPropagation());
  return btn;
}

export function mountTransportBar(guiElement, handlers) {
  const titleEl = guiElement.querySelector('.title');
  if (!titleEl) return null;

  titleEl.classList.add('gui-title-row');
  titleEl.textContent = '';

  const transport = document.createElement('div');
  transport.className = 'transport-cluster';

  const actions = document.createElement('div');
  actions.className = 'title-actions';

  const rewind = createBtn('⏪', 'Previous preset');
  const randomPrev = createBtn('◀', 'Random preset');
  const randomNext = createBtn('▶', 'Random preset');
  const fastForward = createBtn('⏩', 'Next preset');
  const save = createBtn('💾', 'Save preset', 'transport-btn save-btn');
  const info = createBtn('i', 'Tutorial', 'transport-btn info-btn');

  rewind.addEventListener('click', () => handlers.onRewind?.());
  randomPrev.addEventListener('click', () => handlers.onRandomPreset?.());
  randomNext.addEventListener('click', () => handlers.onRandomPreset?.());
  fastForward.addEventListener('click', () => handlers.onFastForward?.());
  save.addEventListener('click', () => handlers.onSave?.());
  info.addEventListener('click', () => handlers.onInfo?.());

  transport.append(rewind, randomPrev, randomNext, fastForward);
  actions.append(save, info);
  transport.addEventListener('click', (e) => e.stopPropagation());
  transport.addEventListener('pointerdown', (e) => e.stopPropagation());
  actions.addEventListener('click', (e) => e.stopPropagation());
  actions.addEventListener('pointerdown', (e) => e.stopPropagation());
  titleEl.append(transport, actions);

  return { rewind, randomPrev, randomNext, fastForward, save, info };
}
