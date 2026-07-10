import * as THREE from 'three';

const WORLD_UP = new THREE.Vector3(0, 1, 0);
const COLLISION_EPSILON = 1e-6;

function pointInsideAabb(point, collider, padding = 0) {
  return point.x >= collider.min.x - padding && point.x <= collider.max.x + padding
    && point.y >= collider.min.y - padding && point.y <= collider.max.y + padding
    && point.z >= collider.min.z - padding && point.z <= collider.max.z + padding;
}

/** Returns the first normalized hit distance on a segment, or null. */
function segmentAabbHit(start, end, collider, padding = 0) {
  let near = 0;
  let far = 1;
  for (const axis of ['x', 'y', 'z']) {
    const direction = end[axis] - start[axis];
    const minimum = collider.min[axis] - padding;
    const maximum = collider.max[axis] + padding;
    if (Math.abs(direction) < COLLISION_EPSILON) {
      if (start[axis] < minimum || start[axis] > maximum) return null;
      continue;
    }
    let first = (minimum - start[axis]) / direction;
    let second = (maximum - start[axis]) / direction;
    if (first > second) [first, second] = [second, first];
    near = Math.max(near, first);
    far = Math.min(far, second);
    if (near > far) return null;
  }
  return near >= 0 && near <= 1 ? near : null;
}

export class ThirdPersonCamera {
  constructor(camera, canvas, options = {}) {
    this.camera = camera;
    this.canvas = canvas;
    this.yaw = options.yaw ?? -2.55;
    this.pitch = options.pitch ?? 0.2;
    this.distance = options.distance ?? 8.4;
    this.minDistance = options.minDistance ?? 3.8;
    this.maxDistance = options.maxDistance ?? 12.5;
    this.targetHeight = options.targetHeight ?? 1.48;
    // The camera orbit and the point it looks at deliberately use different
    // heights. This keeps the character's boots visible above the hotbar while
    // preserving a low, cinematic horizon over the workfront.
    this.focusHeight = options.focusHeight ?? this.targetHeight;
    this.lookAhead = options.lookAhead ?? 3.15;
    this.shoulder = options.shoulder ?? 0.55;
    this.smoothness = options.smoothness ?? 12;
    this.heightSampler = options.heightSampler ?? (() => -100);
    this.collidersProvider = options.collidersProvider ?? (() => []);
    this.collisionRadius = options.collisionRadius ?? 0.3;
    this.collisionPadding = options.collisionPadding ?? 0.24;
    this.minimumCollisionDistance = options.minimumCollisionDistance ?? 1.65;
    this.currentPosition = camera.position.clone();
    this.lastSafePosition = camera.position.clone();
    this.currentTarget = new THREE.Vector3();
    this.desiredPosition = new THREE.Vector3();
    this.desiredTarget = new THREE.Vector3();
    this.anchor = new THREE.Vector3();
    this.collisionCandidate = new THREE.Vector3();
    this.clampedPosition = new THREE.Vector3();
    this.orbitOffset = new THREE.Vector3();
    this.forward = new THREE.Vector3();
    this.right = new THREE.Vector3();
    this.lastCollision = null;
    this.dragging = false;
    this.lastPointer = new THREE.Vector2();
    this.bindEvents();
  }

  bindEvents() {
    this.onPointerDown = (event) => {
      if (event.button !== 0 && event.button !== 2) return;
      this.dragging = true;
      this.lastPointer.set(event.clientX, event.clientY);
      this.canvas.setPointerCapture?.(event.pointerId);
    };
    this.onPointerMove = (event) => {
      if (!this.dragging) return;
      const dx = event.clientX - this.lastPointer.x;
      const dy = event.clientY - this.lastPointer.y;
      this.lastPointer.set(event.clientX, event.clientY);
      this.yaw -= dx * 0.0042;
      this.pitch = THREE.MathUtils.clamp(this.pitch + dy * 0.0032, -0.12, 0.68);
    };
    this.onPointerUp = (event) => {
      this.dragging = false;
      this.canvas.releasePointerCapture?.(event.pointerId);
    };
    this.onWheel = (event) => {
      this.distance = THREE.MathUtils.clamp(this.distance + Math.sign(event.deltaY) * 0.7, this.minDistance, this.maxDistance);
      event.preventDefault();
    };
    this.onContextMenu = (event) => event.preventDefault();
    this.canvas.addEventListener('pointerdown', this.onPointerDown);
    this.canvas.addEventListener('pointermove', this.onPointerMove);
    this.canvas.addEventListener('pointerup', this.onPointerUp);
    this.canvas.addEventListener('pointercancel', this.onPointerUp);
    this.canvas.addEventListener('wheel', this.onWheel, { passive: false });
    this.canvas.addEventListener('contextmenu', this.onContextMenu);
  }

  snap(target) {
    this.computeDesired(target);
    this.currentPosition.copy(this.desiredPosition);
    this.currentTarget.copy(this.desiredTarget);
    this.camera.position.copy(this.currentPosition);
    this.camera.lookAt(this.currentTarget);
  }

  computeDesired(target) {
    this.forward.set(Math.sin(this.yaw), 0, Math.cos(this.yaw));
    this.right.set(this.forward.z, 0, -this.forward.x);
    const anchorY = target.y + this.targetHeight;
    this.anchor.set(target.x, anchorY, target.z);
    this.desiredTarget.set(target.x, target.y + this.focusHeight, target.z).addScaledVector(this.forward, this.lookAhead);
    const horizontalDistance = Math.cos(this.pitch) * this.distance;
    this.desiredPosition.copy(this.anchor)
      .addScaledVector(this.forward, -horizontalDistance)
      .addScaledVector(this.right, this.shoulder);
    this.desiredPosition.y += Math.sin(this.pitch) * this.distance + 1.15;
    const ground = this.heightSampler(this.desiredPosition.x, this.desiredPosition.z);
    this.desiredPosition.y = Math.max(this.desiredPosition.y, ground + 0.52);
    this.resolveCollision();
    const resolvedGround = this.heightSampler(this.desiredPosition.x, this.desiredPosition.z);
    this.desiredPosition.y = Math.max(this.desiredPosition.y, resolvedGround + 0.52);
  }

  nearestCollision(end) {
    const colliders = this.collidersProvider?.() ?? [];
    let nearest = null;
    for (const collider of colliders) {
      if (!collider?.min || !collider?.max) continue;
      // If gameplay places the target inside a volume, that volume must not
      // imprison the camera. Other volumes remain active.
      if (pointInsideAabb(this.anchor, collider, this.collisionRadius)) continue;
      const hit = segmentAabbHit(this.anchor, end, collider, this.collisionRadius);
      if (hit !== null && (!nearest || hit < nearest.hit)) nearest = { hit, collider };
    }
    return nearest;
  }

  pathIsClear(end) {
    return !this.nearestCollision(end);
  }

  resolveCollision() {
    const collision = this.nearestCollision(this.desiredPosition);
    if (!collision) {
      this.lastCollision = null;
      this.lastSafePosition.copy(this.desiredPosition);
      return;
    }

    const fullDistance = this.anchor.distanceTo(this.desiredPosition);
    this.desiredTarget.set(
      this.anchor.x,
      this.anchor.y - 0.25,
      this.anchor.z,
    ).addScaledVector(this.forward, Math.min(this.lookAhead, 0.8));
    const safeDistance = Math.max(0, collision.hit * fullDistance - this.collisionPadding);
    const safeRatio = fullDistance > COLLISION_EPSILON ? safeDistance / fullDistance : 0;
    this.clampedPosition.lerpVectors(this.anchor, this.desiredPosition, safeRatio);

    // When an object is very close behind the avatar, prefer a shoulder orbit
    // instead of collapsing into a first-person camera.
    if (safeDistance < this.minimumCollisionDistance) {
      this.orbitOffset.copy(this.desiredPosition).sub(this.anchor);
      for (const angle of [0.48, -0.48, 0.86, -0.86, 1.18, -1.18, 1.42, -1.42]) {
        this.collisionCandidate.copy(this.orbitOffset)
          .applyAxisAngle(WORLD_UP, angle)
          .add(this.anchor);
        if (this.pathIsClear(this.collisionCandidate)) {
          this.desiredPosition.copy(this.collisionCandidate);
          this.lastSafePosition.copy(this.collisionCandidate);
          this.lastCollision = { tag: collision.collider.tag ?? 'elemento-obra', mode: 'shoulder-orbit' };
          return;
        }
      }

      if (this.anchor.distanceTo(this.lastSafePosition) >= this.minimumCollisionDistance
        && this.pathIsClear(this.lastSafePosition)) {
        this.desiredPosition.copy(this.lastSafePosition);
        this.lastCollision = { tag: collision.collider.tag ?? 'elemento-obra', mode: 'hold-last-safe' };
        return;
      }
    }

    this.desiredPosition.copy(this.clampedPosition);
    this.lastSafePosition.copy(this.clampedPosition);
    this.lastCollision = {
      tag: collision.collider.tag ?? 'elemento-obra',
      mode: 'distance-clamp',
      distance: Number(safeDistance.toFixed(3)),
    };
  }

  update(delta, target) {
    this.computeDesired(target);
    const blend = 1 - Math.exp(-this.smoothness * Math.min(delta, 0.05));
    this.currentPosition.lerp(this.desiredPosition, blend);
    this.currentTarget.lerp(this.desiredTarget, blend * 1.3);
    this.camera.position.copy(this.currentPosition);
    this.camera.lookAt(this.currentTarget);
  }

  dispose() {
    this.canvas.removeEventListener('pointerdown', this.onPointerDown);
    this.canvas.removeEventListener('pointermove', this.onPointerMove);
    this.canvas.removeEventListener('pointerup', this.onPointerUp);
    this.canvas.removeEventListener('pointercancel', this.onPointerUp);
    this.canvas.removeEventListener('wheel', this.onWheel);
    this.canvas.removeEventListener('contextmenu', this.onContextMenu);
  }
}

export default ThirdPersonCamera;
