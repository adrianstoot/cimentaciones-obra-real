import * as THREE from 'three';
import { createSafetyTubeGeometry } from './SafetyRailSystem.js';

function createCorrugatedPanelGeometry({ width, height, corrugations = 92 } = {}) {
  // Six vertices per wave preserve the corrugation profile. Sampling at two
  // vertices per wave would land on zero-crossings and flatten the panel.
  const segments = Math.max(48, Math.floor(corrugations * 6));
  const positions = new Float32Array((segments + 1) * 2 * 3);
  const uvs = new Float32Array((segments + 1) * 2 * 2);
  const indices = [];
  let positionOffset = 0;
  let uvOffset = 0;
  for (let index = 0; index <= segments; index += 1) {
    const u = index / segments;
    const x = (u - 0.5) * width;
    const z = Math.sin(u * corrugations * Math.PI * 2) * 0.018;
    for (const y of [0, height]) {
      positions[positionOffset++] = x;
      positions[positionOffset++] = y;
      positions[positionOffset++] = z;
      uvs[uvOffset++] = u;
      uvs[uvOffset++] = y / height;
    }
    if (index < segments) {
      const a = index * 2;
      indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
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

function addHoardingWeathering(material) {
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = `varying vec3 vHoardingLocal;\n${shader.vertexShader}`
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n vHoardingLocal = position;');
    shader.fragmentShader = `
      varying vec3 vHoardingLocal;
      float hoardingHash(vec2 p) {
        return fract(sin(dot(floor(p), vec2(127.1, 311.7))) * 43758.5453);
      }
    ${shader.fragmentShader}`.replace(
      '#include <map_fragment>',
      `#include <map_fragment>
       float panelBand = step(.965, fract((vHoardingLocal.x + 40.0) / 2.42));
       float lowerDust = 1.0 - smoothstep(.05, 1.15, vHoardingLocal.y);
       float weather = smoothstep(.76, .98, hoardingHash(vHoardingLocal.xz * 8.0));
       diffuseColor.rgb *= mix(1.0, .68, lowerDust * .2 + weather * .12);
       diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.065, .095, .105), panelBand * .34);`,
    );
  };
  material.customProgramCacheKey = () => 'obra-real-perimeter-hoarding-v1';
  material.needsUpdate = true;
}

/** Opaque, corrugated and collision-aware perimeter hoarding for the whole site. */
export class PerimeterHoardingSystem {
  constructor({ width = 68, depth = 56.5, height = 4.15, heightSampler = () => 0 } = {}) {
    this.width = width;
    this.depth = depth;
    this.height = height;
    this.heightSampler = heightSampler;
    this.group = new THREE.Group();
    this.group.name = 'cerramiento-perimetral-opaco-pbr';
    this.geometries = new Set();
    this.materials = new Set();
    this.cameraColliders = [];
    this.build();
  }

  build() {
    const panelMaterial = new THREE.MeshPhysicalMaterial({
      name: 'panel-metalico-corrugado-verde-pbr',
      color: 0x214b47,
      roughness: 0.68,
      metalness: 0.24,
      clearcoat: 0.08,
      clearcoatRoughness: 0.62,
      envMapIntensity: 0.82,
      side: THREE.DoubleSide,
    });
    addHoardingWeathering(panelMaterial);
    const frameMaterial = new THREE.MeshPhysicalMaterial({
      name: 'bastidor-acero-galvanizado-pbr',
      color: 0x66747a,
      roughness: 0.48,
      metalness: 0.72,
      envMapIntensity: 1.05,
    });
    this.materials.add(panelMaterial);
    this.materials.add(frameMaterial);

    const frontZ = this.depth * 0.5;
    const backZ = -frontZ;
    const rightX = this.width * 0.5;
    const leftX = -rightX;
    const sections = [
      { name: 'norte', width: this.width, x: 0, z: backZ, rotationY: 0 },
      { name: 'sur', width: this.width, x: 0, z: frontZ, rotationY: Math.PI },
      { name: 'oeste', width: this.depth, x: leftX, z: 0, rotationY: Math.PI * 0.5 },
      { name: 'este', width: this.depth, x: rightX, z: 0, rotationY: -Math.PI * 0.5 },
    ];

    for (const section of sections) {
      const geometry = createCorrugatedPanelGeometry({
        width: section.width,
        height: this.height,
        corrugations: Math.max(48, Math.round(section.width * 1.55)),
      });
      this.geometries.add(geometry);
      const panel = new THREE.Mesh(geometry, panelMaterial);
      panel.name = `cerramiento-panel-${section.name}`;
      panel.position.set(section.x, this.heightSampler(section.x, section.z) + 0.08, section.z);
      panel.rotation.y = section.rotationY;
      panel.castShadow = true;
      panel.receiveShadow = true;
      this.group.add(panel);
    }

    const postGeometry = createSafetyTubeGeometry({ length: this.height + 0.28, radius: 0.055, radialSegments: 18, bevel: 0.014 });
    this.geometries.add(postGeometry);
    const postPoints = [];
    const addEdgePoints = (length, fixed, axis) => {
      const count = Math.ceil(length / 2.42);
      for (let index = 0; index <= count; index += 1) {
        const value = THREE.MathUtils.lerp(-length * 0.5, length * 0.5, index / count);
        const point = axis === 'x' ? new THREE.Vector3(value, 0, fixed) : new THREE.Vector3(fixed, 0, value);
        if (!postPoints.some((other) => other.distanceToSquared(point) < 0.01)) postPoints.push(point);
      }
    };
    addEdgePoints(this.width, backZ, 'x');
    addEdgePoints(this.width, frontZ, 'x');
    addEdgePoints(this.depth, leftX, 'z');
    addEdgePoints(this.depth, rightX, 'z');
    const posts = new THREE.InstancedMesh(postGeometry, frameMaterial, postPoints.length);
    posts.name = 'postes-cerramiento-galvanizados';
    const dummy = new THREE.Object3D();
    postPoints.forEach((point, index) => {
      const ground = this.heightSampler(point.x, point.z);
      dummy.position.set(point.x, ground + this.height * 0.5 + 0.08, point.z);
      dummy.rotation.set(-Math.PI * 0.5, 0, 0);
      dummy.updateMatrix();
      posts.setMatrixAt(index, dummy.matrix);
    });
    posts.instanceMatrix.needsUpdate = true;
    posts.castShadow = true;
    posts.receiveShadow = true;
    this.group.add(posts);

    const topRailX = createSafetyTubeGeometry({ length: this.width, radius: 0.045, radialSegments: 16, bevel: 0.012 });
    const topRailZ = createSafetyTubeGeometry({ length: this.depth, radius: 0.045, radialSegments: 16, bevel: 0.012 });
    this.geometries.add(topRailX);
    this.geometries.add(topRailZ);
    for (const z of [frontZ, backZ]) {
      const rail = new THREE.Mesh(topRailX, frameMaterial);
      rail.position.set(0, this.heightSampler(0, z) + this.height + 0.1, z);
      rail.rotation.y = Math.PI * 0.5;
      rail.castShadow = true;
      this.group.add(rail);
    }
    for (const x of [leftX, rightX]) {
      const rail = new THREE.Mesh(topRailZ, frameMaterial);
      rail.position.set(x, this.heightSampler(x, 0) + this.height + 0.1, 0);
      rail.castShadow = true;
      this.group.add(rail);
    }

    const wallThickness = 0.28;
    const minY = -0.35;
    const maxY = this.height + 0.42;
    this.cameraColliders = [
      { min: new THREE.Vector3(leftX, minY, backZ - wallThickness), max: new THREE.Vector3(rightX, maxY, backZ + wallThickness), tag: 'cerramiento-norte' },
      { min: new THREE.Vector3(leftX, minY, frontZ - wallThickness), max: new THREE.Vector3(rightX, maxY, frontZ + wallThickness), tag: 'cerramiento-sur' },
      { min: new THREE.Vector3(leftX - wallThickness, minY, backZ), max: new THREE.Vector3(leftX + wallThickness, maxY, frontZ), tag: 'cerramiento-oeste' },
      { min: new THREE.Vector3(rightX - wallThickness, minY, backZ), max: new THREE.Vector3(rightX + wallThickness, maxY, frontZ), tag: 'cerramiento-este' },
    ];
  }

  dispose() {
    this.group.removeFromParent();
    this.geometries.forEach((geometry) => geometry.dispose());
    this.materials.forEach((material) => material.dispose());
    this.group.clear();
  }
}

export default PerimeterHoardingSystem;
