const DEFAULT_PINCH_SENSITIVITY = 24;

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

function centroid(points) {
  let x = 0;
  let y = 0;
  for (const point of points) {
    x += point.x;
    y += point.y;
  }
  const n = Math.max(points.length, 1);
  return { x: x / n, y: y / n };
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

function isGesturePointer(event) {
  if (event.pointerType === 'touch' || event.pointerType === 'pen') return true;
  // A real touch already owns the gesture. Skip the mouse pointer some browsers
  // synthesize afterward, or a double-tap is seen as a two-finger pinch.
  if (event.pointerType === 'mouse') return !isGesturePointer.sawTouch;
  return false;
}

const DOUBLE_TAP_MS = 350;
const DOUBLE_TAP_SLOP = 28;
const TAP_MOVE_SLOP = 18;

export function mountTouchGestures({ onDrag, onPan, onPinch, onGestureEnd, onDoubleTap } = {}) {
  const pointers = new Map();
  let drag = null;
  let duo = null;
  let lastTap = null;

  function resetGesture() {
    drag = null;
    duo = null;
  }

  function onPointerDown(event) {
    if (event.pointerType === 'touch' || event.pointerType === 'pen') isGesturePointer.sawTouch = true;
    if (!isGesturePointer(event)) return;
    const blocked = isBlockedTarget(event.target);
    pointers.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
      blocked,
    });

    if (pointers.size === 1 && !blocked) {
      drag = {
        id: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        originX: event.clientX,
        originY: event.clientY,
        moved: false,
      };
      duo = null;
      try {
        event.target?.setPointerCapture?.(event.pointerId);
      } catch {
        /* ignore */
      }
      return;
    }

    if (pointers.size === 2) {
      drag = null;
      const pts = [...pointers.values()];
      const center = centroid(pts);
      duo = {
        dist: Math.max(distance(pts[0], pts[1]), 1),
        x: center.x,
        y: center.y,
        pinchCarry: 0,
        blocked: pts.some((point) => point.blocked),
        moved: false,
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

    if (pointers.size === 1 && drag && event.pointerId === drag.id) {
      const dx = event.clientX - drag.x;
      const dy = event.clientY - drag.y;
      drag.x = event.clientX;
      drag.y = event.clientY;
      if (Math.abs(dx) < 0.01 && Math.abs(dy) < 0.01) return;
      const travel = Math.hypot(event.clientX - drag.originX, event.clientY - drag.originY);
      if (travel > TAP_MOVE_SLOP) drag.moved = true;
      onDrag?.(dx, dy);
      return;
    }

    if (pointers.size !== 2 || !duo || duo.blocked) return;
    const pts = [...pointers.values()];
    const dist = Math.max(distance(pts[0], pts[1]), 1);
    const center = centroid(pts);
    const ratio = dist / duo.dist;
    const panDx = center.x - duo.x;
    const panDy = center.y - duo.y;
    duo.dist = dist;
    duo.x = center.x;
    duo.y = center.y;

    const pinch = consumePinch(duo.pinchCarry, ratio);
    duo.pinchCarry = pinch.carry;
    if (pinch.steps !== 0) {
      duo.moved = true;
      onPinch?.(pinch.steps);
    }
    if (Math.abs(panDx) >= 0.2 || Math.abs(panDy) >= 0.2) {
      duo.moved = true;
      onPan?.(panDx, panDy);
    }
  }

  function finishPointer(event) {
    const point = pointers.get(event.pointerId);
    if (!point) return;
    pointers.delete(event.pointerId);

    if (drag && event.pointerId === drag.id) {
      const moved = drag.moved;
      drag = null;
      if (moved || point.blocked) {
        lastTap = null;
        if (moved) onGestureEnd?.('drag');
        return;
      }
      const now = performance.now();
      const x = event.clientX;
      const y = event.clientY;
      if (
        lastTap &&
        now - lastTap.time <= DOUBLE_TAP_MS &&
        Math.hypot(x - lastTap.x, y - lastTap.y) <= DOUBLE_TAP_SLOP
      ) {
        lastTap = null;
        onDoubleTap?.();
        return;
      }
      lastTap = { time: now, x, y };
      return;
    }

    if (duo && pointers.size < 2) {
      const moved = !duo.blocked && duo.moved;
      duo = null;
      drag = null;
      if (moved) onGestureEnd?.('duo');
    }
  }

  document.addEventListener('pointerdown', onPointerDown, { passive: true });
  document.addEventListener('pointermove', onPointerMove, { passive: true });
  document.addEventListener('pointerup', finishPointer);
  document.addEventListener('pointercancel', finishPointer);

  return () => {
    document.removeEventListener('pointerdown', onPointerDown);
    document.removeEventListener('pointermove', onPointerMove);
    document.removeEventListener('pointerup', finishPointer);
    document.removeEventListener('pointercancel', finishPointer);
  };
}
