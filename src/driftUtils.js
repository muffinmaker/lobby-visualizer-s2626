/** Whether a uniform spec can use the ↻ slow-drift system. */
export function canDrift(spec) {
  if (!spec || spec.rebuild) return false;
  if (spec.kind === 'palette' || spec.kind === 'shape' || spec.kind === 'trailShape' || spec.kind === 'stampShape' || spec.kind === 'toggle') {
    return false;
  }
  return true;
}

export function isDiscreteDriftSpec(spec) {
  return (
    spec?.kind === 'count' ||
    spec?.kind === 'palette' ||
    spec?.kind === 'shape' ||
    spec?.kind === 'trailShape' ||
    spec?.kind === 'stampShape' ||
    spec?.kind === 'toggle'
  );
}
