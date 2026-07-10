import * as THREE from 'three';
import { createBeveledSlabGeometry } from './TerrainSystem.js';
import { createRibbedBarGeometry, createStirrupGeometry } from './RebarSystem.js';

/** Dense, physically scaled stock bundle built from the production rebar mesh. */
export class RebarStockpile {
  constructor({ material, position = new THREE.Vector3(), rotationY = 0, heightSampler = () => 0 } = {}) {
    this.group = new THREE.Group();
    this.group.name = 'rebar-stockpile-commercial-detail';
    this.geometries = new Set();
    this.materials = new Set();
    this.barMaterial = material.clone();
    this.barMaterial.name = 'stock-rebar-rust-pbr';
    this.barMaterial.color.set(0x8a7166);
    this.barMaterial.roughness = 0.64;
    this.strapMaterial = material.clone();
    this.strapMaterial.name = 'galvanized-bundle-straps-pbr';
    this.strapMaterial.map = null;
    this.strapMaterial.color.set(0x8f999d);
    this.strapMaterial.metalness = 0.84;
    this.strapMaterial.roughness = 0.36;
    this.supportMaterial = material.clone();
    this.supportMaterial.map = null;
    this.supportMaterial.color.set(0x3a3532);
    this.supportMaterial.metalness = 0.7;
    this.supportMaterial.roughness = 0.62;
    this.materials.add(this.barMaterial);
    this.materials.add(this.strapMaterial);
    this.materials.add(this.supportMaterial);
    this.build();
    this.group.position.set(position.x, heightSampler(position.x, position.z) + 0.08, position.z);
    this.group.rotation.y = rotationY;
  }

  build() {
    const length = 8.6;
    const diameter = 0.028;
    const barGeometry = createRibbedBarGeometry({
      length,
      diameter,
      ribPitch: 0.125,
      radialSegments: 12,
      maxAxialSegments: 520,
    });
    this.geometries.add(barGeometry);
    const columns = 10;
    const rows = 5;
    const bars = new THREE.InstancedMesh(barGeometry, this.barMaterial, columns * rows);
    bars.name = 'strapped-stock-reinforcing-bars';
    bars.castShadow = true;
    bars.receiveShadow = true;
    const dummy = new THREE.Object3D();
    let index = 0;
    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        const stagger = row % 2 ? 0.026 : 0;
        dummy.position.set(
          (column - (columns - 1) * 0.5) * 0.055 + stagger,
          0.12 + row * 0.052,
          ((column * 13 + row * 7) % 5 - 2) * 0.009,
        );
        dummy.rotation.set(0, 0, ((column + row) % 3 - 1) * 0.004);
        dummy.updateMatrix();
        bars.setMatrixAt(index++, dummy.matrix);
      }
    }
    bars.instanceMatrix.needsUpdate = true;
    this.group.add(bars);

    const strapGeometry = createStirrupGeometry({
      width: 0.72,
      depth: 0.43,
      diameter: 0.014,
      cornerRadius: 0.09,
      cornerSegments: 8,
      radialSegments: 10,
      ribPitch: 0.16,
    });
    this.geometries.add(strapGeometry);
    for (const z of [-2.65, 0, 2.65]) {
      const strap = new THREE.Mesh(strapGeometry, this.strapMaterial);
      strap.name = 'tensioned-galvanized-bundle-strap';
      strap.position.set(0, 0.25, z);
      strap.rotation.x = Math.PI * 0.5;
      strap.castShadow = true;
      this.group.add(strap);
    }

    const supportGeometry = createBeveledSlabGeometry({
      width: 0.88,
      depth: 0.18,
      height: 0.12,
      bevel: 0.025,
      cornerSegments: 5,
    });
    this.geometries.add(supportGeometry);
    for (const z of [-2.75, 2.75]) {
      const support = new THREE.Mesh(supportGeometry, this.supportMaterial);
      support.name = 'steel-stockpile-sleeper';
      support.position.set(0, 0.04, z);
      support.castShadow = true;
      support.receiveShadow = true;
      this.group.add(support);
    }
  }

  dispose() {
    this.group.removeFromParent();
    this.geometries.forEach((geometry) => geometry.dispose());
    this.materials.forEach((material) => material.dispose());
    this.group.clear();
  }
}

export default RebarStockpile;
