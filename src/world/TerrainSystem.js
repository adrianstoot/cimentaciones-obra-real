import * as THREE from 'three';
import { applyTextureSet, disposeTextureSet, loadPBRTextureSet } from './PBRTextureSet.js';

export const DEFAULT_TERRAIN_TEXTURES = Object.freeze({
  ground: Object.freeze({
    color: '/assets/textures/Ground094A/Ground094A_4K-JPG_Color.jpg',
    normal: '/assets/textures/Ground094A/Ground094A_4K-JPG_NormalGL.jpg',
    roughness: '/assets/textures/Ground094A/Ground094A_4K-JPG_Roughness.jpg',
    ao: '/assets/textures/Ground094A/Ground094A_4K-JPG_AmbientOcclusion.jpg',
    displacement: '/assets/textures/Ground094A/Ground094A_4K-JPG_Displacement.jpg',
  }),
  concrete: Object.freeze({
    color: '/assets/textures/Concrete044C/Concrete044C_4K-JPG_Color.jpg',
    normal: '/assets/textures/Concrete044C/Concrete044C_4K-JPG_NormalGL.jpg',
    roughness: '/assets/textures/Concrete044C/Concrete044C_4K-JPG_Roughness.jpg',
    ao: '/assets/textures/Concrete044C/Concrete044C_4K-JPG_AmbientOcclusion.jpg',
    displacement: '/assets/textures/Concrete044C/Concrete044C_4K-JPG_Displacement.jpg',
  }),
});

const DEFAULTS = Object.freeze({
  siteWidth: 72,
  siteDepth: 58,
  widthSegments: 168,
  depthSegments: 136,
  excavation: Object.freeze({
    x: 0,
    z: -2,
    bottomWidth: 25,
    bottomDepth: 19,
    depth: 2.65,
    slopeWidth: 3.35,
  }),
  blinding: Object.freeze({ width: 26.2, depth: 20.2, height: 0.16, bevel: 0.035 }),
  slab: Object.freeze({ width: 23.6, depth: 17.6, height: 0.55, bevel: 0.055 }),
});

function clamp01(value) {
  return Math.min(1, Math.max(0, value));
}

function smoothstep01(value) {
  const x = clamp01(value);
  return x * x * (3 - 2 * x);
}

function hash2(x, z, seed) {
  let h = Math.imul(x | 0, 0x1f123bb5) ^ Math.imul(z | 0, 0x5f356495) ^ seed;
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d);
  h = Math.imul(h ^ (h >>> 12), 0x297a2d39);
  return ((h ^ (h >>> 15)) >>> 0) / 4294967295;
}

function valueNoise(x, z, seed) {
  const ix = Math.floor(x);
  const iz = Math.floor(z);
  const fx = smoothstep01(x - ix);
  const fz = smoothstep01(z - iz);
  const a = hash2(ix, iz, seed);
  const b = hash2(ix + 1, iz, seed);
  const c = hash2(ix, iz + 1, seed);
  const d = hash2(ix + 1, iz + 1, seed);
  const ab = THREE.MathUtils.lerp(a, b, fx);
  const cd = THREE.MathUtils.lerp(c, d, fx);
  return THREE.MathUtils.lerp(ab, cd, fz) * 2 - 1;
}

function fbm(x, z, seed) {
  let frequency = 0.18;
  let amplitude = 0.62;
  let result = 0;
  let total = 0;
  for (let octave = 0; octave < 4; octave += 1) {
    result += valueNoise(x * frequency, z * frequency, seed + octave * 811) * amplitude;
    total += amplitude;
    frequency *= 2.07;
    amplitude *= 0.48;
  }
  return result / total;
}

function roundedRectRing(width, depth, radius, cornerSegments) {
  const hx = width * 0.5;
  const hz = depth * 0.5;
  const r = Math.max(0.001, Math.min(radius, hx - 0.001, hz - 0.001));
  const centers = [
    [hx - r, hz - r, 0, Math.PI * 0.5],
    [-hx + r, hz - r, Math.PI * 0.5, Math.PI],
    [-hx + r, -hz + r, Math.PI, Math.PI * 1.5],
    [hx - r, -hz + r, Math.PI * 1.5, Math.PI * 2],
  ];
  const points = [];
  for (const [cx, cz, start, end] of centers) {
    for (let i = 0; i <= cornerSegments; i += 1) {
      const angle = THREE.MathUtils.lerp(start, end, i / cornerSegments);
      points.push([cx + Math.cos(angle) * r, cz + Math.sin(angle) * r]);
    }
  }
  return points;
}

/** Custom rounded/chamfered slab; it deliberately uses no primitive geometry. */
export function createBeveledSlabGeometry({ width, depth, height, bevel, cornerSegments = 6 }) {
  const corners = Math.max(2, Math.floor(cornerSegments));
  const halfHeight = height * 0.5;
  const safeBevel = Math.min(bevel, halfHeight * 0.8, width * 0.08, depth * 0.08);
  const cornerRadius = Math.max(safeBevel * 2.2, 0.065);
  const layers = [
    { y: -halfHeight, inset: safeBevel },
    { y: -halfHeight + safeBevel, inset: 0 },
    { y: halfHeight - safeBevel, inset: 0 },
    { y: halfHeight, inset: safeBevel },
  ];
  const rings = layers.map(({ inset }) => roundedRectRing(
    width - inset * 2,
    depth - inset * 2,
    Math.max(0.025, cornerRadius - inset),
    corners,
  ));
  const ringSize = rings[0].length;
  const positions = [];
  const uvs = [];
  const indices = [];

  for (let layer = 0; layer < layers.length; layer += 1) {
    for (let i = 0; i < ringSize; i += 1) {
      const [x, z] = rings[layer][i];
      positions.push(x, layers[layer].y, z);
      uvs.push(x / width + 0.5, z / depth + 0.5);
    }
  }

  for (let layer = 0; layer < layers.length - 1; layer += 1) {
    for (let i = 0; i < ringSize; i += 1) {
      const next = (i + 1) % ringSize;
      const a = layer * ringSize + i;
      const b = layer * ringSize + next;
      const c = (layer + 1) * ringSize + next;
      const d = (layer + 1) * ringSize + i;
      indices.push(a, b, d, b, c, d);
    }
  }

  const bottomCenter = positions.length / 3;
  positions.push(0, -halfHeight, 0);
  uvs.push(0.5, 0.5);
  const topCenter = positions.length / 3;
  positions.push(0, halfHeight, 0);
  uvs.push(0.5, 0.5);
  const topOffset = (layers.length - 1) * ringSize;
  for (let i = 0; i < ringSize; i += 1) {
    const next = (i + 1) % ringSize;
    indices.push(bottomCenter, next, i);
    indices.push(topCenter, topOffset + i, topOffset + next);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

function mergeOptions(options) {
  return {
    ...DEFAULTS,
    ...options,
    excavation: { ...DEFAULTS.excavation, ...(options.excavation ?? {}) },
    blinding: { ...DEFAULTS.blinding, ...(options.blinding ?? {}) },
    slab: { ...DEFAULTS.slab, ...(options.slab ?? {}) },
  };
}

export class TerrainSystem {
  constructor(options = {}) {
    this.options = mergeOptions(options);
    this.group = new THREE.Group();
    this.group.name = 'terrain-system';
    this.group.visible = false;
    this.meshes = {};
    this.materials = {};
    this.textureSets = {};
    this.geometries = new Set();
    this.disposed = false;
    this.concretePhase = options.concretePhase ?? 'blinding';
    this.ready = this.initialize();
  }

  excavationDistance(x, z) {
    const excavation = this.options.excavation;
    const dx = Math.max(Math.abs(x - excavation.x) - excavation.bottomWidth * 0.5, 0);
    const dz = Math.max(Math.abs(z - excavation.z) - excavation.bottomDepth * 0.5, 0);
    return Math.hypot(dx, dz);
  }

  getTerrainHeightLocal(x, z) {
    const excavation = this.options.excavation;
    const slopeT = smoothstep01(this.excavationDistance(x, z) / excavation.slopeWidth);
    const macroHeight = -excavation.depth * (1 - slopeT);
    // The prepared formation remains level. Irregularity fades in through the
    // talus and reaches full amplitude on the trafficked site surface.
    const irregularity = fbm(x, z, this.options.noiseSeed ?? 104729) * 0.085 * slopeT;
    return macroHeight + irregularity;
  }

  createTerrainGeometry() {
    const {
      siteWidth, siteDepth, widthSegments, depthSegments,
    } = this.options;
    const verticesX = widthSegments + 1;
    const verticesZ = depthSegments + 1;
    const positions = new Float32Array(verticesX * verticesZ * 3);
    const uvs = new Float32Array(verticesX * verticesZ * 2);
    const indices = [];

    let p = 0;
    let uv = 0;
    for (let iz = 0; iz < verticesZ; iz += 1) {
      const v = iz / depthSegments;
      const z = (v - 0.5) * siteDepth;
      for (let ix = 0; ix < verticesX; ix += 1) {
        const u = ix / widthSegments;
        const x = (u - 0.5) * siteWidth;
        positions[p++] = x;
        positions[p++] = this.getTerrainHeightLocal(x, z);
        positions[p++] = z;
        uvs[uv++] = u;
        uvs[uv++] = v;
      }
    }

    for (let iz = 0; iz < depthSegments; iz += 1) {
      for (let ix = 0; ix < widthSegments; ix += 1) {
        const a = iz * verticesX + ix;
        const b = a + 1;
        const c = a + verticesX + 1;
        const d = a + verticesX;
        indices.push(a, d, b, b, d, c);
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    return geometry;
  }

  createTerrainSkirtGeometry() {
    const { siteWidth, siteDepth } = this.options;
    const hx = siteWidth * 0.5;
    const hz = siteDepth * 0.5;
    const perSide = 48;
    const points = [];
    for (let i = 0; i < perSide; i += 1) points.push([-hx + (siteWidth * i) / perSide, -hz]);
    for (let i = 0; i < perSide; i += 1) points.push([hx, -hz + (siteDepth * i) / perSide]);
    for (let i = 0; i < perSide; i += 1) points.push([hx - (siteWidth * i) / perSide, hz]);
    for (let i = 0; i < perSide; i += 1) points.push([-hx, hz - (siteDepth * i) / perSide]);

    const positions = [];
    const uvs = [];
    const indices = [];
    const skirtDepth = 1.25;
    for (let i = 0; i < points.length; i += 1) {
      const [x, z] = points[i];
      const y = this.getTerrainHeightLocal(x, z);
      positions.push(x, y, z, x, y - skirtDepth, z);
      uvs.push(i / points.length, 1, i / points.length, 0);
    }
    for (let i = 0; i < points.length; i += 1) {
      const next = (i + 1) % points.length;
      const a = i * 2;
      const b = next * 2;
      indices.push(a, a + 1, b, b, a + 1, b + 1);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    return geometry;
  }

  async initialize() {
    const textureLoader = this.options.textureLoader ?? new THREE.TextureLoader();
    const anisotropy = this.options.anisotropy ?? 8;
    const sources = {
      ground: this.options.textures?.ground ?? DEFAULT_TERRAIN_TEXTURES.ground,
      concrete: this.options.textures?.concrete ?? DEFAULT_TERRAIN_TEXTURES.concrete,
    };

    const results = await Promise.allSettled([
      loadPBRTextureSet({
        sources: sources.ground,
        loader: textureLoader,
        repeat: this.options.groundTextureRepeat ?? [13, 10],
        anisotropy,
      }),
      loadPBRTextureSet({
        sources: sources.concrete,
        loader: textureLoader,
        repeat: this.options.concreteTextureRepeat ?? [5.5, 4.2],
        anisotropy,
      }),
    ]);
    const failed = results.find((result) => result.status === 'rejected');
    if (failed) {
      for (const result of results) {
        if (result.status === 'fulfilled') disposeTextureSet(result.value);
      }
      throw failed.reason;
    }
    const [groundMaps, concreteMaps] = results.map((result) => result.value);

    if (this.disposed) {
      disposeTextureSet(groundMaps);
      disposeTextureSet(concreteMaps);
      return this;
    }

    this.textureSets.ground = groundMaps;
    this.textureSets.concrete = concreteMaps;
    this.materials.ground = applyTextureSet(new THREE.MeshPhysicalMaterial({
      name: 'site-soil-pbr',
      color: this.options.groundTint ?? 0x9a7b61,
      roughness: 0.93,
      metalness: 0,
      normalScale: new THREE.Vector2(
        this.options.groundNormalScale ?? 0.64,
        this.options.groundNormalScale ?? 0.64,
      ),
      displacementScale: this.options.groundDisplacementScale ?? 0.018,
      displacementBias: this.options.groundDisplacementBias ?? -0.009,
      clearcoat: 0,
      clearcoatRoughness: 0.58,
    }), groundMaps);
    this.materials.ground.onBeforeCompile = (shader) => {
      shader.vertexShader = `varying vec3 vCorTerrainPosition;\n${shader.vertexShader}`
        .replace('#include <begin_vertex>', '#include <begin_vertex>\n vCorTerrainPosition = position;');
      shader.fragmentShader = `varying vec3 vCorTerrainPosition;\n${shader.fragmentShader}`
        .replace(
          '#include <map_fragment>',
          `#include <map_fragment>
           float corMacroA = 0.5 + 0.5 * sin(vCorTerrainPosition.x * 0.19 + sin(vCorTerrainPosition.z * 0.12) * 1.6);
           float corMacroB = 0.5 + 0.5 * sin(vCorTerrainPosition.z * 0.23 - vCorTerrainPosition.x * 0.075);
           float corPreparedSurface = smoothstep(-1.35, -0.08, vCorTerrainPosition.y);
           float corMacroTone = mix(0.84, 1.08, corMacroA * 0.62 + corMacroB * 0.38);
           diffuseColor.rgb *= mix(0.96, corMacroTone, corPreparedSurface);`,
        );
    };
    this.materials.ground.customProgramCacheKey = () => 'obra-real-ground-macro-v2';
    this.materials.concrete = applyTextureSet(new THREE.MeshPhysicalMaterial({
      name: 'structural-concrete-pbr',
      color: this.options.concreteTint ?? 0xd4d0c8,
      roughness: 0.84,
      metalness: 0,
      normalScale: new THREE.Vector2(
        this.options.concreteNormalScale ?? 0.62,
        this.options.concreteNormalScale ?? 0.62,
      ),
      displacementScale: this.options.concreteDisplacementScale ?? 0.004,
      displacementBias: this.options.concreteDisplacementBias ?? -0.002,
      clearcoat: 0.015,
      clearcoatRoughness: 0.75,
    }), concreteMaps);

    const terrainGeometry = this.createTerrainGeometry();
    const skirtGeometry = this.createTerrainSkirtGeometry();
    const blindingGeometry = createBeveledSlabGeometry(this.options.blinding);
    const slabGeometry = createBeveledSlabGeometry(this.options.slab);
    [terrainGeometry, skirtGeometry, blindingGeometry, slabGeometry].forEach((geometry) => this.geometries.add(geometry));

    const ground = new THREE.Mesh(terrainGeometry, this.materials.ground);
    ground.name = 'excavated-site-surface';
    ground.receiveShadow = true;
    ground.castShadow = false;

    const skirt = new THREE.Mesh(skirtGeometry, this.materials.ground);
    skirt.name = 'site-perimeter-skirt';
    skirt.receiveShadow = true;

    const excavation = this.options.excavation;
    const blinding = new THREE.Mesh(blindingGeometry, this.materials.concrete);
    blinding.name = 'concrete-blinding-layer';
    blinding.position.set(
      excavation.x,
      -excavation.depth + this.options.blinding.height * 0.5 + 0.012,
      excavation.z,
    );
    blinding.castShadow = true;
    blinding.receiveShadow = true;

    const slab = new THREE.Mesh(slabGeometry, this.materials.concrete);
    slab.name = 'structural-foundation-slab';
    slab.position.set(
      excavation.x,
      blinding.position.y + this.options.blinding.height * 0.5 + this.options.slab.height * 0.5 + 0.008,
      excavation.z,
    );
    slab.castShadow = true;
    slab.receiveShadow = true;

    this.meshes = { ground, skirt, blinding, slab };
    this.group.add(ground, skirt, blinding, slab);
    this.setConcretePhase(this.concretePhase);
    this.group.visible = true;
    return this;
  }

  setConcretePhase(phase) {
    if (!['none', 'blinding', 'foundation', 'both'].includes(phase)) {
      throw new RangeError(`Unknown concrete phase: ${phase}`);
    }
    this.concretePhase = phase;
    if (this.meshes.blinding) this.meshes.blinding.visible = phase !== 'none';
    if (this.meshes.slab) this.meshes.slab.visible = phase === 'foundation' || phase === 'both';
  }

  setWetness(value) {
    const wetness = clamp01(value);
    if (this.materials.ground) {
      this.materials.ground.roughness = THREE.MathUtils.lerp(0.93, 0.46, wetness);
      this.materials.ground.clearcoat = THREE.MathUtils.lerp(0, 0.42, wetness);
      this.materials.ground.clearcoatRoughness = THREE.MathUtils.lerp(0.58, 0.24, wetness);
    }
    if (this.materials.concrete) {
      this.materials.concrete.roughness = THREE.MathUtils.lerp(0.84, 0.52, wetness);
      this.materials.concrete.clearcoat = THREE.MathUtils.lerp(0.015, 0.18, wetness);
    }
  }

  getSurfaceHeightAt(worldX, worldZ, { includeConcrete = true } = {}) {
    this.group.updateWorldMatrix(true, false);
    const local = this.group.worldToLocal(new THREE.Vector3(worldX, 0, worldZ));
    let localY = this.getTerrainHeightLocal(local.x, local.z);
    const excavation = this.options.excavation;

    if (includeConcrete && this.meshes.blinding?.visible) {
      const dx = Math.abs(local.x - excavation.x);
      const dz = Math.abs(local.z - excavation.z);
      if (dx <= this.options.blinding.width * 0.5 && dz <= this.options.blinding.depth * 0.5) {
        localY = Math.max(localY, this.meshes.blinding.position.y + this.options.blinding.height * 0.5);
      }
    }
    if (includeConcrete && this.meshes.slab?.visible) {
      const dx = Math.abs(local.x - excavation.x);
      const dz = Math.abs(local.z - excavation.z);
      if (dx <= this.options.slab.width * 0.5 && dz <= this.options.slab.depth * 0.5) {
        localY = Math.max(localY, this.meshes.slab.position.y + this.options.slab.height * 0.5);
      }
    }

    return this.group.localToWorld(new THREE.Vector3(local.x, localY, local.z)).y;
  }

  getCollisionProfile() {
    const { excavation, blinding, slab, siteWidth, siteDepth } = this.options;
    return {
      site: { width: siteWidth, depth: siteDepth },
      excavation: { ...excavation },
      blinding: { ...blinding, visible: Boolean(this.meshes.blinding?.visible) },
      slab: { ...slab, visible: Boolean(this.meshes.slab?.visible) },
      sampleHeight: (worldX, worldZ, options) => this.getSurfaceHeightAt(worldX, worldZ, options),
    };
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.group.removeFromParent();
    for (const geometry of this.geometries) geometry.dispose();
    for (const material of Object.values(this.materials)) material.dispose();
    for (const textureSet of Object.values(this.textureSets)) disposeTextureSet(textureSet);
    this.geometries.clear();
    this.materials = {};
    this.textureSets = {};
    this.meshes = {};
    this.group.clear();
  }
}

export default TerrainSystem;
