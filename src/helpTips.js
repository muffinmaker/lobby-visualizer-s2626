const TIPS = {
  uSpeed: 'How fast the picture moves. 0 holds still.',
  uScale: 'Overall size of the drawing.',
  uComplexity: 'How tangled or simple the motion is.',
  uBrightness: 'How bright the colors are.',
  uSaturation: 'How strong the color is. Low is grey.',
  uBloom: 'Soft glow around the bright parts.',
  uWhiteness: 'Pulls the palette toward white.',
  uBlackness: 'Pulls the palette toward black.',
  uInvert: 'Flips the finished picture, so a light image becomes dark and a dark image becomes light.',
  uPanX: 'Look left and right. 50 is the center.',
  uPanY: 'Look up and down. 50 is the center.',
  uTrailDecay: 'How long marks stay. 100 keeps them so you can paint. Lower values fade the stroke.',
  uGravity: 'How hard Spiro Flow pens are pulled. 0 is the normal orbit.',
  uGravityAngle: 'The direction that gravity pulls the pens.',
  uPointSize: 'Size of each pen or particle.',
  uPointShape: 'The shape stamped by each pen.',
  uPointRotation: 'Turns the pen shape.',
  uTransparency: 'How solid each pen stamp is.',
  uOrbitCount: 'How many pens draw at once.',
  uTwist: 'How much the orbits twist.',
  uPulse: 'A slow grow and shrink of the orbits.',
  uZoom: 'Zoom in or out.',
  uPalette: 'The color palette used by this mode.',
  uObjectScale: 'Scales the drawn objects.',
  uFieldShape: 'Outline of the particle cloud.',
  uShapeSize: 'Size of that outline.',
  uSizeSpread: 'Mixes small and large particles.',
  uMotion: 'How the particles travel.',
  uParticleCount: 'How many particles are drawn.',
  motionTrails: 'Global trail strength. 100 lets Trail decay hold a painting.',
  trailsNeverDecay: 'When on, trails are forced to fade instead of holding.',
  menuScale: 'Size of this menu. Phone uses the screen width.',
  performancePreset: 'Stepped slider: Full, Balanced, or Lite. Lite caps the heavy settings.',
  resolutionScale: 'Render resolution. Lower is lighter.',
};

export function tipFor(key, label) {
  if (TIPS[key]) return TIPS[key];
  if (label) return `${label} changes this part of the picture.`;
  return 'Changes this part of the picture.';
}
