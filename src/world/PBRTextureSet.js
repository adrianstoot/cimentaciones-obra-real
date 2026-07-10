import * as THREE from 'three';
import { assetPath } from '../assets/assetPath.js';

const MAP_KEYS = Object.freeze({
  color: { materialKey: 'map', color: true },
  normal: { materialKey: 'normalMap', color: false },
  roughness: { materialKey: 'roughnessMap', color: false },
  ao: { materialKey: 'aoMap', color: false },
  metalness: { materialKey: 'metalnessMap', color: false },
  displacement: { materialKey: 'displacementMap', color: false },
});

function isTexture(value) {
  return Boolean(value && value.isTexture);
}

function configureTexture(texture, { color, repeat, anisotropy }) {
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeat[0], repeat[1]);
  texture.anisotropy = anisotropy;
  texture.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  texture.needsUpdate = true;
  return texture;
}

async function acquireTexture(source, loader) {
  if (isTexture(source)) {
    // Each material owns its sampler state. Cloning avoids changing a texture
    // shared by the asset manager while retaining the already decoded image.
    return source.clone();
  }

  if (typeof source !== 'string' || source.length === 0) {
    throw new TypeError('Every configured PBR map must be a THREE.Texture or a non-empty URL.');
  }

  return loader.loadAsync(assetPath(source));
}

/**
 * Loads and configures a complete PBR texture set without showing a flat
 * placeholder while files are in flight.
 *
 * Source keys: color, normal, roughness, ao, metalness and displacement.
 * Values may be URLs or preloaded THREE.Texture instances from an asset
 * manager. The returned textures are owned by the caller and must be disposed.
 */
export async function loadPBRTextureSet({
  sources,
  loader = new THREE.TextureLoader(),
  repeat = [1, 1],
  anisotropy = 8,
  required = ['color', 'normal', 'roughness'],
} = {}) {
  if (!sources || typeof sources !== 'object') {
    throw new TypeError('loadPBRTextureSet requires a sources object.');
  }

  for (const key of required) {
    if (!sources[key]) throw new Error(`Required PBR map is missing: ${key}`);
  }

  const entries = Object.entries(MAP_KEYS).filter(([key]) => sources[key]);
  const results = await Promise.allSettled(entries.map(async ([key, descriptor]) => {
    const texture = await acquireTexture(sources[key], loader);
    configureTexture(texture, {
      color: descriptor.color,
      repeat,
      anisotropy,
    });
    return [descriptor.materialKey, texture];
  }));
  const failed = results.find((result) => result.status === 'rejected');
  if (failed) {
    for (const result of results) {
      if (result.status === 'fulfilled') result.value[1].dispose();
    }
    throw failed.reason;
  }
  const acquired = results.map((result) => result.value);

  const maps = Object.fromEntries(acquired);

  // AO data in ambientCG sets is authored in the same UV channel as albedo.
  // Explicit channel zero also works on recent Three.js releases without a
  // redundant uv1/uv2 vertex buffer.
  if (maps.aoMap && 'channel' in maps.aoMap) maps.aoMap.channel = 0;

  return maps;
}

export function disposeTextureSet(maps) {
  const disposed = new Set();
  for (const texture of Object.values(maps ?? {})) {
    if (!isTexture(texture) || disposed.has(texture)) continue;
    texture.dispose();
    disposed.add(texture);
  }
}

export function applyTextureSet(material, maps) {
  for (const [key, texture] of Object.entries(maps)) material[key] = texture;
  material.needsUpdate = true;
  return material;
}
