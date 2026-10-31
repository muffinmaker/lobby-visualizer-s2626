import { PALETTE_FN, PALETTE_UNIFORMS } from '../../paletteGlsl.js';

export default {
  id: 'starspin',
  label: 'Star Spin',
  points: true,
  uniforms: {},
  vertex: /* glsl */ `
    uniform float uTime;
    uniform float uScale;
    uniform float uOrbitCount;
    uniform float uTwist;
    uniform float uPulse;
    uniform float uPointSize;
    uniform float uPointRotation;
    uniform float uSpin;
    uniform float uWobble;
    uniform float uNoise;
    uniform float uArms;
    uniform float uMotion;
    uniform float uAspect;
    uniform float uZoom;
    uniform float uPanX;
    uniform float uPanY;
    uniform float uPalette;
    uniform float uHueShift;
    uniform float uColorSpeed;
    uniform float uColorSpread;
    uniform float uObjectScale;
    ${PALETTE_UNIFORMS}
    ${PALETTE_FN}

    attribute float aIndex;
    attribute float aPhase;
    varying vec3 vColor;
    varying float vPenAngle;

    void main() {
      float orbit = aIndex;
      float orbitCount = max(uOrbitCount, 1.0);
      if (orbit >= orbitCount) {
        gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
        gl_PointSize = 0.0;
        return;
      }
      float t = uTime + aPhase * 0.2;
      float lane = (orbit + 0.5) / orbitCount;
      float motion = floor(uMotion + 0.5);
      float arms = max(uArms, 3.0);
      float spin = 0.35 + uSpin;
      float R = uScale * (0.35 + 0.5 * lane) * clamp(uPointSize, 0.2, 3.2);
      float a = t * (1.1 + lane * 0.4) * spin;
      float b = t * (1.6 + uTwist * 0.35) + orbit;
      vec2 pos;
      if (motion < 0.5) {
        float r = R * (0.28 + 0.08 * lane);
        pos = vec2(R * cos(a) + r * cos(-b * 2.0), R * sin(a) + r * sin(-b * 2.0));
      } else if (motion < 1.5) {
        float petal = 0.62 + 0.38 * cos(a * arms);
        pos = vec2(cos(a), sin(a)) * R * petal;
      } else if (motion < 2.5) {
        pos = vec2(sin(a * 2.0), sin(b * 3.0)) * R;
      } else if (motion < 3.5) {
        pos = vec2(sin(a), sin(a) * cos(a)) * R;
      } else if (motion < 4.5) {
        float turn = a * (1.2 + uTwist * 0.15);
        float rad = R * (0.25 + fract(lane + t * 0.04) * 0.75);
        pos = vec2(cos(turn), sin(turn)) * rad;
      } else {
        float rose = cos(arms * a);
        pos = vec2(cos(a), sin(a)) * R * rose;
      }
      pos += vec2(cos(b), sin(b * 0.7)) * uWobble * 0.35 * R;
      float n = sin(orbit * 12.9898 + t * 3.1) * sin(orbit * 78.233 + a * 2.0);
      pos += vec2(n, sin(n * 6.2 + t)) * uNoise * 0.22 * R;
      pos *= 1.0 + uPulse * 0.12 * sin(t * 1.6 + orbit);
      pos.x /= max(uAspect, 0.75);
      pos /= clamp(max(pow(max(abs(uZoom), 0.02), 0.65) * 0.25, 0.09), 0.09, 2.4);
      pos -= vec2(uPanX, uPanY);
      float hue = colorLook(lane, pos, t * uColorSpeed, lane * 1.4 + t * uColorSpeed * 0.4 + uHueShift);
      vColor = mix(vec3(0.55), namedPalette(hue, uPalette), uColorSpread);
      vPenAngle = a + uPointRotation;
      vec4 mv = modelViewMatrix * vec4(pos, 0.0, 1.0);
      gl_Position = projectionMatrix * mv;
      gl_PointSize = clamp(36.0 * max(uObjectScale, 0.05) * (0.8 + lane * 0.3), 8.0, 420.0);
    }
  `,
  fragment: /* glsl */ `
    uniform float uBrightness;
    uniform float uSaturation;
    uniform float uBloom;
    uniform float uPointShape;
    uniform float uTransparency;
    varying vec3 vColor;
    varying float vPenAngle;

    float star(vec2 p) {
      float an = 6.28318 / 5.0;
      float bn = mod(atan(p.y, p.x), an) - an * 0.5;
      vec2 q = length(p) * vec2(cos(bn), abs(sin(bn)));
      return length(q - vec2(0.28, 0.0)) * sign(q.x - 0.12);
    }

    void main() {
      vec2 uv = gl_PointCoord - 0.5;
      float c = cos(vPenAngle);
      float s = sin(vPenAngle);
      uv = mat2(c, -s, s, c) * uv;
      float id = floor(uPointShape + 0.5);
      float d = id > 3.5 && id < 4.5 ? star(uv) : length(uv) - 0.32;
      if (id > 0.5 && id < 1.5) d = max(abs(uv.x), abs(uv.y)) - 0.28;
      float stamp = 1.0 - smoothstep(0.0, 0.04, d);
      if (stamp < 0.02) discard;
      vec3 col = vColor;
      float gray = dot(col, vec3(0.299, 0.587, 0.114));
      col = mix(vec3(gray), col, uSaturation) * uBrightness;
      col += vColor * stamp * uBloom * 0.3;
      gl_FragColor = vec4(col, clamp(stamp * uTransparency, 0.0, 1.0));
    }
  `,
};
