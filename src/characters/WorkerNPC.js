import * as THREE from 'three';
import { ANIMATIONS, CHARACTERS } from '../assets/assetManifest.js';

function normalizeClip(input, name) {
  const clip = input.clone();
  clip.name = name;
  for (const track of clip.tracks) {
    track.name = track.name.replace(/mixamorig\d*:?(?=[A-Z])/i, 'mixamorig1');
  }
  return clip;
}

/** Stationary professional NPC using the same production rig and authored clips. */
export class WorkerNPC {
  constructor(assetManager, options = {}) {
    this.assets = assetManager;
    this.options = options;
    this.group = new THREE.Group();
    this.group.name = options.name ?? 'site-worker';
    this.group.visible = false;
    this.mixer = null;
    this.action = null;
    this.ready = this.initialize();
  }

  async initialize() {
    const animationEntry = this.options.animation === 'tablet' ? ANIMATIONS.tablet : ANIMATIONS.idleCh17;
    const [character, animation] = await Promise.all([
      this.assets.instantiate(CHARACTERS.workerCh17.url, { skeleton: true }),
      this.assets.loadGLTF(animationEntry.url),
    ]);
    this.model = character.object;
    this.model.traverse((node) => {
      if (!node.isMesh) return;
      node.castShadow = true;
      node.receiveShadow = true;
      if (/Helmet/i.test(node.name) && this.options.helmetColor) {
        node.material = node.material.clone();
        node.material.color.set(this.options.helmetColor);
      }
      if (/Vest/i.test(node.name) && this.options.vestColor) {
        node.material = node.material.clone();
        node.material.color.set(this.options.vestColor);
      }
    });
    this.group.add(this.model);
    const bounds = new THREE.Box3().setFromObject(this.model);
    this.model.position.y -= bounds.min.y;
    this.group.scale.setScalar(this.options.scale ?? 1);
    this.group.position.copy(this.options.position ?? new THREE.Vector3());
    this.group.rotation.y = this.options.rotationY ?? 0;

    const clip = normalizeClip(animation.animations[0], this.options.animation ?? 'idle');
    this.mixer = new THREE.AnimationMixer(this.model);
    this.action = this.mixer.clipAction(clip);
    this.action.play();
    this.action.time = this.options.phase ?? Math.random() * Math.max(clip.duration, 0.01);
    this.group.userData.interaction = {
      type: 'npc',
      label: this.options.label ?? 'Hablar',
      role: this.options.role ?? 'Trabajador de obra',
      name: this.options.displayName ?? 'Profesional de obra',
    };
    this.group.visible = true;
    return this;
  }

  update(delta) {
    this.mixer?.update(Math.min(delta, 0.05));
  }

  dispose() {
    this.mixer?.stopAllAction();
    this.group.removeFromParent();
  }
}

export default WorkerNPC;
