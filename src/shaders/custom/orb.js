import { PALETTE_FN, PALETTE_UNIFORMS } from '../../paletteGlsl.js';

export default {
  id: 'orb',
  label: 'Orb',
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
    uniform float uZoom;
    uniform float uPanX;
    uniform float uPanY;
    uniform float uBrightness;
    uniform float uSaturation;
    uniform float uBloom;
    uniform float uSpin;
    uniform float uDetail;
    uniform float uGlow;
    uniform float uWarp;
    uniform float uNoise;
    uniform float uPalette;
    uniform vec2 uResolution;
    uniform float uAspect;
    ${PALETTE_UNIFORMS}
    ${PALETTE_FN}

    varying vec2 vUv;

    mat2 rot(float a) {
      float c = cos(a), s = sin(a);
      return mat2(c, -s, s, c);
    }

    float mapScene(vec3 p) {
      p.xz = rot(uTime * (0.25 + uSpin) ) * p.xz;
      p.xy = rot(uTime * 0.17 * uSpin) * p.xy;
      float radius = 0.72;
      float freq = 3.0 + uWarp * 6.0;
      float wobble = sin(p.x * freq + uTime) * sin(p.y * freq) * sin(p.z * freq);
      wobble += sin(p.x * 13.0 + p.z * 9.0) * uNoise * 0.35;
      return length(p) - radius - wobble * (0.04 + uDetail * 0.16);
    }

    vec3 normalAt(vec3 p) {
      float e = 0.0025;
      vec2 h = vec2(e, 0.0);
      return normalize(vec3(
        mapScene(p + h.xyy) - mapScene(p - h.xyy),
        mapScene(p + h.yxy) - mapScene(p - h.yxy),
        mapScene(p + h.yyx) - mapScene(p - h.yyx)
      ));
    }

    void main() {
      vec2 uv = (vUv - 0.5) * vec2(uAspect, 1.0);
      uv -= vec2(uPanX, uPanY) * 0.35;
      float zoom = max(uZoom, 0.35);
      vec3 ro = vec3(0.0, 0.05, -2.4 / zoom);
      vec3 rd = normalize(vec3(uv, 1.15));
      float t = 0.0;
      float hit = 0.0;
      for (int i = 0; i < 48; i++) {
        vec3 p = ro + rd * t;
        float d = mapScene(p);
        if (d < 0.002) { hit = 1.0; break; }
        t += d * 0.85;
        if (t > 8.0) break;
      }
      vec3 col = vec3(0.01, 0.012, 0.02);
      if (hit > 0.5) {
        vec3 p = ro + rd * t;
        vec3 n = normalAt(p);
        float light = clamp(dot(n, normalize(vec3(0.4, 0.7, 0.5))), 0.0, 1.0);
        float rim = pow(1.0 - clamp(dot(n, -rd), 0.0, 1.0), 2.2);
        float hue = colorLook(n.y, p.xy, uTime * 0.1, 0.15 + n.y * 0.35 + uTime * 0.05);
        vec3 ink = namedPalette(hue, uPalette);
        col = ink * (0.18 + light * 0.9) + ink * rim * (0.25 + uGlow);
        col += namedPalette(hue + 0.2, uPalette) * uBloom * rim * (0.2 + uGlow * 0.45);
      }
      float gray = dot(col, vec3(0.299, 0.587, 0.114));
      col = mix(vec3(gray), col, uSaturation);
      col *= uBrightness;
      gl_FragColor = vec4(col, 1.0);
    }
  `,
};
