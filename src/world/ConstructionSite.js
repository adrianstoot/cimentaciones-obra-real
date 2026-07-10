import * as THREE from 'three';
import { TerrainSystem } from './TerrainSystem.js';
import { RebarSystem } from './RebarSystem.js';
import { MACHINERY, PROPS } from '../assets/assetManifest.js';
import { WorkerNPC } from '../characters/WorkerNPC.js';
import { SafetyRailSystem } from './SafetyRailSystem.js';
import { RebarStockpile } from './RebarStockpile.js';
import { SurfaceDetailSystem } from './SurfaceDetailSystem.js';
import { PerimeterHoardingSystem } from './PerimeterHoardingSystem.js';

const DEFAULT_LAYOUT = Object.freeze([
  { key: 'generator', asset: 'portable_generator', position: [-9.2, 0, -15.6], rotationY: 1.15 },
  { key: 'toolChest', asset: 'metal_tool_chest', position: [-7.5, 0, -15.1], rotationY: 0.9 },
  { key: 'shelves', asset: 'steel_frame_shelves_01', position: [-13.2, 0, -15.8], rotationY: 1.55, targetSize: 3.2, axis: 'y' },
  { key: 'crate', asset: 'wooden_crate_01', position: [8.3, 0, -14.7], rotationY: -0.38, targetSize: 1.1 },
  { key: 'cementA', asset: 'cement_bag', position: [6.8, 0, -15.2], rotationY: 0.2 },
  { key: 'cementB', asset: 'cement_bag', position: [7.2, 0, -15.1], rotationY: -0.12 },
  { key: 'barrierA', asset: 'concrete_road_barrier_02', position: [-16.2, 0, 12.6], rotationY: 0 },
  { key: 'barrierB', asset: 'concrete_road_barrier_02', position: [-12.3, 0, 12.6], rotationY: 0 },
  { key: 'barrierC', asset: 'concrete_road_barrier_02', position: [15.6, 0, 13.1], rotationY: Math.PI },
  { key: 'barrelControl', asset: 'barrel_03', position: [12.6, 0, -14.6], rotationY: 0.35, targetSize: 0.95, axis: 'y' },
  { key: 'handlingCart', asset: 'hand_truck', position: [14.4, 0, 16.2], rotationY: -0.48, targetSize: 1.55, axis: 'y' },
  { key: 'siteToolCart', asset: 'tool_cart', position: [-14.8, 0, 18.2], rotationY: 1.05, targetSize: 1.45, axis: 'y' },
  { key: 'cableRun', asset: 'modular_electric_cables', position: [18.2, 0, 18.4], rotationY: -0.35, targetSize: 3.4 },
  { key: 'accessLadder', asset: 'ladder_sectioned_01', position: [-12.5, 0, 5.8], rotationY: 1.5, targetSize: 3.1, axis: 'y' },
  { key: 'fuelCan', asset: 'metal_jerrycan', position: [-10.2, 0, -15.1], rotationY: -0.25, targetSize: 0.52, axis: 'y' },
  { key: 'secondaryCrate', asset: 'wooden_crate_01', position: [-11.6, 0, -14.4], rotationY: 0.4, targetSize: 1.15 },
  { key: 'barrelWashA', asset: 'barrel_03', position: [18.7, 0, -8.8], rotationY: -0.18, targetSize: 0.92, axis: 'y' },
  { key: 'barrelWashB', asset: 'barrel_03', position: [19.8, 0, -8.6], rotationY: 0.31, targetSize: 0.92, axis: 'y' },
  { key: 'generatorEast', asset: 'portable_generator', position: [20.8, 0, 7.7], rotationY: -1.25 },
  { key: 'steelPipesEast', asset: 'modular_industrial_pipes_01', position: [20.4, 0, -7.8], rotationY: Math.PI * 0.5, targetSize: 3.1 },
  { key: 'siteCableNorth', asset: 'modular_electric_cables', position: [-20.5, 0, 5.9], rotationY: 0.12, targetSize: 3.8 },
  { key: 'toolChestEast', asset: 'metal_tool_chest', position: [20.2, 0, 9.1], rotationY: -1.46 },
  { key: 'materialsShelfEast', asset: 'steel_frame_shelves_01', position: [23.2, 0, 1.2], rotationY: -Math.PI * 0.5, targetSize: 3.25, axis: 'y' },
  { key: 'cementC', asset: 'cement_bag', position: [8.0, 0, -15.4], rotationY: 0.32 },
  { key: 'cementD', asset: 'cement_bag', position: [8.4, 0, -15.2], rotationY: -0.22 },
  { key: 'accessBarrierD', asset: 'concrete_road_barrier_02', position: [20.6, 0, 15.8], rotationY: Math.PI * 0.5 },
  { key: 'accessBarrierE', asset: 'concrete_road_barrier_02', position: [20.6, 0, 19.7], rotationY: Math.PI * 0.5 },
  { key: 'materialCrateEast', asset: 'wooden_crate_01', position: [22.1, 0, -4.8], rotationY: -0.27, targetSize: 1.2 },
  { key: 'handTruckNorth', asset: 'hand_truck', position: [-19.5, 0, -12.8], rotationY: 0.65, targetSize: 1.6, axis: 'y' },
  { key: 'ladderNorth', asset: 'wooden_ladder', position: [24.6, 0, -10.6], rotationY: -0.12, targetSize: 3.6, axis: 'y' },
]);

/**
 * Production construction-site slice. All visible props are imported GLB or
 * custom authored BufferGeometry systems; collision proxies are numeric only.
 */
export class ConstructionSite {
  constructor(scene, assetManager, options = {}) {
    this.scene = scene;
    this.assets = assetManager;
    this.options = options;
    this.group = new THREE.Group();
    this.group.name = 'obra-real-production-site';
    this.scene.add(this.group);
    this.props = new Map();
    this.npcs = [];
    this.obstacles = [];
    this.interactions = [];
    this.cameraColliders = [];
    this.safetyRail = null;
    this.hoarding = null;
    this.surfaceDetails = null;
    this.stockpiles = [];
    this.terrain = new TerrainSystem({
      anisotropy: Math.min(assetManager.maxAnisotropy, 16),
      concretePhase: 'blinding',
      noiseSeed: 83017,
      excavation: { bottomWidth: 19.2, bottomDepth: 14.4, depth: 1.55, slopeWidth: 1.8 },
      blinding: { width: 20.2, depth: 15.2, height: 0.16, bevel: 0.035 },
      slab: { width: 18.8, depth: 13.8, height: 0.55, bevel: 0.055 },
      groundTint: 0x80644c,
      groundTextureRepeat: [18, 14],
      groundNormalScale: 0.16,
      groundDisplacementScale: 0.0025,
      concreteTint: 0xe2dbcf,
    });
    this.rebar = new RebarSystem({
      anisotropy: Math.min(assetManager.maxAnisotropy, 16),
      baseY: -1.355,
      stage: 'lower',
      width: 18.4,
      depth: 13.4,
      cages: {
        positions: [
          { x: -5.6, z: -3.8 },
          { x: 5.6, z: -3.8 },
          { x: 0, z: 0 },
        ],
      },
      color: 0x625b57,
      metalness: 0.72,
      roughness: 0.47,
      normalScale: 0.4,
    });
    this.group.add(this.terrain.group, this.rebar.group);
    this.rebar.group.position.z = -2;
    this.ready = this.initialize();
  }

  async initialize() {
    await Promise.all([this.terrain.ready, this.rebar.ready]);
    this.createDetailedSiteSystems();
    await this.loadLayout();
    await this.loadPerimeterFence();
    await this.loadMachinery();
    await this.loadWorkers();
    this.createInteractionPoints();
    return this;
  }

  createDetailedSiteSystems() {
    this.surfaceDetails = new SurfaceDetailSystem({
      heightSampler: (x, z) => this.getHeightAt(x, z),
      anisotropy: Math.min(this.assets.maxAnisotropy, 16),
    });
    this.group.add(this.surfaceDetails.group);

    this.hoarding = new PerimeterHoardingSystem({
      width: 68,
      depth: 56.5,
      height: 4.65,
      heightSampler: (x, z) => this.getHeightAt(x, z),
    });
    this.group.add(this.hoarding.group);
    this.cameraColliders.push(...this.hoarding.cameraColliders);

    this.safetyRail = new SafetyRailSystem({
      sourceMaterial: this.rebar.material,
      heightSampler: (x, z) => this.getHeightAt(x, z),
      excavation: { xHalf: 11.8, nearZ: 7.5, farZ: -11.5, gapHalf: 2.2, postSpacing: 1.85 },
    });
    this.group.add(this.safetyRail.group);
    this.safetyRail.collisionPoints.forEach((point) => {
      this.obstacles.push({ x: point.x, z: point.z, radius: 0.14, object: this.safetyRail.group });
    });

    // The four soil faces are camera-only collision volumes. They let the
    // player enter the workfront while preventing the orbit camera from
    // travelling through the excavation wall.
    this.cameraColliders.push(
      { min: new THREE.Vector3(-12.2, -1.85, 6.95), max: new THREE.Vector3(12.2, 0.85, 8.35), tag: 'talud-sur' },
      { min: new THREE.Vector3(-12.2, -1.85, -12.35), max: new THREE.Vector3(12.2, 0.85, -10.95), tag: 'talud-norte' },
      { min: new THREE.Vector3(-12.5, -1.85, -12.35), max: new THREE.Vector3(-11.1, 0.85, 8.35), tag: 'talud-oeste' },
      { min: new THREE.Vector3(11.1, -1.85, -12.35), max: new THREE.Vector3(12.5, 0.85, 8.35), tag: 'talud-este' },
    );

    // Individual column cages must not be represented by a single slab-wide
    // box: doing so would place the target inside a collider permanently.
    for (const cage of [
      { x: -5.6, z: -5.8 },
      { x: 5.6, z: -5.8 },
      { x: 0, z: -2 },
    ]) {
      this.cameraColliders.push({
        min: new THREE.Vector3(cage.x - 0.95, -1.7, cage.z - 0.95),
        max: new THREE.Vector3(cage.x + 0.95, 3.4, cage.z + 0.95),
        tag: 'jaula-armadura',
      });
    }

    const stockpile = new RebarStockpile({
      material: this.rebar.material,
      position: new THREE.Vector3(-13.2, 0, -5.1),
      rotationY: 0.1,
      heightSampler: (x, z) => this.getHeightAt(x, z),
    });
    this.stockpiles.push(stockpile);
    this.group.add(stockpile.group);
    this.obstacles.push({ x: -13.2, z: -5.1, radius: 4.2, object: stockpile.group });

    for (const configuration of [
      { position: new THREE.Vector3(16.8, 0, -5.9), rotationY: -0.08 },
      { position: new THREE.Vector3(-18.4, 0, 4.8), rotationY: Math.PI * 0.48 },
    ]) {
      const additionalStockpile = new RebarStockpile({
        material: this.rebar.material,
        ...configuration,
        heightSampler: (x, z) => this.getHeightAt(x, z),
      });
      this.stockpiles.push(additionalStockpile);
      this.group.add(additionalStockpile.group);
      this.obstacles.push({
        x: configuration.position.x,
        z: configuration.position.z,
        radius: 4.2,
        object: additionalStockpile.group,
      });
    }
  }

  async loadLayout() {
    const entries = this.options.layout ?? DEFAULT_LAYOUT;
    const uniqueAssets = [...new Set(entries.map((entry) => entry.asset))];
    await Promise.all(uniqueAssets.map((asset) => this.assets.loadGLTF(PROPS[asset].url)));

    for (const entry of entries) {
      const { object } = await this.assets.instantiate(PROPS[entry.asset].url);
      object.name = `prop-${entry.key}`;
      if (entry.targetSize) this.assets.fitToSize(object, entry.targetSize, entry.axis ?? 'max');
      object.rotation.y = entry.rotationY ?? 0;
      object.position.x = entry.position[0];
      object.position.z = entry.position[2];
      this.assets.ground(object, this.getHeightAt(object.position.x, object.position.z));
      object.userData.assetKey = entry.asset;
      this.group.add(object);
      this.props.set(entry.key, object);
      this.registerObstacle(object, entry.asset === 'cement_bag' ? 0.35 : undefined);
    }
  }

  async loadMachinery() {
    const { object: crawler } = await this.assets.instantiate(MACHINERY.lr1300Crane.url);

    crawler.name = 'lr1300-crawler-crane-production-model';
    crawler.scale.setScalar(0.25);
    crawler.position.set(3, 0, -17.5);
    crawler.rotation.y = 0;
    this.assets.ground(crawler, this.getHeightAt(crawler.position.x, crawler.position.z));
    this.enhanceMachineryMaterials(crawler);
    this.group.add(crawler);
    this.props.set('crawlerCrane', crawler);
    this.registerObstacle(crawler, 4.8);

  }

  async loadPerimeterFence() {
    const gltf = await this.assets.loadGLTF(PROPS.modular_chainlink_fence.url);
    const source = gltf.scene.getObjectByName('modular_chainlink_fence_double')
      ?? gltf.scene.getObjectByName('modular_chainlink_fence');
    if (!source) throw new Error('El activo de vallado no contiene un módulo lineal utilizable.');

    const prototype = source.clone(true);
    prototype.position.set(0, 0, 0);
    prototype.rotation.set(0, 0, 0);
    prototype.scale.set(1, 1, 1);
    prototype.updateMatrixWorld(true);
    const moduleBounds = new THREE.Box3().setFromObject(prototype);
    const moduleSize = moduleBounds.getSize(new THREE.Vector3());
    const rotateModule = moduleSize.z > moduleSize.x;
    const moduleLength = Math.max(moduleSize.x, moduleSize.z);
    const fence = new THREE.Group();
    fence.name = 'perimeter-chainlink-fence-imported-modules';
    const span = 58;
    const count = Math.ceil(span / moduleLength);
    for (let index = 0; index < count; index += 1) {
      const panel = source.clone(true);
      panel.name = `perimeter-fence-panel-${index + 1}`;
      panel.position.set(-span * 0.5 + moduleLength * (index + 0.5), 0, -23.25);
      panel.rotation.set(0, rotateModule ? Math.PI * 0.5 : 0, 0);
      this.assets.prepareObject(panel);
      this.assets.ground(panel, this.getHeightAt(panel.position.x, panel.position.z));
      fence.add(panel);
    }
    this.group.add(fence);
    this.props.set('perimeterFence', fence);
  }

  enhanceMachineryMaterials(root) {
    const constructionYellow = new THREE.Color(0xd9971e);
    root.traverse((node) => {
      if (!node.isMesh) return;
      const materials = Array.isArray(node.material) ? node.material : [node.material];
      materials.forEach((material) => {
        if (!material) return;
        if (/yellow metal|metal steel textured white/i.test(material.name)) material.color?.set(0xd58e0b);
        const hsl = {};
        material.color?.getHSL(hsl);
        if (material.color && hsl.s > 0.18 && hsl.l > 0.28) material.color.lerp(constructionYellow, 0.12);
        material.roughness = THREE.MathUtils.clamp(material.roughness ?? 0.58, 0.36, 0.78);
        material.metalness = Math.max(material.metalness ?? 0, /wheel|tire|glass/i.test(node.name) ? 0 : 0.08);
        material.envMapIntensity = 1;
        material.onBeforeCompile = (shader) => {
          shader.vertexShader = `varying vec3 vCorObjectPosition;\n${shader.vertexShader}`
            .replace('#include <begin_vertex>', '#include <begin_vertex>\n vCorObjectPosition = position;');
          shader.fragmentShader = `
            varying vec3 vCorObjectPosition;
            float corPaintNoise(vec3 p) {
              float a = fract(sin(dot(floor(p * 7.0), vec3(12.9898, 78.233, 37.719))) * 43758.5453);
              float b = fract(sin(dot(floor(p * 29.0), vec3(26.651, 11.135, 91.733))) * 17453.113);
              return a * 0.68 + b * 0.32;
            }
          ${shader.fragmentShader}`.replace(
            '#include <map_fragment>',
            `#include <map_fragment>
             float corGrime = smoothstep(0.74, 0.98, corPaintNoise(vCorObjectPosition));
             diffuseColor.rgb *= mix(1.0, 0.68, corGrime * 0.42);`,
          );
        };
        material.customProgramCacheKey = () => 'obra-real-industrial-paint-v1';
        material.needsUpdate = true;
      });
    });
  }

  async loadWorkers() {
    const definitions = [
      {
        name: 'jefa-produccion', displayName: 'Marta Gil', role: 'Jefa de producción',
        label: 'Revisar punto de parada', position: new THREE.Vector3(4.8, 0, 18.5),
        rotationY: 2.9, helmetColor: 0xf4f3e9, vestColor: 0xff7a21, scale: 1.015,
        bubble: 'Primero entiende el encargo; después ejecuta.',
        phaseLines: {
          briefing: 'Confirma EPI, plano vigente y punto de parada.',
          debrief: 'Cierra el dossier con cada decisión trazada.',
        },
      },
      {
        name: 'tecnico-tablet', displayName: 'Diego Ramos', role: 'Técnico de calidad',
        label: 'Abrir inspección', position: new THREE.Vector3(-12.2, 0, -13.6),
        rotationY: 1.1, helmetColor: 0xf2c94c, vestColor: 0xf47b20, animation: 'tablet', scale: 0.98,
        bubble: 'La conformidad se demuestra con datos y trazabilidad.',
        phaseLines: {
          planos: 'Separa siempre norma, proyecto y recomendación.',
          reinspeccion: 'Mide recubrimiento, paso y geometría; no adivines.',
        },
      },
      {
        name: 'ferrallista-z04', displayName: 'Sergio León', role: 'Responsable de ferralla',
        label: 'Consultar armado', position: new THREE.Vector3(-3, -1.37, -3.5),
        rotationY: -2.62, helmetColor: 0xe8b72d, vestColor: 0xe97024, scale: 1.03,
        bubble: 'Despiece claro, corte limpio y doblado con mandril.',
        phaseLines: {
          inspeccion: 'Para Ø16 B500S, identifica antes qué tipo de doblado ejecutas.',
          correccion: 'Monta separadores antes de cerrar la parrilla.',
          reinspeccion: 'Los solapes no se resuelven con una cifra memorizada.',
        },
      },
      {
        name: 'topografo-control', displayName: 'Óscar Martín', role: 'Topógrafo',
        label: 'Consultar replanteo', position: new THREE.Vector3(5, 0, -14),
        rotationY: 2.55, helmetColor: 0xf0ede4, vestColor: 0xe76f22, animation: 'tablet', scale: 0.96,
        bubble: 'Ejes, cotas y referencias deben coincidir con C-101.',
        phaseLines: { planos: 'La revisión vigente es C-101 Rev. 03.' },
      },
      {
        name: 'tecnico-prl', displayName: 'Javier Mora', role: 'Técnico de prevención',
        label: 'Revisar protecciones', position: new THREE.Vector3(-10.4, 0, 9.4),
        rotationY: 1.18, helmetColor: 0xf5f1e5, vestColor: 0xd7dc35, scale: 1.045,
        bubble: 'Ninguna misión justifica entrar sin acceso seguro.',
        phaseLines: { clima: 'La lluvia obliga a reevaluar, no siempre a cancelar.' },
      },
      {
        name: 'coordinador-logistica', displayName: 'Raúl Santos', role: 'Coordinador de logística',
        label: 'Comprobar suministro', position: new THREE.Vector3(10.2, 0, -13.6),
        rotationY: -2.35, helmetColor: 0xe6bd32, vestColor: 0xef7826, scale: 0.99,
        bubble: 'Cada paquete de acero debe conservar su identificación.',
        phaseLines: {
          cuadrilla: 'Comprueba etiqueta, colada, diámetro y destino Z-04.',
          vertido: 'Albarán, lote, hora y volumen antes de descargar.',
        },
      },
    ];

    for (const definition of definitions) {
      const npc = new WorkerNPC(this.assets, definition);
      this.group.add(npc.group);
      await npc.ready;
      definition.position.y = definition.position.y || this.getHeightAt(definition.position.x, definition.position.z);
      npc.group.position.copy(definition.position);
      this.npcs.push(npc);
      this.interactions.push(npc.group);
      this.registerObstacle(npc.group, 0.42, false);
    }
  }

  createInteractionPoints() {
    const inspection = new THREE.Object3D();
    inspection.name = 'inspection-point-z04';
    inspection.position.set(0, -0.7, 6.2);
    inspection.userData.interaction = {
      type: 'mission',
      label: 'Abrir simulación de ferralla Z-04',
      panel: 'mission',
    };
    this.group.add(inspection);
    this.interactions.push(inspection);
  }

  registerObstacle(object, explicitRadius, cameraCollision = true) {
    object.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(object);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const radius = explicitRadius ?? Math.max(0.35, Math.min(Math.hypot(size.x, size.z) * 0.34, 5));
    this.obstacles.push({ x: center.x, z: center.z, radius, object });
    if (cameraCollision && size.y > 0.42 && Math.max(size.x, size.z) > 0.42) {
      this.cameraColliders.push({
        min: box.min.clone(),
        max: box.max.clone(),
        tag: object.name || 'elemento-obra',
      });
    }
  }

  getHeightAt(x, z) {
    return this.terrain.getSurfaceHeightAt(x, z);
  }

  getCameraColliders() {
    return this.cameraColliders;
  }

  findNearestInteraction(position, maximumDistance = 3.2) {
    let nearest = null;
    let bestDistance = maximumDistance;
    for (const object of this.interactions) {
      const world = object.getWorldPosition(new THREE.Vector3());
      const distance = Math.hypot(position.x - world.x, position.z - world.z);
      if (distance < bestDistance) {
        bestDistance = distance;
        nearest = { object, distance, data: object.userData.interaction };
      }
    }
    return nearest;
  }

  setWeather(mode) {
    this.terrain.setWetness(mode === 'rain' ? 1 : mode === 'overcast' ? 0.35 : 0.08);
    this.surfaceDetails?.setWeather(mode);
  }

  update(delta) {
    this.npcs.forEach((npc) => npc.update(delta));
  }

  dispose() {
    this.npcs.forEach((npc) => npc.dispose());
    this.hoarding?.dispose();
    this.safetyRail?.dispose();
    this.surfaceDetails?.dispose();
    this.stockpiles.forEach((stockpile) => stockpile.dispose());
    this.terrain.dispose();
    this.rebar.dispose();
    this.group.removeFromParent();
  }
}

export default ConstructionSite;
