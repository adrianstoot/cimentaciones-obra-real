import * as THREE from 'three';

const HEAD_OFFSET = 2.08;

/** Screen-space dialogue anchored to the real 3D worker positions. */
export class NPCSpeechBubbles {
  constructor(root, camera, npcs, options = {}) {
    this.root = document.createElement('div');
    this.root.className = 'cor-npc-speech-layer';
    this.root.setAttribute('aria-hidden', 'true');
    root.append(this.root);
    this.camera = camera;
    this.npcs = npcs;
    this.getPlayerPosition = options.getPlayerPosition ?? (() => null);
    this.getPhase = options.getPhase ?? (() => 'briefing');
    this.entries = new Map();
    this.world = new THREE.Vector3();
    this.projected = new THREE.Vector3();
    this.overrideTimers = new Map();
    for (const npc of npcs) this.createEntry(npc);
  }

  createEntry(npc) {
    const data = npc.group.userData.interaction ?? {};
    const bubble = document.createElement('div');
    bubble.className = 'cor-npc-speech';
    bubble.innerHTML = `<span></span><strong></strong><p></p><i></i>`;
    bubble.querySelector('span').textContent = String(data.role ?? 'Profesional de obra').toUpperCase();
    bubble.querySelector('strong').textContent = data.name ?? 'Trabajador';
    bubble.querySelector('p').textContent = data.bubble ?? 'Trabajo coordinado y punto de parada controlado.';
    this.root.append(bubble);
    this.entries.set(npc, bubble);
  }

  speak(object, text, seconds = 5) {
    const entry = [...this.entries.entries()].find(([npc]) => npc.group === object);
    if (!entry) return;
    const [npc, bubble] = entry;
    bubble.querySelector('p').textContent = text;
    bubble.classList.add('is-speaking');
    this.overrideTimers.set(npc, seconds);
  }

  update(delta) {
    const player = this.getPlayerPosition();
    const phase = this.getPhase();
    const candidates = [];
    for (const [npc, bubble] of this.entries) {
      npc.group.getWorldPosition(this.world);
      const distance = player ? Math.hypot(player.x - this.world.x, player.z - this.world.z) : 99;
      this.projected.copy(this.world);
      this.projected.y += HEAD_OFFSET * npc.group.scale.y;
      this.projected.project(this.camera);
      const visible = distance < 15
        && this.projected.z > -1 && this.projected.z < 1
        && Math.abs(this.projected.x) < 1.05 && Math.abs(this.projected.y) < 1.05;
      if (visible) candidates.push({ npc, bubble, distance, x: this.projected.x, y: this.projected.y });
      else bubble.hidden = true;

      const timer = Math.max(0, (this.overrideTimers.get(npc) ?? 0) - delta);
      if (timer > 0) this.overrideTimers.set(npc, timer);
      else {
        this.overrideTimers.delete(npc);
        bubble.classList.remove('is-speaking');
        const data = npc.group.userData.interaction ?? {};
        bubble.querySelector('p').textContent = data.phaseLines?.[phase] ?? data.bubble ?? 'Listo para coordinar el tajo.';
      }
    }

    candidates.sort((a, b) => a.distance - b.distance);
    candidates.forEach((candidate, index) => {
      const show = index < 4;
      candidate.bubble.hidden = !show;
      if (!show) return;
      candidate.bubble.style.transform = `translate3d(${(candidate.x * 0.5 + 0.5) * innerWidth}px, ${(-candidate.y * 0.5 + 0.5) * innerHeight}px, 0) translate(-50%, -100%)`;
      candidate.bubble.style.setProperty('--distance', String(candidate.distance));
      candidate.bubble.classList.toggle('is-near', candidate.distance < 5.5);
    });
  }

  dispose() {
    this.entries.clear();
    this.overrideTimers.clear();
    this.root.remove();
  }
}

export default NPCSpeechBubbles;
