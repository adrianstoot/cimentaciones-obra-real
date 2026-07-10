import * as THREE from 'three';
import { retargetClip } from 'three/addons/utils/SkeletonUtils.js';
import {
  ANIMATIONS,
  CHARACTERS,
  RETARGET_SOURCES,
} from '../assets/assetManifest.js';

const WORLD_UP = new THREE.Vector3(0, 1, 0);

function findFirstSkinnedMesh(root) {
  let result = null;
  root.traverse((node) => {
    if (!result && node.isSkinnedMesh) result = node;
  });
  return result;
}

function createCompleteRigHelper(root) {
  const bones = [];
  root.traverse((node) => {
    if (node.isBone) bones.push(node);
  });
  const rootBone = bones.find((bone) => /Hips$/i.test(bone.name)) ?? bones[0];
  if (!rootBone || !bones.length) return null;
  const helper = new THREE.SkeletonHelper(rootBone);
  helper.skeleton = new THREE.Skeleton(bones);
  helper.name = 'worker-complete-retarget-rig';
  return helper;
}

function collectRigNodeNames(root) {
  const names = new Set();
  root.traverse((node) => {
    if (node.name) names.add(node.name);
  });
  return names;
}

function getTrackTargetName(trackName) {
  const normalized = trackName.replace(/^\./, '');
  const boneBinding = normalized.match(/^bones\[([^\]]+)\]/);
  return boneBinding?.[1] ?? normalized.split('.')[0];
}

function normalizeNativeClip(input, name, rigNodeNames) {
  const clip = input.clone();
  clip.name = name;
  for (const track of clip.tracks) {
    track.name = track.name.replace(/mixamorig\d*:?(?=[A-Z])/i, 'mixamorig1');
  }
  // Authored clips can contain optional finger bones that are absent from a
  // particular worker export. Letting AnimationMixer bind those tracks causes
  // warnings and, on some browsers, unstable hand/arm matrices after blending.
  clip.tracks = clip.tracks.filter((track) => rigNodeNames.has(getTrackTargetName(track.name)));
  return clip;
}

function normalizeRetargetedClip(input, name, rigNodeNames) {
  const clip = input.clone();
  clip.name = name;
  clip.tracks = clip.tracks
    // Locomotion may animate the hip root in both translation and rotation.
    // Translation is always gameplay-owned. Rotation keeps only its calibrated
    // first key so the rig retains its forward axis without corkscrewing.
    .filter((track) => !/(?:Hips\]|Hips)\.position$/i.test(track.name))
    .map((track) => {
      if (/(?:Hips\]|Hips)\.quaternion$/i.test(track.name) && track.values.length >= 4) {
        const root = new THREE.Quaternion(
          track.values[0],
          track.values[1],
          track.values[2],
          track.values[3],
        ).normalize();
        // The source and worker use opposite forward axes. Apply that fixed
        // conversion once, then remove all animated root yaw from locomotion.
        root.premultiply(new THREE.Quaternion().setFromAxisAngle(WORLD_UP, Math.PI)).normalize();
        for (let offset = 0; offset < track.values.length; offset += 4) {
          track.values[offset] = root.x;
          track.values[offset + 1] = root.y;
          track.values[offset + 2] = root.z;
          track.values[offset + 3] = root.w;
        }
      }
      track.name = track.name.replace(/^\.bones\[([^\]]+)\]/, '$1');
      track.name = track.name.replace(/mixamorig\d*:?(?=[A-Z])/i, 'mixamorig1');
      return track;
    })
    .filter((track) => rigNodeNames.has(getTrackTargetName(track.name)));
  return clip;
}

function filterSourceClipToSkeleton(input, sourceMesh) {
  const sourceBones = new Set(sourceMesh.skeleton?.bones.map((bone) => bone.name) ?? []);
  const clip = input.clone();
  clip.tracks = clip.tracks.filter((track) => sourceBones.has(getTrackTargetName(track.name)));
  return clip;
}

/** High-fidelity Mixamo-rigged worker with retargeted locomotion. */
export class PlayerCharacter {
  constructor(assetManager, options = {}) {
    this.assets = assetManager;
    this.options = options;
    this.group = new THREE.Group();
    this.group.name = options.name ?? 'player-worker';
    this.group.visible = false;
    this.model = null;
    this.mixer = null;
    this.actions = new Map();
    this.currentAction = null;
    this.velocity = new THREE.Vector3();
    this.forward = new THREE.Vector3();
    this.right = new THREE.Vector3();
    this.desired = new THREE.Vector3();
    this._nextPosition = new THREE.Vector3();
    this.walkSpeed = options.walkSpeed ?? 2.65;
    this.runSpeed = options.runSpeed ?? 5.25;
    this.acceleration = options.acceleration ?? 10.5;
    this.deceleration = options.deceleration ?? 12.5;
    this.turnSpeed = options.turnSpeed ?? 10;
    this.radius = options.radius ?? 0.36;
    this.heightSampler = options.heightSampler ?? (() => 0);
    this.isReady = false;
    this.ready = this.initialize();
  }

  async initialize() {
    const [characterAsset, idleAsset, tabletAsset, putdownAsset, sourceAsset] = await Promise.all([
      this.assets.instantiate(CHARACTERS.workerCh17.url, { skeleton: true }),
      this.assets.loadGLTF(ANIMATIONS.idleCh17.url),
      this.assets.loadGLTF(ANIMATIONS.tablet.url),
      this.assets.loadGLTF(ANIMATIONS.putdownCh17.url),
      this.assets.loadGLTF(RETARGET_SOURCES.soldierSource.url),
    ]);

    this.model = characterAsset.object;
    this.model.name = 'worker-ch17-render-model';
    this.model.traverse((node) => {
      if (!node.isMesh) return;
      node.castShadow = true;
      node.receiveShadow = true;
    });
    this.group.add(this.model);

    this.model.updateMatrixWorld(true);
    const initialBounds = new THREE.Box3().setFromObject(this.model);
    this.model.position.y -= initialBounds.min.y;
    this.model.updateMatrixWorld(true);

    const targetRig = createCompleteRigHelper(this.model);
    const sourceMesh = findFirstSkinnedMesh(sourceAsset.scene);
    if (!targetRig || !sourceMesh) throw new Error('No se encontró el rig necesario para locomoción.');

    const sourceWalk = sourceAsset.animations.find((clip) => clip.name === 'Walk');
    const sourceRun = sourceAsset.animations.find((clip) => clip.name === 'Run');
    const retargetOptions = {
      fps: 30,
      hip: 'mixamorigHips',
      hipInfluence: new THREE.Vector3(0, 0, 0),
      preserveBonePositions: true,
      preserveBoneMatrix: true,
      useFirstFramePosition: true,
      getBoneName: (bone) => bone.name.replace(/^mixamorig1/i, 'mixamorig'),
    };
    const rigNodeNames = collectRigNodeNames(this.model);
    const walk = sourceWalk
      ? normalizeRetargetedClip(
        retargetClip(targetRig, sourceMesh, filterSourceClipToSkeleton(sourceWalk, sourceMesh), retargetOptions),
        'walk',
        rigNodeNames,
      )
      : null;
    const run = sourceRun
      ? normalizeRetargetedClip(
        retargetClip(targetRig, sourceMesh, filterSourceClipToSkeleton(sourceRun, sourceMesh), retargetOptions),
        'run',
        rigNodeNames,
      )
      : null;
    targetRig.skeleton.pose();
    targetRig.geometry?.dispose();
    this.model.updateMatrixWorld(true);

    const clips = [
      normalizeNativeClip(idleAsset.animations[0], 'idle', rigNodeNames),
      normalizeNativeClip(tabletAsset.animations[0], 'tablet', rigNodeNames),
      normalizeNativeClip(putdownAsset.animations[0], 'putdown', rigNodeNames),
      walk,
      run,
    ].filter(Boolean);

    this.mixer = new THREE.AnimationMixer(this.model);
    for (const clip of clips) {
      const action = this.mixer.clipAction(clip);
      action.enabled = true;
      action.setEffectiveWeight(1);
      if (clip.name === 'putdown') {
        action.loop = THREE.LoopOnce;
        action.clampWhenFinished = true;
      }
      this.actions.set(clip.name, action);
    }
    this.play('idle', 0);
    this.group.visible = true;
    this.isReady = true;
    return this;
  }

  setHeightSampler(callback) {
    this.heightSampler = typeof callback === 'function' ? callback : (() => 0);
  }

  play(name, fade = 0.22) {
    const next = this.actions.get(name) ?? this.actions.get('idle');
    if (!next || next === this.currentAction) return;
    const previous = this.currentAction;
    next.reset().setEffectiveTimeScale(1).setEffectiveWeight(1).play();
    if (previous) previous.crossFadeTo(next, fade, true);
    this.currentAction = next;
    this.currentActionName = name;
  }

  setInteractionPose(active) {
    this.play(active ? 'tablet' : 'idle', 0.28);
  }

  update(delta, input = {}, cameraYaw = 0, obstacles = []) {
    if (!this.isReady) return;
    const dt = Math.min(delta, 0.05);
    this.mixer.update(dt);

    if (input.locked) {
      this.velocity.multiplyScalar(Math.max(0, 1 - this.deceleration * dt));
      return;
    }

    const horizontal = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    const vertical = (input.forward ? 1 : 0) - (input.backward ? 1 : 0);
    const moving = horizontal !== 0 || vertical !== 0;
    const speed = input.run ? this.runSpeed : this.walkSpeed;

    this.forward.set(Math.sin(cameraYaw), 0, Math.cos(cameraYaw));
    this.right.crossVectors(WORLD_UP, this.forward).normalize();
    this.desired.set(0, 0, 0)
      .addScaledVector(this.forward, vertical)
      .addScaledVector(this.right, horizontal);
    if (this.desired.lengthSq() > 1) this.desired.normalize();
    this.desired.multiplyScalar(speed);

    const blend = 1 - Math.exp(-(moving ? this.acceleration : this.deceleration) * dt);
    this.velocity.lerp(this.desired, blend);
    // Finish the braking step decisively. A long sub-centimetre drift made the
    // rig remain in its walk blend after the player had released the controls.
    if (!moving && this.velocity.lengthSq() < 0.16) this.velocity.set(0, 0, 0);

    this._nextPosition.copy(this.group.position).addScaledVector(this.velocity, dt);
    for (const obstacle of obstacles) {
      const dx = this._nextPosition.x - obstacle.x;
      const dz = this._nextPosition.z - obstacle.z;
      const minimum = this.radius + obstacle.radius;
      const distanceSq = dx * dx + dz * dz;
      if (distanceSq < minimum * minimum && distanceSq > 0.00001) {
        const distance = Math.sqrt(distanceSq);
        this._nextPosition.x = obstacle.x + (dx / distance) * minimum;
        this._nextPosition.z = obstacle.z + (dz / distance) * minimum;
      }
    }

    const siteHalfWidth = this.options.siteHalfWidth ?? 34;
    const siteHalfDepth = this.options.siteHalfDepth ?? 27;
    this._nextPosition.x = THREE.MathUtils.clamp(this._nextPosition.x, -siteHalfWidth, siteHalfWidth);
    this._nextPosition.z = THREE.MathUtils.clamp(this._nextPosition.z, -siteHalfDepth, siteHalfDepth);
    this._nextPosition.y = this.heightSampler(this._nextPosition.x, this._nextPosition.z);
    this.group.position.copy(this._nextPosition);

    const flatSpeed = Math.hypot(this.velocity.x, this.velocity.z);
    if (flatSpeed > 0.08) {
      const targetRotation = Math.atan2(this.velocity.x, this.velocity.z);
      const turnBlend = 1 - Math.exp(-this.turnSpeed * dt);
      const turnDelta = THREE.MathUtils.euclideanModulo(
        targetRotation - this.group.rotation.y + Math.PI,
        Math.PI * 2,
      ) - Math.PI;
      this.group.rotation.y = Math.atan2(
        Math.sin(this.group.rotation.y + turnDelta * turnBlend),
        Math.cos(this.group.rotation.y + turnDelta * turnBlend),
      );
      this.play(input.run && flatSpeed > this.walkSpeed * 0.85 ? 'run' : 'walk');
      const nominal = input.run ? this.runSpeed : this.walkSpeed;
      this.currentAction?.setEffectiveTimeScale(THREE.MathUtils.clamp(flatSpeed / nominal, 0.72, 1.2));
    } else if (this.currentActionName !== 'tablet') {
      this.play('idle');
    }
  }

  dispose() {
    this.mixer?.stopAllAction();
    this.group.removeFromParent();
  }
}

export default PlayerCharacter;
