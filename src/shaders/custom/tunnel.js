import { PALETTE_FN, PALETTE_UNIFORMS } from '../../paletteGlsl.js';

export default {
  id: 'tunnel',
  label: 'Tunnel',
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
    uniform float uTwist;
    uniform float uDetail;
    uniform float uGlow;
    uniform float uFog;
    uniform float uWarp;
    uniform float uPalette;
    uniform float uAspect;
    ${PALETTE_UNIFORMS}
    ${PALETTE_FN}

    varying vec2 vUv;

    mat2 rot(float a) {
      float c = cos(a), s = sin(a);
      return mat2(c, -s, s, c);
    }

    float mapScene(vec3 p) {
      float travel = uTime * (0.35 + uSpeed * 0.55);
      p.z += travel;
      p.xy = rot(p.z * uTwist * 0.35 + travel * 0.2) * p.xy;
      p.x += sin(p.z * (1.5 + uWarp * 4.0) + travel) * uWarp * 0.18;
      float radius = 1.05 + 0.16 * sin(p.z * (1.2 + uDetail * 2.0));
      float ribs = 0.045 * sin(atan(p.y, p.x) * (6.0 + uDetail * 6.0) + p.z * 3.0);
      return radius - length(p.xy) + ribs;
    }

    vec3 normalAt(vec3 p) {
      float e = 0.003;
      vec2 h = vec2(e, 0.0);
      return normalize(vec3(
        mapScene(p + h.xyy) - mapScene(p - h.xyy),
        mapScene(p + h.yxy) - mapScene(p - h.yxy),
        mapScene(p + h.yyx) - mapScene(p - h.yyx)
      ));
    }

    void main() {
      vec2 uv = (vUv - 0.5) * vec2(uAspect, 1.0);
      uv -= vec2(uPanX, uPanY) * 0.28;
      float zoom = max(uZoom, 0.4);
      vec3 ro = vec3(uv * 0.15, -0.2);
      vec3 rd = normalize(vec3(uv * (0.85 / zoom), 1.0));
      float t = 0.0;
      float hit = 0.0;
      for (int i = 0; i < 56; i++) {
        vec3 p = ro + rd * t;
        float d = mapScene(p);
        if (d < 0.004) { hit = 1.0; break; }
        t += max(d, 0.02);
        if (t > 14.0) break;
      }
      vec3 col = vec3(0.012, 0.01, 0.02);
      if (hit > 0.5) {
        vec3 p = ro + rd * t;
        vec3 n = normalAt(p);
        float light = clamp(dot(n, normalize(vec3(0.2, 0.35, 0.8))), 0.0, 1.0);
        float fog = exp(-t * (0.08 + uFog * 0.28));
        float hue = colorLook(p.z * 0.05, p.xy, uTime * 0.1, 0.08 + atan(p.y, p.x) * 0.08 + p.z * 0.05);
        vec3 ink = namedPalette(hue, uPalette);
        col = ink * (0.12 + light) * fog;
        col += ink * (uBloom + uGlow) * fog * 0.28;
      }
      float gray = dot(col, vec3(0.299, 0.587, 0.114));
      col = mix(vec3(gray), col, uSaturation);
      col *= uBrightness;
      gl_FragColor = vec4(col, 1.0);
    }
  `,
};
