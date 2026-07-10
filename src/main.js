import './style.css';
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { AssetManager } from './assets/AssetManager.js';
import { HDRIS } from './assets/assetManifest.js';
import { ConstructionSite } from './world/ConstructionSite.js';
import { WeatherSystem } from './world/WeatherSystem.js';
import { PlayerCharacter } from './characters/PlayerCharacter.js';
import { ThirdPersonCamera } from './camera/ThirdPersonCamera.js';
import { createHUD } from './ui/HUD.js';
import { SiteSupervisorAI } from './ai/index.js';
import {
  ACTION_TYPES,
  createGameStore,
  getAvailableActions,
} from './gameState.js';

const app = document.querySelector('#app');
app.innerHTML = `
  <main class="cor-game" data-testid="game-shell">
    <canvas id="scene" aria-label="Obra de cimentaciones en tercera persona" tabindex="0"></canvas>
    <div class="cor-grade" aria-hidden="true"></div>
    <div class="cor-vignette" aria-hidden="true"></div>
    <div class="cor-grain" aria-hidden="true"></div>

    <section class="cor-start" data-start-screen>
      <div class="cor-start__veil"></div>
      <div class="cor-start__panel">
        <div class="cor-brand" aria-label="Cimentaciones: Obra Real"><span>COR</span><i></i></div>
        <p class="cor-start__eyebrow">SIMULACIÓN PROFESIONAL · OBRA ESPAÑOLA</p>
        <h1>Cimentaciones<br><strong>Obra Real</strong></h1>
        <p class="cor-start__lead">Inspecciona una losa de cimentación a escala real, coordina el punto de parada y documenta cada decisión.</p>
        <ul class="cor-start__features" aria-label="Características">
          <li>PERSONAJE 3D RIGGEADO</li><li>MATERIALES PBR 4K</li><li>INSPECCIÓN RA</li><li>CLIMA DINÁMICO</li>
        </ul>
        <button class="cor-start__button" type="button" data-start-button disabled>
          <span data-start-label>PREPARANDO OBRA</span><small data-start-detail>Geometría técnica y activos de producción</small>
        </button>
        <div class="cor-start__loading" aria-live="polite">
          <span><i data-loading-progress></i></span><strong data-loading-status>Inicializando motor de render…</strong>
        </div>
        <p class="cor-start__legal">Escenario didáctico ficticio. No sustituye proyecto, dirección facultativa ni formación habilitante.</p>
      </div>
      <aside class="cor-start__technical"><span>VERTICAL SLICE</span><strong>CAMPO Z-04</strong><small>THREE.JS · WEBGL2 · ACES · GTAO</small></aside>
    </section>

    <div class="cor-hud-root" data-hud-root></div>
    <div class="cor-interaction" data-interaction hidden><kbd>F</kbd><span><small>INTERACTUAR</small><strong>Revisar punto de parada</strong></span></div>
    <div class="cor-notice" data-notice hidden><span></span><div><small>TRAZABILIDAD ACTUALIZADA</small><strong></strong></div></div>
    <aside class="cor-supervisor" data-supervisor hidden aria-live="assertive" aria-atomic="true">
      <div class="cor-supervisor__portrait" aria-hidden="true">
        <svg viewBox="0 0 64 64" fill="none"><path d="M17 32v-5c0-9 6-17 15-17s15 8 15 17v5"/><path d="M12 33c6 3 13 4 20 4s14-1 20-4"/><path d="M9 34h46"/><path d="M23 25v-9m18 9v-9"/><path d="M20 43c3 7 7 11 12 11s9-4 12-11"/></svg>
        <span data-supervisor-initials>MS</span>
      </div>
      <div class="cor-supervisor__copy">
        <small data-supervisor-role>JEFA DE OBRA</small>
        <strong data-supervisor-name>Marta Salas</strong>
        <h2 data-supervisor-title>Control del frente</h2>
        <p data-supervisor-text></p>
        <div class="cor-supervisor__meta"><span data-supervisor-trace>GUION TÉCNICO REVISADO</span><button type="button" data-supervisor-ack>ENTENDIDO</button></div>
      </div>
    </aside>
    <div class="cor-load-error" data-load-error hidden role="alert"><strong>No se pudo preparar la obra</strong><p></p><button type="button" onclick="location.reload()">REINTENTAR</button></div>
  </main>
`;

const canvas = document.querySelector('#scene');
const startScreen = document.querySelector('[data-start-screen]');
const startButton = document.querySelector('[data-start-button]');
const startLabel = document.querySelector('[data-start-label]');
const startDetail = document.querySelector('[data-start-detail]');
const loadingProgress = document.querySelector('[data-loading-progress]');
const loadingStatus = document.querySelector('[data-loading-status]');
const hudRoot = document.querySelector('[data-hud-root]');
const interactionPrompt = document.querySelector('[data-interaction]');
const notice = document.querySelector('[data-notice]');
const supervisorPanel = document.querySelector('[data-supervisor]');
const supervisorAck = document.querySelector('[data-supervisor-ack]');
const loadError = document.querySelector('[data-load-error]');

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: false,
  powerPreference: 'high-performance',
  stencil: false,
});
const qualityPixelRatio = Math.min(window.devicePixelRatio, 1.75);
renderer.setPixelRatio(qualityPixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.98;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x8fa5ad);
scene.fog = new THREE.FogExp2(0x9aadb4, 0.0026);

const camera = new THREE.PerspectiveCamera(48, window.innerWidth / window.innerHeight, 0.06, 360);
camera.position.set(18, 7, 23);

const hemisphere = new THREE.HemisphereLight(0xd8ecf4, 0x30261e, 1.35);
scene.add(hemisphere);
const sun = new THREE.DirectionalLight(0xffe0ad, 3.6);
sun.position.set(-28, 42, 22);
sun.castShadow = true;
sun.shadow.mapSize.set(4096, 4096);
sun.shadow.camera.left = -38;
sun.shadow.camera.right = 38;
sun.shadow.camera.top = 34;
sun.shadow.camera.bottom = -34;
sun.shadow.camera.near = 1;
sun.shadow.camera.far = 105;
sun.shadow.bias = -0.00016;
sun.shadow.normalBias = 0.035;
scene.add(sun, sun.target);
sun.target.position.set(0, -2, -3);
const skyFill = new THREE.DirectionalLight(0x8ab8d5, 0.62);
skyFill.position.set(26, 14, -28);
scene.add(skyFill);

const composerTarget = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight, {
  depthBuffer: true,
  stencilBuffer: false,
  type: THREE.UnsignedByteType,
});
composerTarget.samples = 4;
const composer = new EffectComposer(renderer, composerTarget);
composer.setPixelRatio(qualityPixelRatio);
composer.addPass(new RenderPass(scene, camera));
const gtao = new GTAOPass(scene, camera, window.innerWidth, window.innerHeight);
gtao.output = GTAOPass.OUTPUT.Default;
gtao.blendIntensity = 0.62;
gtao.updateGtaoMaterial({ radius: 0.3, distanceExponent: 1.55, thickness: 1.35, distanceFallOff: 1 });
gtao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 4, radiusExponent: 1.9, rings: 2, samples: 16 });
composer.addPass(gtao);
const bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.08, 0.32, 0.92);
composer.addPass(bloom);
const smaa = new SMAAPass(window.innerWidth * qualityPixelRatio, window.innerHeight * qualityPixelRatio);
composer.addPass(smaa);
composer.addPass(new OutputPass());

const store = createGameStore({ autosave: true });
const hud = createHUD(hudRoot, store);
hud.setVisible(false);
const assets = new AssetManager(renderer);
const clock = new THREE.Clock();
const keys = new Set();
let site;
let player;
let thirdPersonCamera;
let weather;
let gameStarted = false;
let nearestInteraction = null;
let weatherMode = 'sunny';
let noticeTimer = 0;
let spacingDefectActive = false;
let supervisorAI;
let supervisorTimer = 0;
let activeSupervisorEvent = null;

function syncConstructionPhase(state) {
  if (!site?.terrain || !site?.rebar) return;
  const poured = Boolean(state.flags?.pourComplete || ['curado', 'debrief'].includes(state.phase));
  site.terrain.setConcretePhase(poured ? 'foundation' : 'blinding');
  site.rebar.setConstructionStage(poured
    ? 'hidden'
    : ['inspeccion', 'correccion', 'reinspeccion', 'clima', 'vertido'].includes(state.phase)
      ? 'complete'
      : 'lower');

  // Nobody remains embedded in the newly poured slab. The ferralla lead moves
  // to the protected perimeter as soon as the workfront changes to concrete.
  const ferrallaLead = site.npcs?.find((npc) => npc.group.name === 'ferrallista-z04');
  if (ferrallaLead) {
    if (poured) {
      ferrallaLead.group.position.set(12.8, site.getHeightAt(12.8, 4.4), 4.4);
      ferrallaLead.group.rotation.y = -1.8;
    } else {
      ferrallaLead.group.position.set(-3, -1.37, -3.5);
      ferrallaLead.group.rotation.y = -2.62;
    }
  }
}

store.subscribe((nextState) => {
  spacingDefectActive = Boolean(nextState.flags?.defectDetected && !nextState.flags?.correctionApplied);
  site?.rebar.setSpacingDefect(spacingDefectActive);
  syncConstructionPhase(nextState);
  if (activeSupervisorEvent && activeSupervisorEvent.phase !== nextState.phase && !activeSupervisorEvent.blocking) {
    activeSupervisorEvent = null;
    supervisorTimer = 0;
    supervisorPanel.hidden = true;
    document.documentElement.classList.remove('cor-supervisor-open');
  }
});

function setLoading(percent, label) {
  loadingProgress.style.width = `${percent}%`;
  loadingStatus.textContent = label;
}

function showNotice(message, tone = 'ok') {
  notice.hidden = false;
  notice.dataset.tone = tone;
  notice.querySelector('strong').textContent = message;
  noticeTimer = 2.8;
}

function showSupervisorMessage(event) {
  activeSupervisorEvent = event;
  noticeTimer = 0;
  notice.hidden = true;
  supervisorPanel.hidden = false;
  document.documentElement.classList.add('cor-supervisor-open');
  supervisorPanel.dataset.kind = event.kind || 'instruction';
  supervisorPanel.dataset.severity = event.severity || 'medium';
  supervisorPanel.dataset.blocking = String(Boolean(event.blocking));
  const speakerName = event.speaker?.name || 'Marta Salas';
  const initials = speakerName.split(/\s+/).map((word) => word[0]).slice(0, 2).join('').toUpperCase();
  supervisorPanel.querySelector('[data-supervisor-initials]').textContent = initials;
  supervisorPanel.querySelector('[data-supervisor-name]').textContent = speakerName;
  supervisorPanel.querySelector('[data-supervisor-role]').textContent = String(event.speaker?.role || 'Supervisión de obra').toUpperCase();
  supervisorPanel.querySelector('[data-supervisor-title]').textContent = event.title;
  supervisorPanel.querySelector('[data-supervisor-text]').textContent = event.text;
  supervisorPanel.querySelector('[data-supervisor-trace]').textContent = event.blocking
    ? 'PAQUETE DE TRABAJO BLOQUEADO'
    : event.kind === 'praise' ? 'DECISIÓN CORRECTA REGISTRADA' : 'GUION TÉCNICO REVISADO';
  supervisorTimer = event.blocking ? Number.POSITIVE_INFINITY : 7;
}

supervisorAck.addEventListener('click', () => {
  if (activeSupervisorEvent) supervisorAI?.acknowledge(activeSupervisorEvent.id);
  activeSupervisorEvent = null;
  supervisorTimer = 0;
  supervisorPanel.hidden = true;
  document.documentElement.classList.remove('cor-supervisor-open');
  canvas.focus({ preventScroll: true });
});

function currentInput() {
  const modalOpen = Boolean(hud.activePanel);
  return {
    forward: keys.has('KeyW') || keys.has('ArrowUp'),
    backward: keys.has('KeyS') || keys.has('ArrowDown'),
    left: keys.has('KeyA') || keys.has('ArrowLeft'),
    right: keys.has('KeyD') || keys.has('ArrowRight'),
    run: keys.has('ShiftLeft') || keys.has('ShiftRight'),
    locked: !gameStarted || modalOpen,
  };
}

function completeRecommendedAction() {
  const available = getAvailableActions(store.getState(), { includeDisabled: false });
  const action = available.find((item) => item.recommended) ?? available[0];
  if (!action) {
    showNotice('El paquete actual ya no tiene acciones pendientes', 'info');
    return;
  }
  const result = store.dispatch({ type: action.type });
  supervisorAI?.reportAction(action.type, result, { state: result.state ?? store.getState() });
  if (result.ok) showNotice(action.successTitle ?? action.label ?? 'Acción registrada');
  else showNotice(result.error ?? 'Acción no disponible', 'warning');
}

function interact() {
  if (!nearestInteraction) return;
  const { data } = nearestInteraction;
  if (data?.panel === 'tablet' || data?.type === 'inspection') {
    hud.openPanel('tablet');
    player.setInteractionPose(true);
    return;
  }
  hud.openPanel('journal');
  completeRecommendedAction();
}

function setWeather(mode) {
  weatherMode = mode;
  weather.setMode(mode);
  site.setWeather(mode);
  const settings = {
    sunny: { sun: 3.6, hemi: 1.35, fill: 0.62, exposure: 0.98, background: 0.9, label: 'Cielo despejado · terreno seco' },
    overcast: { sun: 1.85, hemi: 0.96, fill: 0.34, exposure: 0.76, background: 0.42, label: 'Nubosidad densa · luz difusa' },
    rain: { sun: 0.96, hemi: 0.82, fill: 0.2, exposure: 0.68, background: 0.26, label: 'Lluvia activa · superficie mojada' },
    night: { sun: 0.24, hemi: 0.34, fill: 0.08, exposure: 0.52, background: 0.12, label: 'Turno nocturno · iluminación reducida' },
  }[mode];
  sun.intensity = settings.sun;
  hemisphere.intensity = settings.hemi;
  skyFill.intensity = settings.fill;
  renderer.toneMappingExposure = settings.exposure;
  scene.backgroundIntensity = settings.background;
  showNotice(settings.label, mode === 'rain' ? 'warning' : 'info');
}

function cycleWeather() {
  const modes = ['sunny', 'overcast', 'rain', 'night'];
  setWeather(modes[(modes.indexOf(weatherMode) + 1) % modes.length]);
}

async function initialize() {
  try {
    setLoading(8, 'Configurando iluminación física y color ACES…');
    await assets.applyEnvironment(scene, HDRIS.germanTownStreet.url, {
      environmentIntensity: 0.92,
      backgroundIntensity: 0.9,
      backgroundBlurriness: 0.015,
      rotationY: 5.8,
    });

    setLoading(24, 'Cargando suelo y hormigón PBR 4K…');
    site = new ConstructionSite(scene, assets);
    weather = new WeatherSystem(scene, renderer);
    await Promise.race([
      site.terrain.ready,
      new Promise((_, reject) => setTimeout(() => reject(new Error('Tiempo de espera agotado cargando el terreno.')), 45000)),
    ]);

    setLoading(48, 'Construyendo parrillas corrugadas y jaulas de armado…');
    await site.rebar.ready;

    setLoading(62, 'Preparando personaje profesional y locomoción…');
    player = new PlayerCharacter(assets, {
      heightSampler: (x, z) => site.getHeightAt(x, z),
      siteHalfWidth: 33.5,
      siteHalfDepth: 26.5,
    });
    scene.add(player.group);
    await player.ready;
    player.group.position.set(3, site.getHeightAt(3, 21), 21);
    player.group.rotation.y = -2.95;

    setLoading(78, 'Distribuyendo maquinaria, vallado y acopios GLB…');
    await site.ready;
    spacingDefectActive = Boolean(store.getState().flags?.defectDetected && !store.getState().flags?.correctionApplied);
    site.rebar.setSpacingDefect(spacingDefectActive);
    syncConstructionPhase(store.getState());

    supervisorAI = new SiteSupervisorAI({
      store,
      zones: [{
        id: 'excavation-z04',
        label: 'el borde protegido de la excavación Z-04',
        min: { x: -11.8, z: -11.5 },
        max: { x: 11.8, z: 7.5 },
        recommendedAction: 'STOP_AND_CHECK',
      }],
      onEvent: showSupervisorMessage,
    });

    thirdPersonCamera = new ThirdPersonCamera(camera, canvas, {
      yaw: -2.95,
      pitch: 0.07,
      distance: 5.35,
      lookAhead: 16.5,
      targetHeight: 1.42,
      focusHeight: -0.9,
      shoulder: -0.9,
      heightSampler: (x, z) => site.getHeightAt(x, z),
    });
    thirdPersonCamera.snap(player.group.position);
    weather.setMode('sunny');
    site.setWeather('sunny');

    setLoading(94, 'Compilando oclusión ambiental y sombras de contacto…');
    renderer.compile(scene, camera);
    composer.render();

    setLoading(100, 'Obra preparada · punto de parada Z-04');
    startButton.disabled = false;
    startLabel.textContent = 'INICIAR JORNADA';
    startDetail.textContent = 'Entrar en el campo de cimentaciones';
    document.body.dataset.ready = 'true';
    if (new URLSearchParams(location.search).has('autostart')) startGame();
  } catch (error) {
    console.error(error);
    loadError.hidden = false;
    loadError.querySelector('p').textContent = error instanceof Error ? error.message : String(error);
    document.body.dataset.error = 'true';
  }
}

function startGame() {
  if (!player?.isReady) return;
  gameStarted = true;
  startScreen.classList.add('is-hidden');
  hud.setVisible(true);
  canvas.focus({ preventScroll: true });
  showNotice('Punto de parada Z-04 listo para inspección', 'info');
}

startButton.addEventListener('click', startGame);
hudRoot.addEventListener('cor:hud-action', (event) => {
  if (event.detail.action === 'scan') {
    completeRecommendedAction();
    site.rebar.setConstructionStage('complete');
  }
  if (event.detail.action === 'unsafe-weather') {
    setWeather('rain');
    const result = store.dispatch({ type: ACTION_TYPES.RISK_POUR_IN_RAIN });
    supervisorAI?.reportAction(ACTION_TYPES.RISK_POUR_IN_RAIN, result, { state: result.state ?? store.getState() });
    showNotice(result.error || 'Decisión rechazada: el paquete permanece bloqueado', 'warning');
    hud.closePanel();
  }
  if (event.detail.action === 'safe-weather') {
    completeRecommendedAction();
    setWeather('overcast');
    hud.closePanel();
  }
});
hudRoot.addEventListener('cor:hud-tool', (event) => {
  if (event.detail.tool === 'inspect') hud.openPanel('tablet');
  if (event.detail.tool === 'camera') showNotice('Evidencia fotográfica vinculada al registro Z-04');
});

window.addEventListener('keydown', (event) => {
  if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ShiftLeft', 'ShiftRight'].includes(event.code)) {
    keys.add(event.code);
    if (event.target === document.body) event.preventDefault();
  }
  if (event.repeat) return;
  if ((event.code === 'KeyE' || event.code === 'KeyF') && !hud.activePanel) interact();
  if (event.code === 'KeyT') hud.activePanel === 'tablet' ? hud.closePanel() : hud.openPanel('tablet');
  if (event.code === 'KeyM') hud.activePanel ? hud.closePanel() : hud.openPanel('journal');
  if (event.code === 'KeyG') cycleWeather();
  if (event.code === 'Digit2') hud.openPanel('tablet');
  if (event.code === 'Digit3') hud.openPanel('plans');
  if (event.code === 'KeyR' && !hud.activePanel) hud.openPanel('tablet');
});
window.addEventListener('keyup', (event) => keys.delete(event.code));
window.addEventListener('blur', () => keys.clear());

function updateInteraction() {
  if (!player?.isReady || hud.activePanel || !gameStarted) {
    interactionPrompt.hidden = true;
    return;
  }
  nearestInteraction = site.findNearestInteraction(player.group.position);
  interactionPrompt.hidden = !nearestInteraction;
  if (nearestInteraction) interactionPrompt.querySelector('strong').textContent = nearestInteraction.data?.label ?? 'Interactuar';
}

let fpsFrames = 0;
let fpsElapsed = 0;
function animate() {
  requestAnimationFrame(animate);
  const delta = Math.min(clock.getDelta(), 0.05);
  if (player?.isReady && thirdPersonCamera) {
    player.update(delta, currentInput(), thirdPersonCamera.yaw, site.obstacles);
    thirdPersonCamera.update(delta, player.group.position);
    site.update(delta);
    site.rebar.setInspectionOverlay(hud.activePanel === 'tablet' && spacingDefectActive);
    weather.update(delta, player.group.position);
    if (gameStarted) {
      supervisorAI?.update(delta, {
        player,
        weather: { mode: weatherMode, raining: weatherMode === 'rain' },
        safety: {
          ppe: { helmet: true, vest: true, boots: true },
          housekeepingOk: true,
          accessClear: true,
        },
        ui: {
          modalOpen: Boolean(hud.activePanel),
          tabletOpen: hud.activePanel === 'tablet',
        },
      });
    }
    updateInteraction();
    if (!hud.activePanel && player.currentActionName === 'tablet') player.setInteractionPose(false);
  }
  if (noticeTimer > 0) {
    noticeTimer -= delta;
    if (noticeTimer <= 0) notice.hidden = true;
  }
  if (Number.isFinite(supervisorTimer) && supervisorTimer > 0) {
    supervisorTimer -= delta;
    if (supervisorTimer <= 0) {
      activeSupervisorEvent = null;
      supervisorPanel.hidden = true;
      document.documentElement.classList.remove('cor-supervisor-open');
    }
  }
  composer.render();
  fpsFrames += 1;
  fpsElapsed += delta;
  if (fpsElapsed >= 1) {
    document.body.dataset.fps = String(Math.round(fpsFrames / fpsElapsed));
    fpsFrames = 0;
    fpsElapsed = 0;
  }
}
animate();
initialize();

window.addEventListener('resize', () => {
  const width = window.innerWidth;
  const height = window.innerHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height, false);
  composer.setSize(width, height);
});

window.addEventListener('beforeunload', () => {
  thirdPersonCamera?.dispose();
  player?.dispose();
  site?.dispose();
  weather?.dispose();
  supervisorAI?.dispose();
  composer.dispose();
  hud.destroy();
});

// Exposed only for automated visual/interaction acceptance tests.
window.__COR_TEST__ = {
  get ready() { return document.body.dataset.ready === 'true'; },
  get player() { return player; },
  get site() { return site; },
  get hud() { return hud; },
  get supervisor() { return supervisorAI; },
  setWeather,
  setEnvironmentRotation(value) {
    const rotation = Number(value) || 0;
    scene.backgroundRotation.y = rotation;
    scene.environmentRotation.y = rotation;
    return rotation;
  },
  setCamera(preset = {}) {
    if (!thirdPersonCamera || !player?.isReady) return null;
    for (const key of ['yaw', 'pitch', 'distance', 'lookAhead', 'targetHeight', 'focusHeight', 'shoulder']) {
      if (Number.isFinite(preset[key])) thirdPersonCamera[key] = preset[key];
    }
    if (Number.isFinite(preset.fov)) {
      camera.fov = preset.fov;
      camera.updateProjectionMatrix();
    }
    thirdPersonCamera.snap(player.group.position);
    return {
      yaw: thirdPersonCamera.yaw,
      pitch: thirdPersonCamera.pitch,
      distance: thirdPersonCamera.distance,
      lookAhead: thirdPersonCamera.lookAhead,
      targetHeight: thirdPersonCamera.targetHeight,
      focusHeight: thirdPersonCamera.focusHeight,
      shoulder: thirdPersonCamera.shoulder,
      fov: camera.fov,
    };
  },
  setPlayerPosition(x, z, yaw = player?.group?.rotation?.y ?? 0) {
    if (!player?.isReady || !site || !Number.isFinite(x) || !Number.isFinite(z)) return null;
    player.group.position.set(x, site.getHeightAt(x, z), z);
    player.group.rotation.y = Number.isFinite(yaw) ? yaw : player.group.rotation.y;
    thirdPersonCamera?.snap(player.group.position);
    return { x: player.group.position.x, y: player.group.position.y, z: player.group.position.z };
  },
  startGame,
  completeRecommendedAction,
  snapshot() {
    if (!player?.isReady || !site) return null;
    const bounds = new THREE.Box3().setFromObject(player.group);
    const size = bounds.getSize(new THREE.Vector3());
    const position = player.group.position;
    const ground = site.getHeightAt(position.x, position.z);
    return {
      player: { x: position.x, y: position.y, z: position.z },
      bounds: { minY: bounds.min.y, sizeX: size.x, sizeY: size.y, sizeZ: size.z },
      ground,
      footDelta: bounds.min.y - ground,
      animation: player.currentActionName,
      phase: store.getState().phase,
      missionStatus: store.getState().mission?.status,
      weather: weatherMode,
      activePanel: hud.activePanel,
      hudVisible: hud.visible,
      fps: Number(document.body.dataset.fps || 0),
      render: { calls: renderer.info.render.calls, triangles: renderer.info.render.triangles },
      obstacles: site.obstacles.length,
      interactions: site.interactions.length,
      rebar: site.rebar.inspection,
      spacingDefect: Boolean(site.rebar.spacingDefect?.active),
      inspectionOverlay: Boolean(site.rebar.inspectionOverlayVisible),
      terrainPhase: site.terrain.concretePhase,
      rebarStage: site.rebar.stage,
      supervisor: activeSupervisorEvent ? {
        ruleId: activeSupervisorEvent.ruleId,
        kind: activeSupervisorEvent.kind,
        blocking: activeSupervisorEvent.blocking,
        title: activeSupervisorEvent.title,
      } : null,
    };
  },
};
