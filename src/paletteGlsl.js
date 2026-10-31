/** Declared in each shader that samples the shared palette, including Custom. */
export const PALETTE_UNIFORMS = /* glsl */ `
uniform float uPal0R;
uniform float uPal0G;
uniform float uPal0B;
uniform float uPal1R;
uniform float uPal1G;
uniform float uPal1B;
uniform float uPal2R;
uniform float uPal2G;
uniform float uPal2B;
uniform float uWhiteness;
uniform float uBlackness;
uniform float uColorMode;
uniform float uColorPhase;
`;

export const PALETTE_FN = /* glsl */ `
vec3 customPalette(float hue) {
  vec3 a = vec3(uPal0R, uPal0G, uPal0B);
  vec3 b = vec3(uPal1R, uPal1G, uPal1B);
  vec3 c = vec3(uPal2R, uPal2G, uPal2B);
  float x = fract(hue) * 3.0;
  float i = floor(x);
  float f = smoothstep(0.0, 1.0, fract(x));
  vec3 fromColor = a;
  vec3 toColor = b;
  if (i > 0.5 && i < 1.5) {
    fromColor = b;
    toColor = c;
  } else if (i > 1.5) {
    fromColor = c;
    toColor = a;
  }
  return mix(fromColor, toColor, f);
}

vec3 spiroNeon(float hue, float chroma, vec3 offset, float gain) {
  vec3 base = 0.5 + 0.5 * cos(6.28318 * (offset + hue * chroma));
  return pow(clamp(base, 0.0, 1.0), vec3(0.82)) * gain;
}

vec3 tonePalette(vec3 ink) {
  ink = mix(ink, vec3(1.0), clamp(uWhiteness, 0.0, 1.0));
  ink = mix(ink, vec3(0.0), clamp(uBlackness, 0.0, 1.0));
  return ink;
}

float colorLook(float along, vec2 p, float motion, float fallback) {
  float m = floor(uColorMode + 0.5);
  if (m < 0.5) return fallback;
  float ang = atan(p.y, p.x) * 0.1591549;
  float n = sin(dot(p, vec2(5.2, 3.7)) + along * 4.0);
  if (m < 1.5) return motion + uColorPhase;
  if (m < 2.5) return ang * 2.0 + along * 0.25 + uColorPhase;
  if (m < 3.5) return n + uColorPhase;
  if (m < 4.5) return floor((along + ang) * 6.0) / 6.0 + uColorPhase;
  return uColorPhase * 4.0 + along * 1.6;
}

vec3 namedPalette(float hue, float paletteId) {
  float p = floor(paletteId + 0.5);
  if (p > 24.5) return tonePalette(customPalette(hue));
  vec3 offset = vec3(0.0, 0.33, 0.67);
  float chroma = 1.65;
  float gain = 1.35;
  float h = hue;

  if (p < 0.5) {
    // Classic
  } else if (p < 1.5) {
    offset = vec3(0.05, 0.12, 0.22);
    chroma = 1.15;
  } else if (p < 2.5) {
    offset = vec3(0.52, 0.62, 0.72);
    chroma = 1.35;
  } else if (p < 3.5) {
    chroma = 2.1;
  } else if (p < 4.5) {
    offset = vec3(0.12, 0.28, 0.42);
    chroma = 0.95;
    gain = 1.12;
  } else if (p < 5.5) {
    offset = vec3(0.0, 0.18, 0.38);
    chroma = 1.25;
  } else if (p < 6.5) {
    offset = vec3(0.42, 0.54, 0.66);
    chroma = 1.4;
  } else if (p < 7.5) {
    vec3 vivid = spiroNeon(h, 1.65, vec3(0.0, 0.33, 0.67), 1.35);
    float mono = dot(vivid, vec3(0.299, 0.587, 0.114));
    return mix(vec3(0.5), vec3(mono), 0.85);
  } else if (p < 8.5) {
    chroma = 2.45;
    h *= 1.35;
  } else if (p < 9.5) {
    offset = vec3(0.35, 0.55, 0.75);
    chroma = 1.9;
    h += sin(h * 2.2) * 0.1;
  } else if (p < 10.5) {
    offset = vec3(0.0, 0.08, 0.18);
    chroma = 1.55;
  } else if (p < 11.5) {
    chroma = 2.25;
    h += sin(h * 1.7) * 0.14;
  } else if (p < 12.5) {
    offset = vec3(0.85, 0.05, 0.55);
    chroma = 0.55;
    gain = 1.15;
  } else if (p < 13.5) {
    offset = vec3(0.28, 0.85, 0.22);
    chroma = 0.45;
    gain = 1.12;
  } else if (p < 14.5) {
    offset = vec3(0.12, 0.42, 0.95);
    chroma = 0.35;
    gain = 1.2;
  } else if (p < 15.5) {
    offset = vec3(0.55, 0.72, 0.95);
    chroma = 0.4;
    gain = 1.15;
  } else if (p < 16.5) {
    offset = vec3(0.95, 0.25, 0.55);
    chroma = 1.1;
    gain = 1.2;
  } else if (p < 17.5) {
    offset = vec3(0.18, 0.55, 0.22);
    chroma = 0.5;
    gain = 1.05;
  } else if (p < 18.5) {
    offset = vec3(0.08, 0.38, 0.72);
    chroma = 0.42;
    gain = 1.1;
  } else if (p < 19.5) {
    offset = vec3(0.62, 0.22, 0.92);
    chroma = 0.55;
    gain = 1.15;
  } else if (p < 20.5) {
    offset = vec3(0.95, 0.15, 0.55);
    chroma = 0.12;
    gain = 1.55;
  } else if (p < 21.5) {
    offset = vec3(0.55, 0.05, 0.95);
    chroma = 0.1;
    gain = 1.5;
  } else if (p < 22.5) {
    offset = vec3(0.25, 0.95, 0.15);
    chroma = 0.1;
    gain = 1.5;
  } else if (p < 23.5) {
    offset = vec3(0.02, 0.42, 0.95);
    chroma = 0.12;
    gain = 1.5;
  } else {
    offset = vec3(0.72, 0.95, 0.15);
    chroma = 0.12;
    gain = 1.5;
  }

  return tonePalette(spiroNeon(h, chroma, offset, gain));
}
`;
