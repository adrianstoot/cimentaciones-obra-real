import * as THREE from 'three';

function seededRandom(seed) {
  let value = seed >>> 0;
  return () => {
    value = Math.imul(value ^ (value >>> 15), 1 | value);
    value ^= value + Math.imul(value ^ (value >>> 7), 61 | value);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

/** Procedural atmosphere only; it never substitutes visible construction art. */
export class WeatherSystem {
  constructor(scene, renderer, options = {}) {
    this.scene = scene;
    this.renderer = renderer;
    this.options = options;
    this.group = new THREE.Group();
    this.group.name = 'atmospheric-effects';
    this.scene.add(this.group);
    this.mode = 'sunny';
    this.focus = new THREE.Vector3();
    this.time = 0;
    this.createRain();
    this.createDust();
    this.setMode('sunny');
  }

  createRain() {
    const count = this.options.rainCount ?? 1900;
    const positions = new Float32Array(count * 2 * 3);
    const speeds = new Float32Array(count);
    const random = seededRandom(114977);
    for (let i = 0; i < count; i += 1) {
      const x = (random() - 0.5) * 50;
      const y = random() * 24;
      const z = (random() - 0.5) * 42;
      const length = 0.38 + random() * 0.64;
      const index = i * 6;
      positions[index] = x;
      positions[index + 1] = y;
      positions[index + 2] = z;
      positions[index + 3] = x - 0.05;
      positions[index + 4] = y + length;
      positions[index + 5] = z + 0.025;
      speeds[i] = 13 + random() * 10;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const material = new THREE.LineBasicMaterial({
      color: 0xb9d9e9,
      transparent: true,
      opacity: 0.32,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    });
    this.rain = new THREE.LineSegments(geometry, material);
    this.rain.name = 'rain-streak-field';
    this.rain.frustumCulled = false;
    this.rain.userData.speeds = speeds;
    this.group.add(this.rain);
  }

  createDust() {
    const count = this.options.dustCount ?? 650;
    const random = seededRandom(77237);
    const positions = new Float32Array(count * 3);
    const seeds = new Float32Array(count);
    for (let i = 0; i < count; i += 1) {
      positions[i * 3] = (random() - 0.5) * 46;
      positions[i * 3 + 1] = 0.12 + random() * 5.2;
      positions[i * 3 + 2] = (random() - 0.5) * 38;
      seeds[i] = random();
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('seed', new THREE.BufferAttribute(seeds, 1));
    const material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: {
        uTime: { value: 0 },
        uOpacity: { value: 0.1 },
        uColor: { value: new THREE.Color(0xd6b98e) },
      },
      vertexShader: `
        attribute float seed;
        uniform float uTime;
        varying float vAlpha;
        void main() {
          vec3 p = position;
          p.x += sin(uTime * (0.12 + seed * 0.18) + seed * 28.0) * (0.45 + seed);
          p.z += cos(uTime * (0.1 + seed * 0.13) + seed * 19.0) * 0.42;
          p.y += sin(uTime * 0.16 + seed * 35.0) * 0.3;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = clamp((2.0 + seed * 5.0) * (14.0 / -mv.z), 0.6, 4.5);
          vAlpha = 0.28 + seed * 0.48;
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        uniform float uOpacity;
        varying float vAlpha;
        void main() {
          vec2 c = gl_PointCoord - 0.5;
          float falloff = smoothstep(0.5, 0.05, length(c));
          gl_FragColor = vec4(uColor, falloff * vAlpha * uOpacity);
        }
      `,
    });
    this.dust = new THREE.Points(geometry, material);
    this.dust.name = 'subtle-site-dust';
    this.dust.frustumCulled = false;
    this.group.add(this.dust);
  }

  setMode(mode) {
    if (!['sunny', 'overcast', 'rain', 'night'].includes(mode)) throw new RangeError(`Modo meteorológico inválido: ${mode}`);
    this.mode = mode;
    this.rain.visible = mode === 'rain';
    this.dust.visible = mode === 'sunny';
    if (this.scene.fog) {
      const settings = {
        sunny: [0xb8c7cc, 0.0042],
        overcast: [0x8f9da4, 0.008],
        rain: [0x657681, 0.012],
        night: [0x101b27, 0.014],
      }[mode];
      this.scene.fog.color.set(settings[0]);
      this.scene.fog.density = settings[1];
    }
  }

  update(delta, focus) {
    const dt = Math.min(delta, 0.05);
    this.time += dt;
    this.focus.copy(focus ?? this.focus);
    this.group.position.x = this.focus.x;
    this.group.position.z = this.focus.z;
    this.dust.material.uniforms.uTime.value = this.time;
    if (!this.rain.visible) return;
    const positions = this.rain.geometry.attributes.position.array;
    const speeds = this.rain.userData.speeds;
    for (let i = 0; i < speeds.length; i += 1) {
      const index = i * 6;
      const fall = speeds[i] * dt;
      positions[index + 1] -= fall;
      positions[index + 4] -= fall;
      positions[index] -= dt * 1.5;
      positions[index + 3] -= dt * 1.5;
      if (positions[index + 4] < -1.2) {
        const reset = 20 + ((i * 13) % 7);
        const length = positions[index + 4] - positions[index + 1];
        positions[index + 1] = reset;
        positions[index + 4] = reset + length;
      }
    }
    this.rain.geometry.attributes.position.needsUpdate = true;
  }

  dispose() {
    this.rain.geometry.dispose();
    this.rain.material.dispose();
    this.dust.geometry.dispose();
    this.dust.material.dispose();
    this.group.removeFromParent();
  }
}

export default WeatherSystem;
