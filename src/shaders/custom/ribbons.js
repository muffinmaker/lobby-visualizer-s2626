import { PALETTE_FN, PALETTE_UNIFORMS } from '../../paletteGlsl.js';

export default {
  id: 'ribbons',
  label: 'Ribbons',
  uniforms: {},
  vertex: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = vec4(position, 1.0);
    }
  `,
  fragment: /* glsl */ `
    uniform float uTime;
    uniform float uSpeed;
    uniform float uScale;
    uniform float uComplexity;
    uniform float uBrightness;
    uniform float uSaturation;
    uniform float uBloom;
    uniform float uRibbonCount;
    uniform float uThickness;
    uniform float uTwistAmount;
    uniform float uWave;
    uniform float uGlow;
    uniform float uSpread;
    uniform float uZoom;
    uniform float uPanX;
    uniform float uPanY;
    uniform float uAspect;
    uniform float uPalette;
    ${PALETTE_UNIFORMS}
    ${PALETTE_FN}

    varying vec2 vUv;

    mat2 rot(float a) {
      float s = sin(a), c = cos(a);
      return mat2(c, -s, s, c);
    }

    float ribbon(vec2 p, float phase, float t) {
      p = rot(t * 0.2 * uTwistAmount + phase) * p;
      float wave = sin(p.x * 4.0 * uComplexity + t * 1.6 + phase * 3.0);
      float curve = p.y - wave * (0.18 + uWave * 0.45) * max(uScale, 0.2);
      float line = uThickness / (abs(curve) + 0.002);
      float glow = exp(-abs(curve) * (18.0 + (1.0 - uGlow) * 16.0)) * (0.25 + uGlow * 0.55);
      return line + glow;
    }

    void main() {
      vec2 uv = (vUv - 0.5) * vec2(uAspect, 1.0) * clamp(2.4 / max(uZoom, 0.22), 0.24, 6.5);
      uv -= vec2(uPanX, uPanY);
      float t = uTime;
      vec3 col = vec3(0.0);

      for (float i = 0.0; i < 10.0; i++) {
        if (i >= uRibbonCount) break;
        float fi = i + 1.0;
        float phase = fi * 1.618;
        vec2 p = uv;
        p.x += sin(t * 0.55 + fi) * 0.22;
        p.y += (fi - 3.0) * uSpread * 0.16;
        float r = ribbon(p, phase, t);
        col += namedPalette(fi * 0.17 + t * 0.16, uPalette) * r;
      }

      col *= uBrightness * 1.15;
      col += col * uBloom * 0.4;
      float gray = dot(col, vec3(0.299, 0.587, 0.114));
      col = mix(vec3(gray), col, uSaturation);

      gl_FragColor = vec4(col, 1.0);
    }
  `,
};
