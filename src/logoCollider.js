/** Match flow shader space after aspect division (y-up, ±halfH at viewport edges). */
export function visibleHalfHeightAtZ0(camera) {
  const dist = Math.abs(camera.position.z);
  const vFov = (camera.fov * Math.PI) / 180;
  return dist * Math.tan(vFov / 2);
}

export function logoContainFractions(viewportW, viewportH, imageW, imageH) {
  const vpAspect = viewportW / Math.max(viewportH, 1);
  const imgAspect = imageW / Math.max(imageH, 1);
  if (imgAspect > vpAspect) {
    return { fracW: 1, fracH: vpAspect / imgAspect };
  }
  return { fracW: imgAspect / vpAspect, fracH: 1 };
}

const COLLIDER_SHAPE = {
  ellipse: 0,
  heart: 1,
  triangle: 2,
};

export function colliderShapeId(kind = 'ellipse') {
  return COLLIDER_SHAPE[kind] ?? 0;
}

/** Half-extents in flow post-aspect screen space (matches logo overlay contain + scale). */
export function computeLogoColliderHalfExtents({
  camera,
  viewportW,
  viewportH,
  imageW = 100,
  imageH = 100,
  logoScalePercent = 100,
  padding = 1.04,
}) {
  const halfH = visibleHalfHeightAtZ0(camera);
  const scale = Math.max(0.1, Math.min(2, logoScalePercent / 100));
  const { fracW, fracH } = logoContainFractions(viewportW, viewportH, imageW, imageH);
  return {
    halfX: fracW * halfH * scale * padding,
    halfY: fracH * halfH * scale * padding,
  };
}
