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
    uniform float uZoom;
    uniform float uAspect;

    varying vec2 vUv;

    vec3 palette(float t) {
      return 0.5 + 0.5 * cos(6.28318 * (vec3(0.0, 0.33, 0.67) + t));
    }

    mat2 rot(float a) {
      float s = sin(a), c = cos(a);
      return mat2(c, -s, s, c);
    }

    float ribbon(vec2 p, float phase, float t) {
      p = rot(t * 0.2 * uTwistAmount + phase) * p;
      float wave = sin(p.x * 4.0 * uComplexity + t * 1.2 + phase * 3.0);
      float curve = p.y - wave * 0.35 * uScale;
      return uThickness / (abs(curve) + 0.002);
    }

    void main() {
      vec2 uv = (vUv - 0.5) * vec2(uAspect, 1.0) * 2.4 / max(uZoom, 0.2);
      float t = uTime;
      vec3 col = vec3(0.0);

      for (float i = 0.0; i < 10.0; i++) {
        if (i >= uRibbonCount) break;
        float fi = i + 1.0;
        float phase = fi * 1.618;
        vec2 p = uv;
        p.x += sin(t * 0.3 + fi) * 0.15;
        float r = ribbon(p, phase, t);
        col += palette(fi * 0.11 + t * 0.07) * r;
      }

      col *= uBrightness;
      col += col * uBloom * 0.25;
      float gray = dot(col, vec3(0.299, 0.587, 0.114));
      col = mix(vec3(gray), col, uSaturation);

      gl_FragColor = vec4(col, 1.0);
    }
  `,
};
