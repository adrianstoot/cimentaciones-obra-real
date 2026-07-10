import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { clone as cloneSkeleton } from 'three/addons/utils/SkeletonUtils.js';
import { assetPath } from './assetPath.js';

/**
 * Centraliza carga, caché y configuración física de materiales. Los activos
 * visibles siempre proceden de GLB/PBR; las formas de colisión permanecen
 * separadas y no se renderizan.
 */
export class AssetManager {
  constructor(renderer) {
    this.renderer = renderer;
    this.gltfLoader = new GLTFLoader();
    this.textureLoader = new THREE.TextureLoader();
    this.rgbeLoader = new RGBELoader();
    this.pmrem = new THREE.PMREMGenerator(renderer);
    this.pmrem.compileEquirectangularShader();
    this.cache = new Map();
    this.maxAnisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 16);
  }

  async loadGLTF(url) {
    const resolvedUrl = assetPath(url);
    if (!this.cache.has(resolvedUrl)) {
      this.cache.set(resolvedUrl, this.gltfLoader.loadAsync(resolvedUrl).then((gltf) => {
        this.prepareObject(gltf.scene);
        return gltf;
      }));
    }
    return this.cache.get(resolvedUrl);
  }

  async instantiate(url, { skeleton = false } = {}) {
    const gltf = await this.loadGLTF(url);
    const object = skeleton ? cloneSkeleton(gltf.scene) : gltf.scene.clone(true);
    this.prepareObject(object);
    return { object, animations: gltf.animations.map((clip) => clip.clone()) };
  }

  prepareObject(root) {
    root.traverse((node) => {
      if (!node.isMesh) return;
      node.castShadow = true;
      node.receiveShadow = true;
      node.frustumCulled = true;
      const materials = Array.isArray(node.material) ? node.material : [node.material];
      for (const material of materials) {
        if (!material) continue;
        for (const key of ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap']) {
          if (material[key]) material[key].anisotropy = this.maxAnisotropy;
        }
        if (material.map) material.map.colorSpace = THREE.SRGBColorSpace;
        material.envMapIntensity = Math.max(material.envMapIntensity ?? 1, 1.05);
      }
    });
    return root;
  }

  async loadTexture(url, { color = false, repeat = [1, 1], flipY = true } = {}) {
    const resolvedUrl = assetPath(url);
    const cacheKey = `texture:${resolvedUrl}:${color}:${repeat.join(',')}:${flipY}`;
    if (!this.cache.has(cacheKey)) {
      this.cache.set(cacheKey, this.textureLoader.loadAsync(resolvedUrl).then((texture) => {
        texture.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace;
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(...repeat);
        texture.flipY = flipY;
        texture.anisotropy = this.maxAnisotropy;
        texture.needsUpdate = true;
        return texture;
      }));
    }
    return this.cache.get(cacheKey);
  }

  async loadPBRSet(textureEntry, { repeat = [1, 1], displacementScale = 0 } = {}) {
    const maps = textureEntry.maps;
    const [map, normalMap, roughnessMap, aoMap, displacementMap, metalnessMap] = await Promise.all([
      this.loadTexture(maps.color.url, { color: true, repeat }),
      this.loadTexture(maps.normalGL.url, { repeat }),
      this.loadTexture(maps.roughness.url, { repeat }),
      maps.ambientOcclusion ? this.loadTexture(maps.ambientOcclusion.url, { repeat }) : null,
      maps.displacement ? this.loadTexture(maps.displacement.url, { repeat }) : null,
      maps.metalness ? this.loadTexture(maps.metalness.url, { repeat }) : null,
    ]);
    return {
      map,
      normalMap,
      roughnessMap,
      aoMap,
      displacementMap,
      displacementScale,
      metalnessMap,
    };
  }

  async applyEnvironment(scene, url, options = {}) {
    const hdr = await this.rgbeLoader.loadAsync(assetPath(url));
    hdr.mapping = THREE.EquirectangularReflectionMapping;
    const environment = this.pmrem.fromEquirectangular(hdr).texture;
    scene.environment = environment;
    scene.environmentIntensity = options.environmentIntensity ?? 0.82;
    scene.environmentRotation.y = options.rotationY ?? 0;
    if (options.background !== false) {
      scene.background = hdr;
      scene.backgroundIntensity = options.backgroundIntensity ?? 0.5;
      scene.backgroundBlurriness = options.backgroundBlurriness ?? 0.08;
      scene.backgroundRotation.y = options.rotationY ?? 0;
    }
    return { hdr, environment };
  }

  fitToSize(object, targetSize, axis = 'max') {
    const box = new THREE.Box3().setFromObject(object);
    const size = box.getSize(new THREE.Vector3());
    const current = axis === 'x' || axis === 'y' || axis === 'z'
      ? size[axis]
      : Math.max(size.x, size.y, size.z);
    if (current > 0) object.scale.multiplyScalar(targetSize / current);
    return this.ground(object);
  }

  ground(object, y = 0) {
    object.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(object);
    object.position.y += y - box.min.y;
    object.updateMatrixWorld(true);
    return object;
  }

  dispose() {
    this.pmrem.dispose();
    for (const promise of this.cache.values()) {
      Promise.resolve(promise).then((asset) => {
        const root = asset?.scene ?? asset;
        root?.traverse?.((node) => {
          if (!node.isMesh) return;
          node.geometry?.dispose?.();
          const materials = Array.isArray(node.material) ? node.material : [node.material];
          materials.forEach((material) => material?.dispose?.());
        });
        if (asset?.isTexture) asset.dispose();
      }).catch(() => {});
    }
    this.cache.clear();
  }
}

export default AssetManager;
