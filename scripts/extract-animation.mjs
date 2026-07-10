import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, prune, resample } from '@gltf-transform/functions';

const [, , input, output, clipName = 'Animation', sourceClipName] = process.argv;

if (!input || !output) {
  console.error('Uso: node scripts/extract-animation.mjs <entrada.glb> <salida.glb> [nombre] [clip-origen]');
  process.exit(1);
}

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const document = await io.read(input);
const root = document.getRoot();

for (const node of root.listNodes()) {
  node.setMesh(null);
  node.setSkin(null);
  node.setCamera(null);
}

for (const mesh of root.listMeshes()) mesh.dispose();
for (const skin of root.listSkins()) skin.dispose();
for (const material of root.listMaterials()) material.dispose();
for (const texture of root.listTextures()) texture.dispose();

if (sourceClipName) {
  for (const animation of root.listAnimations()) {
    if (animation.getName().toLowerCase() !== sourceClipName.toLowerCase()) animation.dispose();
  }
}

const animations = root.listAnimations();
if (!animations.length) {
  console.error(`El archivo no contiene animaciones: ${input}`);
  process.exit(2);
}

animations.forEach((animation, index) => {
  animation.setName(index === 0 ? clipName : `${clipName}_${index + 1}`);
});

await document.transform(resample(), dedup(), prune({ keepLeaves: true, keepAttributes: false }));
await io.write(output, document);

console.log(`Animación '${clipName}' exportada: ${output}`);
