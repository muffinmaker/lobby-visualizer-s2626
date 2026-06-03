import { SHADERS, SHADER_IDS } from './index.js';
import { SHADER_UNIFORM_TEMPLATES } from '../uniformSpecs.js';

/**
 * Load additional shader modules from src/shaders/custom/*.js
 * Each module should export: { id, label, uniforms, vertex, fragment }
 */
export async function loadCustomShaders() {
  const modules = import.meta.glob('./custom/*.js');
  const loaded = [];

  for (const path of Object.keys(modules).sort()) {
    try {
      const mod = await modules[path]();
      const shader = mod.default ?? mod.shader;
      if (!shader?.vertex || !shader?.fragment || !shader?.id) {
        console.warn(`Skipping ${path}: missing id, vertex, or fragment`);
        continue;
      }

      SHADERS[shader.id] = {
        label: shader.label ?? shader.id,
        uniforms: {
          ...(SHADER_UNIFORM_TEMPLATES[shader.id] ?? {}),
          ...(shader.uniforms ?? {}),
        },
        vertex: shader.vertex,
        fragment: shader.fragment,
      };

      if (!SHADER_IDS.includes(shader.id)) {
        SHADER_IDS.push(shader.id);
      }

      loaded.push(shader.id);
    } catch (err) {
      console.error(`Failed to load shader ${path}`, err);
    }
  }

  return loaded;
}

export function registerShader(shader) {
  if (!shader?.id || !shader.vertex || !shader.fragment) {
    throw new Error('Shader requires id, vertex, and fragment');
  }

  SHADERS[shader.id] = {
    label: shader.label ?? shader.id,
    uniforms: {
      ...(SHADER_UNIFORM_TEMPLATES[shader.id] ?? {}),
      ...(shader.uniforms ?? {}),
    },
    vertex: shader.vertex,
    fragment: shader.fragment,
  };

  if (!SHADER_IDS.includes(shader.id)) {
    SHADER_IDS.push(shader.id);
  }

  return shader.id;
}
