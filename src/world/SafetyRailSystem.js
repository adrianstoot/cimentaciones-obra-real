import * as THREE from 'three';
import { createBeveledSlabGeometry } from './TerrainSystem.js';

/** Custom powder-coated tube with chamfered caps. No stock primitive is used. */
export function createSafetyTubeGeometry({ length, radius = 0.024, radialSegments = 16, bevel = 0.012 }) {
  const radial = Math.max(12, Math.floor(radialSegments));
  const half = length * 0.5;
  const capBevel = Math.min(bevel, length * 0.08);
  const rings = [
    { z: -half, r: radius * 0.82 },
    { z: -half + capBevel, r: radius },
    { z: half - capBevel, r: radius },
    { z: half, r: radius * 0.82 },
  ];
  const positions = [];
  const uvs = [];
  const indices = [];
  for (let ring = 0; ring < rings.length; ring += 1) {
    for (let side = 0; side < radial; side += 1) {
      const u = side / radial;
      const angle = u * Math.PI * 2;
      positions.push(Math.cos(angle) * rings[ring].r, Math.sin(angle) * rings[ring].r, rings[ring].z);
      uvs.push(u, ring / (rings.length - 1));
    }
  }
  for (let ring = 0; ring < rings.length - 1; ring += 1) {
    for (let side = 0; side < radial; side += 1) {
      const next = (side + 1) % radial;
      const a = ring * radial + side;
      const b = ring * radial + next;
      const c = (ring + 1) * radial + next;
      const d = (ring + 1) * radial + side;
      indices.push(a, b, d, b, c, d);
    }
  }
  const startCenter = positions.length / 3;
  positions.push(0, 0, -half);
  uvs.push(0.5, 0);
  const endCenter = positions.length / 3;
  positions.push(0, 0, half);
  uvs.push(0.5, 1);
  const lastOffset = (rings.length - 1) * radial;
  for (let side = 0; side < radial; side += 1) {
    const next = (side + 1) % radial;
    indices.push(startCenter, next, side);
    indices.push(endCenter, lastOffset + side, lastOffset + next);
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

function configureMesh(mesh) {
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function addIndustrialWear(material) {
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = `varying vec3 vSafetyLocal;\n${shader.vertexShader}`
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n vSafetyLocal = position;');
    shader.fragmentShader = `
      varying vec3 vSafetyLocal;
      float safetyWear(vec3 p) {
        float coarse = fract(sin(dot(floor(p * 10.0), vec3(17.1, 41.7, 93.4))) * 31871.17);
        float fine = fract(sin(dot(floor(p * 47.0), vec3(61.3, 13.9, 27.5))) * 11817.31);
        return coarse * .72 + fine * .28;
      }
    ${shader.fragmentShader}`.replace(
      '#include <map_fragment>',
      `#include <map_fragment>
       float edgeWear = smoothstep(.82, .98, safetyWear(vSafetyLocal));
       diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(.43, .34, .26), edgeWear * .3);`,
    );
  };
  material.customProgramCacheKey = () => 'obra-real-safety-rail-wear-v1';
  material.needsUpdate = true;
}

/** Detailed collective protection around the excavation rim. */
export class SafetyRailSystem {
  constructor({ heightSampler, sourceMaterial, excavation = {} } = {}) {
    this.heightSampler = heightSampler ?? (() => 0);
    this.options = {
      xHalf: excavation.xHalf ?? 15.65,
      nearZ: excavation.nearZ ?? 10.95,
      farZ: excavation.farZ ?? -14.95,
      gapHalf: excavation.gapHalf ?? 2.6,
      postSpacing: excavation.postSpacing ?? 1.95,
    };
    this.group = new THREE.Group();
    this.group.name = 'collective-protection-high-detail';
    this.geometries = new Set();
    this.materials = new Set();
    this.railMaterial = (sourceMaterial?.clone?.() ?? new THREE.MeshPhysicalMaterial()).clone();
    this.railMaterial.name = 'powder-coated-safety-orange-pbr';
    this.railMaterial.map = null;
    this.railMaterial.color.set(0xd36a18);
    this.railMaterial.metalness = 0.28;
    this.railMaterial.roughness = 0.52;
    this.railMaterial.clearcoat = 0.18;
    this.railMaterial.clearcoatRoughness = 0.46;
    this.railMaterial.envMapIntensity = 0.95;
    addIndustrialWear(this.railMaterial);
    this.baseMaterial = this.railMaterial.clone();
    this.baseMaterial.color.set(0xb94612);
    this.baseMaterial.roughness = 0.62;
    this.materials.add(this.railMaterial);
    this.materials.add(this.baseMaterial);
    this.build();
  }

  build() {
    const { xHalf, nearZ, farZ, gapHalf, postSpacing } = this.options;
    const sections = [
      { axis: 'x', from: -xHalf, to: xHalf, fixed: farZ },
      { axis: 'z', from: farZ, to: nearZ, fixed: -xHalf },
      { axis: 'z', from: farZ, to: nearZ, fixed: xHalf },
      { axis: 'x', from: -xHalf, to: -gapHalf, fixed: nearZ },
      { axis: 'x', from: gapHalf, to: xHalf, fixed: nearZ },
    ];
    const postPoints = [];
    for (const section of sections) {
      const length = section.to - section.from;
      const center = (section.from + section.to) * 0.5;
      const worldCenter = section.axis === 'x'
        ? new THREE.Vector3(center, 0, section.fixed)
        : new THREE.Vector3(section.fixed, 0, center);
      const ground = this.heightSampler(worldCenter.x, worldCenter.z);
      for (const railHeight of [0.58, 1.12]) {
        const geometry = createSafetyTubeGeometry({ length, radius: 0.027, radialSegments: 16 });
        this.geometries.add(geometry);
        const rail = configureMesh(new THREE.Mesh(geometry, this.railMaterial));
        rail.name = `safety-horizontal-${section.axis}-${railHeight}`;
        rail.position.set(worldCenter.x, ground + railHeight, worldCenter.z);
        rail.rotation.y = section.axis === 'x' ? Math.PI * 0.5 : 0;
        this.group.add(rail);
      }
      const toeGeometry = createBeveledSlabGeometry({
        width: length,
        depth: 0.045,
        height: 0.16,
        bevel: 0.012,
        cornerSegments: 4,
      });
      this.geometries.add(toeGeometry);
      const toe = configureMesh(new THREE.Mesh(toeGeometry, this.railMaterial));
      toe.name = `safety-toe-board-${section.axis}`;
      toe.position.set(worldCenter.x, ground + 0.1, worldCenter.z);
      toe.rotation.y = section.axis === 'x' ? 0 : Math.PI * 0.5;
      this.group.add(toe);

      const count = Math.max(2, Math.ceil(length / postSpacing));
      for (let index = 0; index <= count; index += 1) {
        const value = THREE.MathUtils.lerp(section.from, section.to, index / count);
        const point = section.axis === 'x'
          ? new THREE.Vector3(value, this.heightSampler(value, section.fixed), section.fixed)
          : new THREE.Vector3(section.fixed, this.heightSampler(section.fixed, value), value);
        if (!postPoints.some((other) => other.distanceToSquared(point) < 0.02)) postPoints.push(point);
      }
    }

    const postGeometry = createSafetyTubeGeometry({ length: 1.28, radius: 0.032, radialSegments: 18, bevel: 0.014 });
    this.collisionPoints = postPoints.map((point) => point.clone());
    const clampGeometry = createSafetyTubeGeometry({ length: 0.075, radius: 0.047, radialSegments: 18, bevel: 0.008 });
    const baseGeometry = createBeveledSlabGeometry({ width: 0.18, depth: 0.18, height: 0.028, bevel: 0.009, cornerSegments: 4 });
    [postGeometry, clampGeometry, baseGeometry].forEach((geometry) => this.geometries.add(geometry));
    const posts = configureMesh(new THREE.InstancedMesh(postGeometry, this.railMaterial, postPoints.length));
    const clamps = configureMesh(new THREE.InstancedMesh(clampGeometry, this.baseMaterial, postPoints.length * 2));
    const bases = configureMesh(new THREE.InstancedMesh(baseGeometry, this.baseMaterial, postPoints.length));
    posts.name = 'safety-posts-with-chamfered-caps';
    clamps.name = 'safety-rail-collars';
    bases.name = 'safety-post-baseplates';
    const dummy = new THREE.Object3D();
    let clampIndex = 0;
    postPoints.forEach((point, index) => {
      dummy.position.set(point.x, point.y + 0.64, point.z);
      dummy.rotation.set(-Math.PI * 0.5, 0, 0);
      dummy.updateMatrix();
      posts.setMatrixAt(index, dummy.matrix);
      for (const height of [0.58, 1.12]) {
        dummy.position.set(point.x, point.y + height, point.z);
        dummy.rotation.set(-Math.PI * 0.5, 0, 0);
        dummy.updateMatrix();
        clamps.setMatrixAt(clampIndex++, dummy.matrix);
      }
      dummy.position.set(point.x, point.y + 0.014, point.z);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      bases.setMatrixAt(index, dummy.matrix);
    });
    posts.instanceMatrix.needsUpdate = true;
    clamps.instanceMatrix.needsUpdate = true;
    bases.instanceMatrix.needsUpdate = true;
    this.group.add(posts, clamps, bases);
  }

  dispose() {
    this.group.removeFromParent();
    this.geometries.forEach((geometry) => geometry.dispose());
    this.materials.forEach((material) => material.dispose());
    this.group.clear();
  }
}

export default SafetyRailSystem;
