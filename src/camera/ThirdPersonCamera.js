import * as THREE from 'three';

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
    this.currentPosition = camera.position.clone();
    this.currentTarget = new THREE.Vector3();
    this.desiredPosition = new THREE.Vector3();
    this.desiredTarget = new THREE.Vector3();
    this.forward = new THREE.Vector3();
    this.right = new THREE.Vector3();
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
    this.desiredTarget.set(target.x, target.y + this.focusHeight, target.z).addScaledVector(this.forward, this.lookAhead);
    const horizontalDistance = Math.cos(this.pitch) * this.distance;
    this.desiredPosition.set(target.x, anchorY, target.z)
      .addScaledVector(this.forward, -horizontalDistance)
      .addScaledVector(this.right, this.shoulder);
    this.desiredPosition.y += Math.sin(this.pitch) * this.distance + 1.15;
    const ground = this.heightSampler(this.desiredPosition.x, this.desiredPosition.z);
    this.desiredPosition.y = Math.max(this.desiredPosition.y, ground + 0.52);
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
