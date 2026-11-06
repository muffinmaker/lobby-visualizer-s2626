import { PALETTE_FN, PALETTE_UNIFORMS } from '../../paletteGlsl.js';

export default {
  id: 'chamber',
  label: 'Chamber',
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
    uniform float uDetail;
    uniform float uSpin;
    uniform float uGlow;
    uniform float uFog;
    uniform float uWarp;
    uniform float uForm;
    uniform float uPalette;
    uniform float uAspect;
    ${PALETTE_UNIFORMS}
    ${PALETTE_FN}

    varying vec2 vUv;

    mat2 rot(float a) {
      float c = cos(a), s = sin(a);
      return mat2(c, -s, s, c);
    }

    float sdBox(vec3 p, vec3 b) {
      vec3 q = abs(p) - b;
      return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0);
    }

    float sdCappedCylinder(vec3 p, float h, float r) {
      vec2 d = abs(vec2(length(p.xz), p.y)) - vec2(r, h);
      return min(max(d.x, d.y), 0.0) + length(max(d, 0.0));
    }

    float sdTorus(vec3 p, vec2 t) {
      vec2 q = vec2(length(p.xz) - t.x, p.y);
      return length(q) - t.y;
    }

    float sdOcta(vec3 p, float s) {
      p = abs(p);
      return (p.x + p.y + p.z - s) * 0.57735027;
    }

    float mapScene(vec3 p) {
      float form = floor(uForm + 0.5);
      p.y += sin(p.z * 2.0 + uTime * 0.3) * uWarp * 0.08;
      float shell;
      if (form < 0.5) {
        shell = -sdBox(p, vec3(1.6 + uWarp * 0.35, 1.15, 2.4));
      } else if (form < 1.5) {
        shell = -sdCappedCylinder(p.xzy, 2.6, 1.15 + uWarp * 0.25);
      } else if (form < 2.5) {
        shell = -sdBox(p, vec3(2.2, 1.6, 2.2));
        shell = max(shell, length(p - vec3(0.0, 0.35, 0.0)) - (1.55 + uWarp * 0.2));
      } else if (form < 3.5) {
        shell = -sdTorus(p, vec2(1.35 + uWarp * 0.2, 0.55 + uDetail * 0.15));
      } else if (form < 4.5) {
        shell = -sdOcta(p, 1.7 + uWarp * 0.25);
      } else {
        vec3 q = p;
        q.z = mod(q.z + 0.8, 1.6) - 0.8;
        float slab = sdBox(q, vec3(1.5, 0.08 + uDetail * 0.05, 0.55));
        shell = min(-sdBox(p, vec3(1.7, 1.4, 2.8)), slab);
      }
      vec3 column = p;
      column.x = abs(column.x) - 0.85;
      column.z = mod(column.z + 1.2, 2.4) - 1.2;
      float pillars = length(column.xz) - (0.12 + uDetail * 0.08);
      float doorway = sdBox(p - vec3(0.0, -0.15, 2.2), vec3(0.42, 0.7, 0.08));
      if (form > 0.5 && form < 4.5) doorway = 4.0;
      return min(shell, min(pillars, doorway));
    }

    vec3 normalAt(vec3 p) {
      float e = 0.004;
      vec2 h = vec2(e, 0.0);
      return normalize(vec3(
        mapScene(p + h.xyy) - mapScene(p - h.xyy),
        mapScene(p + h.yxy) - mapScene(p - h.yxy),
        mapScene(p + h.yyx) - mapScene(p - h.yyx)
      ));
    }

    void main() {
      vec2 uv = (vUv - 0.5) * vec2(uAspect, 1.0);
      float yaw = uPanX;
      float pitch = clamp(uPanY, -1.1, 1.1);
      vec3 rd = normalize(vec3(uv * (0.9 / max(uZoom, 0.45)), 1.0));
      rd.yz = rot(pitch) * rd.yz;
      rd.xz = rot(yaw) * rd.xz;
      vec3 ro = vec3(0.0, 0.05 * sin(uTime * 0.4), -0.4);
      ro.xz = rot(uTime * 0.05 * uSpin) * ro.xz;
      float t = 0.0;
      float hit = 0.0;
      for (int i = 0; i < 56; i++) {
        vec3 p = ro + rd * t;
        float d = mapScene(p);
        if (d < 0.004) { hit = 1.0; break; }
        t += max(d, 0.015);
        if (t > 12.0) break;
      }
      vec3 col = vec3(0.01, 0.012, 0.018);
      if (hit > 0.5) {
        vec3 p = ro + rd * t;
        vec3 n = normalAt(p);
        vec3 lamp = vec3(0.0, 0.7, 0.2 + sin(uTime * (0.3 + uSpeed * 0.2)));
        float light = clamp(dot(n, normalize(lamp - p)), 0.0, 1.0);
        float fog = exp(-t * (0.1 + uFog * 0.32));
        float hue = colorLook(p.y, p.xz, uTime * 0.08, 0.1 + p.y * 0.2 + floor(p.x * 2.0) * 0.08);
        vec3 ink = namedPalette(hue, uPalette);
        col = ink * (0.08 + light * 0.95) * fog;
        col += ink * pow(1.0 - clamp(dot(n, -rd), 0.0, 1.0), 2.0) * (uBloom + uGlow) * 0.28;
      }
      float gray = dot(col, vec3(0.299, 0.587, 0.114));
      col = mix(vec3(gray), col, uSaturation);
      col *= uBrightness;
      gl_FragColor = vec4(col, 1.0);
    }
  `,
};
