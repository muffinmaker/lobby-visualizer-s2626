const DEFAULT_SWIPE = {
  minDistance: 56,
  maxDuration: 700,
  axisRatio: 1.25,
};

const DEFAULT_PINCH_SENSITIVITY = 24;

export function classifySwipe(
  { dx, dy, dt },
  { minDistance, maxDuration, axisRatio } = DEFAULT_SWIPE,
) {
  if (!Number.isFinite(dx) || !Number.isFinite(dy) || !Number.isFinite(dt)) return null;
  if (dt < 0 || dt > maxDuration) return null;

  const ax = Math.abs(dx);
  const ay = Math.abs(dy);
  if (Math.max(ax, ay) < minDistance) return null;
  if (ax > ay * axisRatio) return dx < 0 ? 'left' : 'right';
  if (ay > ax * axisRatio) return dy < 0 ? 'up' : 'down';
  return null;
}

export function consumePinch(carry, ratio, sensitivity = DEFAULT_PINCH_SENSITIVITY) {
  if (!Number.isFinite(carry)) carry = 0;
  if (!Number.isFinite(ratio) || ratio <= 0) return { steps: 0, carry };
  const next = carry + Math.log(ratio) * sensitivity;
  const steps = Math.trunc(next);
  return { steps, carry: next - steps };
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function isBlockedTarget(target) {
  if (document.querySelector('.tutorial:not(.hidden)')) return true;
  if (document.getElementById('notepad-panel')?.classList.contains('is-open')) return true;
  return Boolean(
    target?.closest?.(
      '.phone-bar, .lil-gui, .tutorial, .notepad-card, button, a, input, textarea, select, label',
    ),
  );
}

export function mountTouchGestures({ onSwipe, onPinch, onPinchEnd } = {}) {
  const pointers = new Map();
  let swipe = null;
  let pinch = null;

  function resetGesture() {
    swipe = null;
    pinch = null;
  }

  function onPointerDown(event) {
    if (event.pointerType !== 'touch') return;
    const blocked = isBlockedTarget(event.target);
    pointers.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
      blocked,
    });

    if (pointers.size === 1 && !blocked) {
      swipe = {
        id: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        t: performance.now(),
      };
      pinch = null;
      return;
    }

    if (pointers.size === 2) {
      swipe = null;
      const pts = [...pointers.values()];
      pinch = {
        dist: Math.max(distance(pts[0], pts[1]), 1),
        carry: 0,
        blocked: pts.some((point) => point.blocked),
        changed: false,
      };
    }

    if (pointers.size > 2) {
      resetGesture();
    }
  }

  function onPointerMove(event) {
    const point = pointers.get(event.pointerId);
    if (!point) return;
    point.x = event.clientX;
    point.y = event.clientY;

    if (pointers.size !== 2 || !pinch || pinch.blocked) return;
    const pts = [...pointers.values()];
    const dist = Math.max(distance(pts[0], pts[1]), 1);
    const ratio = dist / pinch.dist;
    pinch.dist = dist;
    const consumed = consumePinch(pinch.carry, ratio);
    pinch.carry = consumed.carry;
    if (consumed.steps !== 0) {
      pinch.changed = true;
      onPinch?.(consumed.steps);
    }
  }

  function finishPointer(event) {
    const point = pointers.get(event.pointerId);
    if (!point) return;
    pointers.delete(event.pointerId);

    if (swipe && event.pointerId === swipe.id && pointers.size === 0) {
      const direction = classifySwipe({
        dx: event.clientX - swipe.x,
        dy: event.clientY - swipe.y,
        dt: performance.now() - swipe.t,
      });
      swipe = null;
      if (direction) onSwipe?.(direction);
      return;
    }

    if (pinch && pointers.size < 2) {
      const shouldEnd = !pinch.blocked && pinch.changed;
      pinch = null;
      swipe = null;
      if (shouldEnd) onPinchEnd?.();
    }
  }

  document.addEventListener('pointerdown', onPointerDown);
  document.addEventListener('pointermove', onPointerMove);
  document.addEventListener('pointerup', finishPointer);
  document.addEventListener('pointercancel', finishPointer);

  return () => {
    document.removeEventListener('pointerdown', onPointerDown);
    document.removeEventListener('pointermove', onPointerMove);
    document.removeEventListener('pointerup', finishPointer);
    document.removeEventListener('pointercancel', finishPointer);
  };
}
