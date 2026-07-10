import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { retargetClip } from 'three/addons/utils/SkeletonUtils.js';

const canvas = document.querySelector('#lab-canvas');
const nameNode = document.querySelector('#lab-name');
const dataNode = document.querySelector('#lab-data');
const params = new URLSearchParams(location.search);
const assetKey = params.get('asset') ?? 'ch17';
const animationKey = params.get('animation') ?? 'idle';

const assets = {
  ch17: { label: 'Obrero Ch17 · Mixamo', url: '/assets/characters/worker_ch17.glb', animated: true },
  crane: { label: 'Grúa móvil todoterreno', url: '/assets/machinery/rough_terrain_crane.glb' },
  crawler: { label: 'Grúa de celosía LR 1300', url: '/assets/machinery/lr1300_crane.glb' },
  fence: { label: 'Vallado modular PBR', url: '/assets/props/modular_chainlink_fence/modular_chainlink_fence.glb' },
  pier: { label: 'Madera estructural modular PBR', url: '/assets/props/modular_wooden_pier/modular_wooden_pier.glb' },
  cables: { label: 'Cableado industrial modular PBR', url: '/assets/props/modular_electric_cables/modular_electric_cables.glb' },
  pipes: { label: 'Tubería industrial modular PBR', url: '/assets/props/modular_industrial_pipes_01/modular_industrial_pipes_01.glb' },
};

const animationUrls = {
  idle: '/assets/characters/animations/idle_ch17.glb',
  tablet: '/assets/characters/animations/Tablet.glb',
  putdown: '/assets/characters/animations/putdown_ch17.glb',
};

const retargetAnimations = {
  walk: 'Walk',
  run: 'Run',
};

const asset = assets[assetKey] ?? assets.ch17;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.92;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x9db5c2);
const camera = new THREE.PerspectiveCamera(42, innerWidth / innerHeight, 0.04, 300);
const clock = new THREE.Clock();
let mixer = null;
let model = null;
let target = new THREE.Vector3(0, 0.9, 0);

scene.add(new THREE.HemisphereLight(0xdceeff, 0x3b3028, 1.25));
const key = new THREE.DirectionalLight(0xffe4bd, 3.4);
key.position.set(-7, 11, 6);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
key.shadow.camera.left = -8;
key.shadow.camera.right = 8;
key.shadow.camera.top = 8;
key.shadow.camera.bottom = -8;
scene.add(key);

const groundGeometry = new THREE.BufferGeometry();
groundGeometry.setAttribute('position', new THREE.Float32BufferAttribute([-16, 0, -16, 16, 0, -16, 16, 0, 16, -16, 0, 16], 3));
groundGeometry.setIndex([0, 2, 1, 0, 3, 2]);
groundGeometry.computeVertexNormals();
const ground = new THREE.Mesh(groundGeometry, new THREE.ShadowMaterial({ color: 0x1c2428, opacity: 0.3 }));
ground.receiveShadow = true;
scene.add(ground);

const gltfLoader = new GLTFLoader();
const pmrem = new THREE.PMREMGenerator(renderer);
pmrem.compileEquirectangularShader();

try {
  const hdr = await new RGBELoader().loadAsync('/assets/hdri/construction_yard_4k.hdr');
  const environment = pmrem.fromEquirectangular(hdr).texture;
  scene.environment = environment;
  scene.background = hdr;
  scene.backgroundBlurriness = 0.22;
  scene.backgroundIntensity = 0.48;
  hdr.mapping = THREE.EquirectangularReflectionMapping;
} catch (error) {
  console.warn('HDRI no disponible en el laboratorio.', error);
}

try {
  const gltf = await gltfLoader.loadAsync(asset.url);
  model = gltf.scene;
  model.traverse((object) => {
    if (!object.isMesh) return;
    object.castShadow = true;
    object.receiveShadow = true;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of materials) {
      if (material?.map) material.map.anisotropy = renderer.capabilities.getMaxAnisotropy();
      if (material?.normalMap) material.normalMap.anisotropy = renderer.capabilities.getMaxAnisotropy();
    }
  });
  scene.add(model);

  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  model.position.x -= center.x;
  model.position.z -= center.z;
  model.position.y -= box.min.y;
  target.set(0, Math.max(size.y * 0.52, 0.8), 0);
  const distance = Math.max(size.y * 1.65, size.x * 1.2, size.z * 1.7, 3.8);
  camera.position.set(distance * 0.62, target.y + distance * 0.14, distance);
  camera.lookAt(target);

  if (asset.animated && (animationUrls[animationKey] || retargetAnimations[animationKey])) {
    let clip = null;
    let mixerRoot = model;

    if (retargetAnimations[animationKey]) {
      const sourceAsset = await gltfLoader.loadAsync('/assets/characters/retarget/soldier_source.glb');
      let sourceMesh = null;
      let targetMesh = null;
      sourceAsset.scene.traverse((node) => { if (!sourceMesh && node.isSkinnedMesh) sourceMesh = node; });
      model.traverse((node) => { if (!targetMesh && node.isSkinnedMesh) targetMesh = node; });
      const sourceClip = sourceAsset.animations.find((candidate) => candidate.name === retargetAnimations[animationKey]);
      if (sourceMesh && targetMesh && sourceClip) {
        clip = retargetClip(targetMesh, sourceMesh, sourceClip, {
          fps: 30,
          hip: 'mixamorigHips',
          hipInfluence: new THREE.Vector3(0, 0, 0),
          preserveBonePositions: true,
          preserveBoneMatrix: true,
          useFirstFramePosition: true,
          getBoneName: (bone) => bone.name.replace(/^mixamorig1/i, 'mixamorig'),
        });
        mixerRoot = targetMesh;
      }
    } else {
      const animationAsset = await gltfLoader.loadAsync(animationUrls[animationKey]);
      clip = animationAsset.animations[0]?.clone() ?? null;
    }

    if (clip) {
      for (const track of clip.tracks) {
        // GLTFLoader sanea ':' en los nombres de nodos. Se normaliza tanto el
        // prefijo Mixamo original como sus variantes numeradas al rig Ch17.
        track.name = track.name.replace(/mixamorig\d*:?(?=[A-Z])/i, 'mixamorig1');
      }

      // Las locomociones del Soldier de referencia guardan el movimiento de
      // cadera en centímetros y con otro eje vertical. Aplicarlo directamente
      // desplaza el rig decenas de metros. Conservamos toda la pose articular
      // y eliminamos únicamente ese root-motion incompatible: el controlador
      // del juego desplazará el personaje en coordenadas de mundo.
      if (retargetAnimations[animationKey]) {
        clip.tracks = clip.tracks.filter((track) => !/mixamorig1Hips\.position$/i.test(track.name));
      }
      clip.name = animationKey;
      mixer = new THREE.AnimationMixer(mixerRoot);
      mixer.clipAction(clip).play();
    }
  }

  nameNode.textContent = `${asset.label} · ${animationKey}`;
  dataNode.textContent = `${Math.round(size.x * 100) / 100} × ${Math.round(size.y * 100) / 100} × ${Math.round(size.z * 100) / 100} m · sombras · HDRI · ACES`;
  document.body.dataset.ready = 'true';
} catch (error) {
  nameNode.textContent = 'ERROR DE ACTIVO';
  dataNode.textContent = error.message;
  document.body.dataset.error = 'true';
  console.error(error);
}

function render() {
  const dt = Math.min(clock.getDelta(), 0.04);
  mixer?.update(dt);
  renderer.render(scene, camera);
  requestAnimationFrame(render);
}
render();

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight, false);
});
