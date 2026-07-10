import * as THREE from 'three';
import { applyTextureSet, disposeTextureSet, loadPBRTextureSet } from './PBRTextureSet.js';

export const DEFAULT_REBAR_TEXTURES = Object.freeze({
  color: '/assets/textures/Metal055C/Metal055C_4K-JPG_Color.jpg',
  normal: '/assets/textures/Metal055C/Metal055C_4K-JPG_NormalGL.jpg',
  roughness: '/assets/textures/Metal055C/Metal055C_4K-JPG_Roughness.jpg',
  metalness: '/assets/textures/Metal055C/Metal055C_4K-JPG_Metalness.jpg',
  displacement: '/assets/textures/Metal055C/Metal055C_4K-JPG_Displacement.jpg',
});

const DEFAULT_CAGE_POSITIONS = Object.freeze([
  Object.freeze({ x: -7.2, z: -5.1 }),
  Object.freeze({ x: 7.2, z: -5.1 }),
  Object.freeze({ x: 0, z: 0 }),
  Object.freeze({ x: -7.2, z: 5.1 }),
  Object.freeze({ x: 7.2, z: 5.1 }),
]);

const DEFAULTS = Object.freeze({
  width: 23.2,
  depth: 17.2,
  thickness: 0.72,
  baseY: 0,
  sideCover: 0.075,
  bottomCover: 0.075,
  topCover: 0.075,
  spacingX: 0.2,
  spacingZ: 0.2,
  barDiameter: 0.022,
  gridRibPitch: 0.115,
  radialSegments: 10,
  maxAxialSegments: 480,
  cages: Object.freeze({
    positions: DEFAULT_CAGE_POSITIONS,
    width: 0.72,
    depth: 0.72,
    height: 3.2,
    verticalBarDiameter: 0.025,
    tieBarDiameter: 0.012,
    tieSpacing: 0.2,
    endCover: 0.09,
    barsPerCage: 8,
  }),
});

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function ridge(phase) {
  const wrapped = phase - Math.floor(phase);
  const distance = Math.abs(wrapped - 0.5) * 2;
  return Math.pow(Math.max(0, 1 - distance * 3.35), 1.6);
}

/**
 * Creates a centered, longitudinal rebar along local Z. Two opposing helical
 * rib families deform the actual silhouette, rather than faking corrugation
 * with a flat color or a stock cylinder.
 */
export function createRibbedBarGeometry({
  length,
  diameter,
  ribPitch = 0.115,
  ribHeight = 0.115,
  radialSegments = 10,
  maxAxialSegments = 480,
} = {}) {
  if (!(length > 0) || !(diameter > 0)) throw new RangeError('Rebar length and diameter must be positive.');
  const radial = Math.max(8, Math.floor(radialSegments));
  const axial = clamp(Math.ceil((length / ribPitch) * 2.6), 12, maxAxialSegments);
  const ringCount = axial + 1;
  const radius = diameter * 0.5;
  const positions = new Float32Array(ringCount * radial * 3 + 6);
  const uvs = new Float32Array(ringCount * radial * 2 + 4);
  const indices = [];

  let p = 0;
  let uv = 0;
  for (let ring = 0; ring < ringCount; ring += 1) {
    const v = ring / axial;
    const z = (v - 0.5) * length;
    for (let side = 0; side < radial; side += 1) {
      const u = side / radial;
      const angle = u * Math.PI * 2;
      const longitudinal = (z + length * 0.5) / ribPitch;
      const ribA = ridge(longitudinal + u * 0.72);
      const ribB = ridge(longitudinal - u * 0.72 + 0.5);
      const deformedRadius = radius * (1 + Math.max(ribA, ribB) * ribHeight);
      positions[p++] = Math.cos(angle) * deformedRadius;
      positions[p++] = Math.sin(angle) * deformedRadius;
      positions[p++] = z;
      uvs[uv++] = u;
      uvs[uv++] = v;
    }
  }

  for (let ring = 0; ring < axial; ring += 1) {
    for (let side = 0; side < radial; side += 1) {
      const nextSide = (side + 1) % radial;
      const a = ring * radial + side;
      const b = ring * radial + nextSide;
      const c = (ring + 1) * radial + nextSide;
      const d = (ring + 1) * radial + side;
      indices.push(a, b, d, b, c, d);
    }
  }

  const bottomCenter = ringCount * radial;
  positions[p++] = 0;
  positions[p++] = 0;
  positions[p++] = -length * 0.5;
  uvs[uv++] = 0.5;
  uvs[uv++] = 0;
  const topCenter = bottomCenter + 1;
  positions[p++] = 0;
  positions[p++] = 0;
  positions[p++] = length * 0.5;
  uvs[uv++] = 0.5;
  uvs[uv++] = 1;
  const topOffset = axial * radial;
  for (let side = 0; side < radial; side += 1) {
    const nextSide = (side + 1) % radial;
    indices.push(bottomCenter, side, nextSide);
    indices.push(topCenter, topOffset + nextSide, topOffset + side);
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

function roundedRectPath(width, depth, radius, cornerSegments) {
  const hx = width * 0.5;
  const hz = depth * 0.5;
  const r = Math.min(radius, hx * 0.42, hz * 0.42);
  const arcs = [
    [hx - r, hz - r, 0, Math.PI * 0.5],
    [-hx + r, hz - r, Math.PI * 0.5, Math.PI],
    [-hx + r, -hz + r, Math.PI, Math.PI * 1.5],
    [hx - r, -hz + r, Math.PI * 1.5, Math.PI * 2],
  ];
  const path = [];
  for (const [cx, cz, start, end] of arcs) {
    for (let i = 0; i <= cornerSegments; i += 1) {
      const angle = THREE.MathUtils.lerp(start, end, i / cornerSegments);
      path.push(new THREE.Vector3(cx + Math.cos(angle) * r, 0, cz + Math.sin(angle) * r));
    }
  }
  return path;
}

/** Custom swept tube for closed, rounded cage ties; no Torus/Tube primitive. */
export function createStirrupGeometry({
  width,
  depth,
  diameter,
  cornerRadius = 0.085,
  cornerSegments = 7,
  radialSegments = 8,
  ribPitch = 0.07,
} = {}) {
  if (!(width > 0) || !(depth > 0) || !(diameter > 0)) {
    throw new RangeError('Stirrup width, depth and diameter must be positive.');
  }
  const path = roundedRectPath(width, depth, cornerRadius, cornerSegments);
  const radial = Math.max(6, Math.floor(radialSegments));
  const ringCount = path.length;
  const positions = new Float32Array(ringCount * radial * 3);
  const uvs = new Float32Array(ringCount * radial * 2);
  const indices = [];
  const distances = new Float32Array(ringCount + 1);
  for (let i = 1; i <= ringCount; i += 1) {
    distances[i] = distances[i - 1] + path[i % ringCount].distanceTo(path[i - 1]);
  }
  const perimeter = distances[ringCount];
  const radius = diameter * 0.5;
  const tangent = new THREE.Vector3();
  const lateral = new THREE.Vector3();
  let p = 0;
  let uv = 0;

  for (let ring = 0; ring < ringCount; ring += 1) {
    const previous = path[(ring - 1 + ringCount) % ringCount];
    const next = path[(ring + 1) % ringCount];
    tangent.subVectors(next, previous).normalize();
    lateral.set(tangent.z, 0, -tangent.x).normalize();
    const longitudinal = distances[ring] / ribPitch;
    for (let side = 0; side < radial; side += 1) {
      const u = side / radial;
      const angle = u * Math.PI * 2;
      const rib = Math.max(
        ridge(longitudinal + u * 0.62),
        ridge(longitudinal - u * 0.62 + 0.5),
      );
      const deformedRadius = radius * (1 + rib * 0.085);
      const y = Math.cos(angle) * deformedRadius;
      const sideOffset = Math.sin(angle) * deformedRadius;
      positions[p++] = path[ring].x + lateral.x * sideOffset;
      positions[p++] = y;
      positions[p++] = path[ring].z + lateral.z * sideOffset;
      uvs[uv++] = u;
      uvs[uv++] = distances[ring] / perimeter;
    }
  }

  for (let ring = 0; ring < ringCount; ring += 1) {
    const nextRing = (ring + 1) % ringCount;
    for (let side = 0; side < radial; side += 1) {
      const nextSide = (side + 1) % radial;
      const a = ring * radial + side;
      const b = ring * radial + nextSide;
      const c = nextRing * radial + nextSide;
      const d = nextRing * radial + side;
      indices.push(a, b, d, b, c, d);
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

function mergeOptions(options) {
  return {
    ...DEFAULTS,
    ...options,
    cages: {
      ...DEFAULTS.cages,
      ...(options.cages ?? {}),
      positions: options.cages?.positions ?? DEFAULTS.cages.positions,
    },
  };
}

function evenlySpacedPositions(span, cover, targetSpacing) {
  const usable = Math.max(0.001, span - cover * 2);
  const intervals = Math.max(1, Math.round(usable / targetSpacing));
  const actualSpacing = usable / intervals;
  return {
    positions: Array.from({ length: intervals + 1 }, (_, index) => -span * 0.5 + cover + index * actualSpacing),
    actualSpacing,
  };
}

function cageBarOffsets(width, depth, requestedCount) {
  const hx = width * 0.5;
  const hz = depth * 0.5;
  const points = [
    [-hx, -hz], [hx, -hz], [hx, hz], [-hx, hz],
    [0, -hz], [hx, 0], [0, hz], [-hx, 0],
  ];
  if (requestedCount <= points.length) return points.slice(0, Math.max(4, requestedCount));

  // Larger cages receive extra, uniformly distributed perimeter bars rather
  // than visually overlapping duplicated corners.
  const perimeter = 2 * (width + depth);
  const result = [];
  for (let i = 0; i < requestedCount; i += 1) {
    let d = (i / requestedCount) * perimeter;
    if (d < width) result.push([-hx + d, -hz]);
    else if ((d -= width) < depth) result.push([hx, -hz + d]);
    else if ((d -= depth) < width) result.push([hx - d, hz]);
    else result.push([-hx, hz - (d - width)]);
  }
  return result;
}

function configureInstancedMesh(mesh, matrices) {
  const helper = new THREE.Object3D();
  matrices.forEach((transform, index) => {
    helper.position.copy(transform.position);
    helper.rotation.set(transform.rotation.x, transform.rotation.y, transform.rotation.z);
    helper.scale.set(1, 1, 1);
    helper.updateMatrix();
    mesh.setMatrixAt(index, helper.matrix);
  });
  mesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);
  mesh.instanceMatrix.needsUpdate = true;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  if (mesh.computeBoundingBox) mesh.computeBoundingBox();
  if (mesh.computeBoundingSphere) mesh.computeBoundingSphere();
  return mesh;
}

export class RebarSystem {
  constructor(options = {}) {
    this.options = mergeOptions(options);
    this.group = new THREE.Group();
    this.group.name = 'reinforcement-system';
    this.group.visible = false;
    this.layers = {};
    this.meshes = [];
    this.geometries = new Set();
    this.material = null;
    this.textureSet = null;
    this.disposed = false;
    this.inspection = null;
    this.spacingDefect = null;
    this.inspectionOverlayVisible = false;
    this.ready = this.initialize();
  }

  createGridLayer(name, elevation, invertOrthogonalOrder = false) {
    const {
      width, depth, sideCover, spacingX, spacingZ, barDiameter,
      radialSegments, maxAxialSegments, gridRibPitch,
    } = this.options;
    const radius = barDiameter * 0.5;
    const orthogonalOffset = this.options.orthogonalOffset ?? barDiameter * 1.06;
    const zDistribution = evenlySpacedPositions(depth, sideCover + radius, spacingX);
    const xDistribution = evenlySpacedPositions(width, sideCover + radius, spacingZ);
    const lengthX = width - sideCover * 2;
    const lengthZ = depth - sideCover * 2;
    const geometryX = createRibbedBarGeometry({
      length: lengthX,
      diameter: barDiameter,
      ribPitch: gridRibPitch,
      radialSegments,
      maxAxialSegments,
    });
    const geometryZ = createRibbedBarGeometry({
      length: lengthZ,
      diameter: barDiameter,
      ribPitch: gridRibPitch,
      radialSegments,
      maxAxialSegments,
    });
    this.geometries.add(geometryX);
    this.geometries.add(geometryZ);

    const xElevation = elevation + (invertOrthogonalOrder ? orthogonalOffset : 0);
    const zElevation = elevation + (invertOrthogonalOrder ? 0 : orthogonalOffset);
    const transformsX = zDistribution.positions.map((z) => ({
      position: new THREE.Vector3(0, xElevation, z),
      rotation: new THREE.Euler(0, Math.PI * 0.5, 0),
    }));
    const transformsZ = xDistribution.positions.map((x) => ({
      position: new THREE.Vector3(x, zElevation, 0),
      rotation: new THREE.Euler(0, 0, 0),
    }));
    const barsX = configureInstancedMesh(
      new THREE.InstancedMesh(geometryX, this.material, transformsX.length),
      transformsX,
    );
    const barsZ = configureInstancedMesh(
      new THREE.InstancedMesh(geometryZ, this.material, transformsZ.length),
      transformsZ,
    );
    barsX.name = `${name}-bars-x`;
    barsZ.name = `${name}-bars-z`;
    barsX.userData.inspectionType = 'reinforcement-grid';
    barsZ.userData.inspectionType = 'reinforcement-grid';
    barsX.userData.layer = name;
    barsZ.userData.layer = name;

    const layer = new THREE.Group();
    layer.name = `${name}-reinforcement-grid`;
    layer.add(barsX, barsZ);
    this.group.add(layer);
    this.layers[name] = layer;
    this.meshes.push(barsX, barsZ);
    return {
      actualSpacingX: zDistribution.actualSpacing,
      actualSpacingZ: xDistribution.actualSpacing,
      countX: transformsX.length,
      countZ: transformsZ.length,
    };
  }

  createCages() {
    const cage = this.options.cages;
    // `cage.width/depth` describe the outside of the assembled cage. The tie
    // centerline sits half a tie diameter inward and longitudinal bars sit
    // tangent to its inner face, as they do in a fabricated reinforcement cage.
    const tieCenterWidth = cage.width - cage.tieBarDiameter;
    const tieCenterDepth = cage.depth - cage.tieBarDiameter;
    const longitudinalWidth = tieCenterWidth - cage.tieBarDiameter - cage.verticalBarDiameter;
    const longitudinalDepth = tieCenterDepth - cage.tieBarDiameter - cage.verticalBarDiameter;
    const offsets = cageBarOffsets(longitudinalWidth, longitudinalDepth, cage.barsPerCage);
    const verticalGeometry = createRibbedBarGeometry({
      length: cage.height,
      diameter: cage.verticalBarDiameter,
      ribPitch: this.options.gridRibPitch,
      radialSegments: this.options.radialSegments,
      maxAxialSegments: this.options.maxAxialSegments,
    });
    const stirrupGeometry = createStirrupGeometry({
      width: tieCenterWidth,
      depth: tieCenterDepth,
      diameter: cage.tieBarDiameter,
      radialSegments: Math.max(7, this.options.radialSegments - 2),
    });
    this.geometries.add(verticalGeometry);
    this.geometries.add(stirrupGeometry);

    const verticalTransforms = [];
    for (const position of cage.positions) {
      for (const [offsetX, offsetZ] of offsets) {
        verticalTransforms.push({
          position: new THREE.Vector3(
            position.x + offsetX,
            this.options.baseY + cage.height * 0.5,
            position.z + offsetZ,
          ),
          rotation: new THREE.Euler(-Math.PI * 0.5, 0, 0),
        });
      }
    }

    const verticalBars = configureInstancedMesh(
      new THREE.InstancedMesh(verticalGeometry, this.material, verticalTransforms.length),
      verticalTransforms,
    );
    verticalBars.name = 'column-starter-bars';
    verticalBars.userData.inspectionType = 'starter-cage';

    const usableTieHeight = Math.max(0.01, cage.height - cage.endCover * 2);
    const tieIntervals = Math.max(1, Math.floor(usableTieHeight / cage.tieSpacing));
    const actualTieSpacing = usableTieHeight / tieIntervals;
    const tieTransforms = [];
    for (const position of cage.positions) {
      for (let index = 0; index <= tieIntervals; index += 1) {
        tieTransforms.push({
          position: new THREE.Vector3(
            position.x,
            this.options.baseY + cage.endCover + index * actualTieSpacing,
            position.z,
          ),
          rotation: new THREE.Euler(0, 0, 0),
        });
      }
    }
    const ties = configureInstancedMesh(
      new THREE.InstancedMesh(stirrupGeometry, this.material, tieTransforms.length),
      tieTransforms,
    );
    ties.name = 'column-cage-ties';
    ties.userData.inspectionType = 'starter-cage-ties';

    const cagesLayer = new THREE.Group();
    cagesLayer.name = 'starter-cages';
    cagesLayer.add(verticalBars, ties);
    this.layers.cages = cagesLayer;
    this.group.add(cagesLayer);
    this.meshes.push(verticalBars, ties);
    return {
      cageCount: cage.positions.length,
      verticalBarsPerCage: offsets.length,
      tieCountPerCage: tieIntervals + 1,
      actualTieSpacing,
    };
  }

  async initialize() {
    const textureSet = await loadPBRTextureSet({
      sources: this.options.textures ?? DEFAULT_REBAR_TEXTURES,
      loader: this.options.textureLoader ?? new THREE.TextureLoader(),
      repeat: this.options.textureRepeat ?? [1.25, 18],
      anisotropy: this.options.anisotropy ?? 8,
    });
    if (this.disposed) {
      disposeTextureSet(textureSet);
      return this;
    }

    this.textureSet = textureSet;
    this.material = applyTextureSet(new THREE.MeshPhysicalMaterial({
      name: 'corrugated-reinforcing-steel-pbr',
      color: this.options.color ?? 0x596063,
      metalness: this.options.metalness ?? 0.78,
      roughness: this.options.roughness ?? 0.56,
      normalScale: new THREE.Vector2(
        this.options.normalScale ?? 0.52,
        this.options.normalScale ?? 0.52,
      ),
      displacementScale: this.options.displacementScale ?? 0.00035,
      displacementBias: this.options.displacementBias ?? -0.000175,
      clearcoat: 0.018,
      clearcoatRoughness: 0.54,
    }), textureSet);

    const radius = this.options.barDiameter * 0.5;
    const lowerElevation = this.options.baseY + this.options.bottomCover + radius;
    const upperElevation = this.options.baseY + this.options.thickness - this.options.topCover - radius
      - (this.options.orthogonalOffset ?? this.options.barDiameter * 1.06);
    const lower = this.createGridLayer('lower', lowerElevation, false);
    const upper = this.createGridLayer('upper', upperElevation, true);
    const cages = this.createCages();
    const defectMesh = this.layers.lower?.getObjectByName('lower-bars-x');
    if (defectMesh?.isInstancedMesh) {
      const index = Math.min(defectMesh.count - 2, Math.max(1, Math.floor(defectMesh.count * 0.57)));
      const originalMatrix = new THREE.Matrix4();
      defectMesh.getMatrixAt(index, originalMatrix);
      this.spacingDefect = {
        mesh: defectMesh,
        index,
        originalMatrix,
        offset: this.options.spacingDefectOffset ?? 0.08,
        active: false,
      };
    }
    this.inspection = Object.freeze({
      nominalSpacingX: this.options.spacingX,
      nominalSpacingZ: this.options.spacingZ,
      actualSpacingX: lower.actualSpacingX,
      actualSpacingZ: lower.actualSpacingZ,
      lowerBarCount: lower.countX + lower.countZ,
      upperBarCount: upper.countX + upper.countZ,
      barDiameter: this.options.barDiameter,
      sideCover: this.options.sideCover,
      bottomCover: this.options.bottomCover,
      topCover: this.options.topCover,
      spacingDefectOffset: this.spacingDefect?.offset ?? 0,
      ...cages,
    });
    this.setSpacingDefect(Boolean(this.options.spacingDefect));
    this.setConstructionStage(this.options.stage ?? 'complete');
    this.group.visible = true;
    return this;
  }

  setLayerVisibility(layerName, visible) {
    const layer = this.layers[layerName];
    if (!layer) throw new RangeError(`Unknown reinforcement layer: ${layerName}`);
    layer.visible = Boolean(visible);
  }

  setConstructionStage(stage) {
    const visibility = {
      lower: [true, false, true],
      upper: [true, true, true],
      complete: [true, true, true],
      hidden: [false, false, false],
    }[stage];
    if (!visibility) throw new RangeError(`Unknown reinforcement stage: ${stage}`);
    if (this.layers.lower) this.layers.lower.visible = visibility[0];
    if (this.layers.upper) this.layers.upper.visible = visibility[1];
    if (this.layers.cages) this.layers.cages.visible = visibility[2];
    this.stage = stage;
  }

  getInspectionData() {
    return this.inspection ? { ...this.inspection, stage: this.stage } : null;
  }

  getInspectableMeshes() {
    return this.meshes.slice();
  }

  setSpacingDefect(active) {
    if (!this.spacingDefect) return;
    const next = Boolean(active);
    if (this.spacingDefect.active === next) return;
    const matrix = this.spacingDefect.originalMatrix.clone();
    if (next) matrix.elements[14] += this.spacingDefect.offset;
    this.spacingDefect.mesh.setMatrixAt(this.spacingDefect.index, matrix);
    this.spacingDefect.mesh.instanceMatrix.needsUpdate = true;
    this.spacingDefect.mesh.computeBoundingSphere();
    this.spacingDefect.active = next;
    if (!next) this.setInspectionOverlay(false);
  }

  setInspectionOverlay(visible) {
    if (!this.spacingDefect) return;
    const next = Boolean(visible && this.spacingDefect.active);
    if (this.inspectionOverlayVisible === next) return;
    const { mesh, index } = this.spacingDefect;
    const neutral = new THREE.Color(1, 1, 1);
    const warning = new THREE.Color(3.2, 0.12, 0.025);
    for (let instance = 0; instance < mesh.count; instance += 1) {
      mesh.setColorAt(instance, instance === index && next ? warning : neutral);
    }
    mesh.instanceColor.needsUpdate = true;
    this.inspectionOverlayVisible = next;
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.group.removeFromParent();
    this.group.clear();
    for (const geometry of this.geometries) geometry.dispose();
    this.material?.dispose();
    disposeTextureSet(this.textureSet);
    this.geometries.clear();
    this.meshes = [];
    this.layers = {};
    this.material = null;
    this.textureSet = null;
    this.inspection = null;
    this.spacingDefect = null;
  }
}

export default RebarSystem;
