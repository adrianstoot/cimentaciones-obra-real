import * as THREE from 'three';

function canvasTexture(canvas, { color = true, anisotropy = 8 } = {}) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  texture.anisotropy = anisotropy;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.needsUpdate = true;
  return texture;
}

function createTrackCanvas(seed = 731) {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const context = canvas.getContext('2d');
  let value = seed >>> 0;
  const random = () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };

  context.clearRect(0, 0, canvas.width, canvas.height);
  const lanes = [276, 748];
  for (const lane of lanes) {
    const wash = context.createLinearGradient(lane - 125, 0, lane + 125, 0);
    wash.addColorStop(0, 'rgba(48,35,25,0)');
    wash.addColorStop(.3, 'rgba(42,31,23,.22)');
    wash.addColorStop(.5, 'rgba(27,21,17,.38)');
    wash.addColorStop(.7, 'rgba(42,31,23,.22)');
    wash.addColorStop(1, 'rgba(48,35,25,0)');
    context.fillStyle = wash;
    context.fillRect(lane - 130, 0, 260, 1024);

    for (let y = -30; y < 1060; y += 42) {
      context.save();
      context.translate(lane + (random() - .5) * 11, y + (random() - .5) * 5);
      context.rotate((random() - .5) * .13);
      context.fillStyle = `rgba(22,18,15,${(.52 + random() * .24).toFixed(3)})`;
      context.beginPath();
      context.moveTo(-76, -10);
      context.lineTo(-20, -15);
      context.lineTo(72, -7);
      context.lineTo(76, 10);
      context.lineTo(20, 15);
      context.lineTo(-72, 7);
      context.closePath();
      context.fill();
      context.fillStyle = 'rgba(95,71,49,.16)';
      context.fillRect(-55, -3, 110, 6);
      context.restore();
    }
  }

  for (let i = 0; i < 850; i += 1) {
    const lane = lanes[i % 2];
    const angle = random() * Math.PI * 2;
    const radius = Math.pow(random(), 1.8) * 155;
    const x = lane + Math.cos(angle) * radius;
    const y = random() * 1024;
    const size = .7 + random() * 2.2;
    context.fillStyle = `rgba(29,23,18,${(.05 + random() * .16).toFixed(3)})`;
    context.fillRect(x, y, size, size);
  }
  return canvas;
}

function createSurveyCanvas() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const context = canvas.getContext('2d');
  context.clearRect(0, 0, 512, 512);
  context.translate(256, 256);
  context.strokeStyle = 'rgba(255,111,22,.94)';
  context.lineWidth = 17;
  context.lineCap = 'round';
  context.beginPath();
  context.moveTo(-170, 0);
  context.lineTo(170, 0);
  context.moveTo(0, -170);
  context.lineTo(0, 170);
  context.stroke();
  context.strokeStyle = 'rgba(247,241,222,.92)';
  context.lineWidth = 6;
  context.beginPath();
  context.arc(0, 0, 66, 0, Math.PI * 2);
  context.stroke();
  context.fillStyle = 'rgba(247,241,222,.96)';
  context.font = '900 58px Arial';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText('Z-04', 0, 0);
  return canvas;
}

function ribbonGeometry({ start, end, width, sampleHeight, segments = 40, curve = 0 }) {
  const positions = new Float32Array((segments + 1) * 2 * 3);
  const uvs = new Float32Array((segments + 1) * 2 * 2);
  const indices = [];
  const direction = new THREE.Vector2(end.x - start.x, end.z - start.z).normalize();
  const side = new THREE.Vector2(-direction.y, direction.x);
  let p = 0;
  let uv = 0;
  for (let index = 0; index <= segments; index += 1) {
    const t = index / segments;
    const bend = Math.sin(t * Math.PI) * curve;
    const centerX = THREE.MathUtils.lerp(start.x, end.x, t) + side.x * bend;
    const centerZ = THREE.MathUtils.lerp(start.z, end.z, t) + side.y * bend;
    for (const sign of [-1, 1]) {
      const x = centerX + side.x * width * .5 * sign;
      const z = centerZ + side.y * width * .5 * sign;
      positions[p++] = x;
      positions[p++] = sampleHeight(x, z) + .018;
      positions[p++] = z;
      uvs[uv++] = sign < 0 ? 0 : 1;
      uvs[uv++] = t;
    }
    if (index < segments) {
      const a = index * 2;
      const b = a + 1;
      const c = a + 2;
      const d = a + 3;
      indices.push(a, c, b, b, c, d);
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

function groundQuadGeometry({ x, z, size, rotation, sampleHeight }) {
  const half = size * .5;
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  const corners = [[-half, -half], [half, -half], [half, half], [-half, half]];
  const positions = [];
  for (const [localX, localZ] of corners) {
    const worldX = x + localX * cos - localZ * sin;
    const worldZ = z + localX * sin + localZ * cos;
    positions.push(worldX, sampleHeight(worldX, worldZ) + .024, worldZ);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2));
  geometry.setIndex([0, 2, 1, 0, 3, 2]);
  geometry.computeVertexNormals();
  return geometry;
}

function puddleGeometry({ x, z, radiusX, radiusZ, rotation, sampleHeight, seed, points = 24 }) {
  let value = seed >>> 0;
  const random = () => {
    value = (value * 1103515245 + 12345) >>> 0;
    return value / 4294967296;
  };
  const positions = [x, sampleHeight(x, z) + .028, z];
  const uvs = [.5, .5];
  const indices = [];
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  for (let index = 0; index < points; index += 1) {
    const angle = index / points * Math.PI * 2;
    const noise = .78 + random() * .28;
    const localX = Math.cos(angle) * radiusX * noise;
    const localZ = Math.sin(angle) * radiusZ * noise;
    const worldX = x + localX * cos - localZ * sin;
    const worldZ = z + localX * sin + localZ * cos;
    positions.push(worldX, sampleHeight(worldX, worldZ) + .03, worldZ);
    uvs.push(.5 + Math.cos(angle) * .5, .5 + Math.sin(angle) * .5);
  }
  for (let index = 0; index < points; index += 1) indices.push(0, index + 1, (index + 1) % points + 1);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

export class SurfaceDetailSystem {
  constructor({ heightSampler, anisotropy = 8 } = {}) {
    if (typeof heightSampler !== 'function') throw new TypeError('SurfaceDetailSystem requires a heightSampler.');
    this.heightSampler = heightSampler;
    this.group = new THREE.Group();
    this.group.name = 'site-surface-production-details';
    this.geometries = [];
    this.materials = [];
    this.textures = [];
    this.puddles = [];

    const trackTexture = canvasTexture(createTrackCanvas(), { anisotropy });
    const surveyTexture = canvasTexture(createSurveyCanvas(), { anisotropy });
    this.textures.push(trackTexture, surveyTexture);
    const trackMaterial = new THREE.MeshPhysicalMaterial({
      name: 'compacted-tyre-track-decal',
      map: trackTexture,
      transparent: true,
      opacity: .68,
      alphaTest: .025,
      depthWrite: false,
      roughness: .94,
      metalness: 0,
      bumpMap: trackTexture,
      bumpScale: .018,
      polygonOffset: true,
      polygonOffsetFactor: -2,
    });
    const surveyMaterial = new THREE.MeshPhysicalMaterial({
      name: 'survey-control-spray-decal',
      map: surveyTexture,
      transparent: true,
      alphaTest: .08,
      depthWrite: false,
      roughness: .8,
      metalness: 0,
      polygonOffset: true,
      polygonOffsetFactor: -3,
    });
    const puddleMaterial = new THREE.MeshPhysicalMaterial({
      name: 'rain-puddle-physical-surface',
      color: 0x6b7f87,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      roughness: .11,
      metalness: 0,
      clearcoat: 1,
      clearcoatRoughness: .05,
      envMapIntensity: 1.55,
      polygonOffset: true,
      polygonOffsetFactor: -4,
    });
    this.materials.push(trackMaterial, surveyMaterial, puddleMaterial);

    const routes = [
      { start: { x: 22.4, z: 23.5 }, end: { x: 19.1, z: -20.5 }, width: 3.5, curve: -.85 },
      { start: { x: -23.4, z: 20.5 }, end: { x: -19.1, z: -18.5 }, width: 3.15, curve: .65 },
      { start: { x: -8.4, z: 25.5 }, end: { x: -6.6, z: 9.1 }, width: 3.1, curve: .42 },
    ];
    routes.forEach((route, index) => {
      const geometry = ribbonGeometry({ ...route, sampleHeight: this.heightSampler });
      this.geometries.push(geometry);
      const mesh = new THREE.Mesh(geometry, trackMaterial);
      mesh.name = `compacted-vehicle-route-${index + 1}`;
      mesh.receiveShadow = true;
      mesh.renderOrder = 2;
      this.group.add(mesh);
    });

    const surveyPoints = [
      [-12.25, 8.05, .22], [12.25, 8.05, -.18], [-12.3, -12.05, .1], [12.3, -12.05, -.15], [0, 8.1, 0],
    ];
    surveyPoints.forEach(([x, z, rotation], index) => {
      const geometry = groundQuadGeometry({ x, z, size: index === 4 ? 1.25 : .82, rotation, sampleHeight: this.heightSampler });
      this.geometries.push(geometry);
      const mark = new THREE.Mesh(geometry, surveyMaterial);
      mark.name = `survey-control-mark-${index + 1}`;
      mark.renderOrder = 3;
      this.group.add(mark);
    });

    const puddleDefinitions = [
      [20.8, 16.2, 1.35, .5, -.18], [19.8, 10.4, .92, .36, .1], [20.3, -3.7, 1.1, .42, -.12],
      [-21.4, 14.1, 1.15, .38, .15], [-20.2, 3.4, .78, .34, -.08], [-20.7, -12.3, 1.25, .46, .16],
    ];
    puddleDefinitions.forEach(([x, z, radiusX, radiusZ, rotation], index) => {
      const geometry = puddleGeometry({ x, z, radiusX, radiusZ, rotation, sampleHeight: this.heightSampler, seed: 1049 + index * 47 });
      this.geometries.push(geometry);
      const puddle = new THREE.Mesh(geometry, puddleMaterial.clone());
      puddle.material.name = `${puddleMaterial.name}-${index + 1}`;
      puddle.name = `weather-puddle-${index + 1}`;
      puddle.visible = false;
      puddle.renderOrder = 4;
      this.materials.push(puddle.material);
      this.puddles.push(puddle);
      this.group.add(puddle);
    });
    puddleMaterial.dispose();
    this.materials = this.materials.filter((material) => material !== puddleMaterial);
  }

  setWeather(mode) {
    const opacity = mode === 'rain' ? .42 : mode === 'night' ? .2 : mode === 'overcast' ? .08 : 0;
    this.puddles.forEach((puddle, index) => {
      puddle.visible = opacity > 0;
      puddle.material.opacity = Math.max(0, opacity - index * .012);
      puddle.material.roughness = mode === 'rain' ? .08 : .18;
    });
  }

  dispose() {
    this.group.removeFromParent();
    this.geometries.forEach((geometry) => geometry.dispose());
    this.materials.forEach((material) => material.dispose());
    this.textures.forEach((texture) => texture.dispose());
    this.geometries.length = 0;
    this.materials.length = 0;
    this.textures.length = 0;
    this.puddles.length = 0;
  }
}

export default SurfaceDetailSystem;
