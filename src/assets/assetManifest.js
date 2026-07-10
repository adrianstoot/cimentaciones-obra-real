/**
 * Catalogo runtime de activos visuales.
 *
 * La fuente de verdad legal y de integridad completa esta en
 * /assets/licenses/registry.json. Los activos no verificados pueden usarse
 * durante desarrollo local, pero no deben superar la puerta de publicacion.
 */

export const LICENSE_REGISTRY_URL = '/assets/licenses/registry.json';

const CC0 = Object.freeze({
  id: 'CC0-1.0',
  status: 'verified',
  redistribution: 'permitted',
  publicationAllowed: true,
});

const UNVERIFIED = Object.freeze({
  id: 'LicenseRef-UNVERIFIED',
  status: 'unverified',
  redistribution: 'blocked_pending_review',
  publicationAllowed: false,
});

const THREE_ASSET_REVIEW = Object.freeze({
  id: 'LicenseRef-THREEJS-ASSET-REVIEW',
  status: 'review_required',
  redistribution: 'blocked_pending_review',
  publicationAllowed: false,
});

const freezeEntries = (entries) => Object.freeze(
  Object.fromEntries(entries.map((entry) => [entry.key, Object.freeze(entry)])),
);

export const CHARACTERS = freezeEntries([
  {
    key: 'workerCh17',
    id: 'character.worker_ch17',
    label: 'Obrero de construccion Ch17',
    url: '/assets/characters/worker_ch17.glb',
    bytes: 53494772,
    sha256: 'bdc89aa469c14adced67302a0a81bdc08fc837a1216a41695b7566b2cd065ef2',
    source: 'C:/Users/Adrian/Downloads/PERSONAJES/Ch17_nonPBR.fbx',
    rig: 'mixamo-compatible',
    animated: true,
    license: UNVERIFIED,
  },
]);

export const ANIMATIONS = freezeEntries([
  {
    key: 'localIdle',
    id: 'animation.local_idle',
    label: 'Idle local',
    url: '/assets/characters/animations/idle.glb',
    bytes: 184876,
    sha256: '84cb85a479944b5c896b3c7d823ba035c68123480763552bbf3d308eb1cfdc94',
    source: 'C:/Users/Adrian/Downloads/PERSONAJES/Idle.fbx',
    targetRig: 'mixamo-compatible',
    license: UNVERIFIED,
  },
  {
    key: 'locomotionIdle',
    id: 'animation.locomotion_idle',
    label: 'Locomocion: reposo',
    url: '/assets/characters/animations/locomotion_idle.glb',
    bytes: 268536,
    sha256: 'b124a4e4431c17a30fe4c4e22c6f1326ebebf0abf84afae65df6ad05985f13bd',
    source: 'https://github.com/mrdoob/three.js/blob/dev/examples/models/gltf/Soldier.glb',
    sourceClip: 'Idle',
    targetRig: 'mixamo-compatible',
    license: THREE_ASSET_REVIEW,
  },
  {
    key: 'walk',
    id: 'animation.walk',
    label: 'Locomocion: caminar',
    url: '/assets/characters/animations/walk.glb',
    bytes: 323656,
    sha256: '4cadb5df1514654eda6cdf811c9b80ec594b5112c532c17b0e890e08e4351afe',
    source: 'https://github.com/mrdoob/three.js/blob/dev/examples/models/gltf/Soldier.glb',
    sourceClip: 'Walk',
    targetRig: 'mixamo-compatible',
    license: THREE_ASSET_REVIEW,
  },
  {
    key: 'run',
    id: 'animation.run',
    label: 'Locomocion: correr',
    url: '/assets/characters/animations/run.glb',
    bytes: 335268,
    sha256: '4aded4b441b1390de887295413c9b81e2dfa9538102ba145cb7af49e023f8473',
    source: 'https://github.com/mrdoob/three.js/blob/dev/examples/models/gltf/Soldier.glb',
    sourceClip: 'Run',
    targetRig: 'mixamo-compatible',
    license: THREE_ASSET_REVIEW,
  },
  {
    key: 'tablet',
    id: 'animation.tablet',
    label: 'Trabajo con tablet',
    url: '/assets/characters/animations/Tablet.glb',
    bytes: 210132,
    sha256: '12facce32a534b8ed759ead4ed5fb602a79cfaadaa772b446cdb92e403d2aacb',
    source: 'C:/Users/Adrian/Downloads/PERSONAJES/Working On Device.fbx',
    targetRig: 'mixamo-compatible',
    license: UNVERIFIED,
  },
  {
    key: 'idleCh17',
    id: 'animation.idle_ch17',
    label: 'Idle nativo para Ch17',
    url: '/assets/characters/animations/idle_ch17.glb',
    bytes: 83616,
    sha256: '7e309eba0ee91f8fa99c41b6289b39b5cfeb58b387e29339e369128b9364c5f5',
    source: 'C:/Users/Adrian/Downloads/PERSONAJES/Idle2.fbx',
    targetRig: 'workerCh17',
    license: UNVERIFIED,
  },
  {
    key: 'putdownCh17',
    id: 'animation.putdown_ch17',
    label: 'Depositar objeto para Ch17',
    url: '/assets/characters/animations/putdown_ch17.glb',
    bytes: 209296,
    sha256: '21f293afa787ad1933f181d56b482194ba6b655562ab483668ca86f421a65a55',
    source: 'C:/Users/Adrian/Downloads/PERSONAJES/Putting Down.fbx',
    targetRig: 'workerCh17',
    license: UNVERIFIED,
  },
]);

export const RETARGET_SOURCES = freezeEntries([
  {
    key: 'soldierSource',
    id: 'retarget.soldier_source',
    label: 'Soldier: rig fuente invisible para retarget',
    url: '/assets/characters/retarget/soldier_source.glb',
    bytes: 2160468,
    sha256: 'dfb230fc1f942f259dd00281a1186953ad602fc5d69067ce63e24b2aa439736b',
    source: 'https://github.com/mrdoob/three.js/blob/dev/examples/models/gltf/Soldier.glb',
    usage: 'runtime-retarget-source-invisible',
    visible: false,
    license: THREE_ASSET_REVIEW,
  },
]);

export const HDRIS = freezeEntries([
  {
    key: 'constructionYard',
    id: 'hdri.construction_yard',
    label: 'Construction Yard 4K',
    url: '/assets/hdri/construction_yard_4k.hdr',
    bytes: 25931071,
    sha256: '27e08198716e17bbad91bfa3d8d6f4dc60a1585223aacf703528f4924d44b6ee',
    resolution: '4k',
    source: 'https://polyhaven.com/a/construction_yard',
    license: CC0,
  },
  {
    key: 'germanTownStreet',
    id: 'hdri.german_town_street',
    label: 'German Town Street 4K',
    url: '/assets/hdri/german_town_street_4k.hdr',
    bytes: 25613588,
    sha256: '544a9c4d1192d06bad891fc00a843e10f4a9e62c2759c239ec72d0473c33cefc',
    resolution: '4k',
    source: 'https://polyhaven.com/a/german_town_street',
    downloadUrl: 'https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/4k/german_town_street_4k.hdr',
    provenance: 'Descarga directa del CDN oficial de Poly Haven; archivo sin conversion ni recompresion.',
    license: CC0,
  },
]);

export const MACHINERY = freezeEntries([
  {
    key: 'roughTerrainCrane',
    id: 'machinery.rough_terrain_crane',
    label: 'Grua movil todoterreno',
    url: '/assets/machinery/rough_terrain_crane.glb',
    bytes: 9906772,
    sha256: '2e0254ada877582c70cd369838e33da3797b1271317ac284bed385ac0a294d75',
    source: 'C:/Users/Adrian/Downloads/source/Rough-Terrain Crane.glb',
    license: UNVERIFIED,
  },
  {
    key: 'lr1300Crane',
    id: 'machinery.lr1300_crane',
    label: 'Grua de celosia LR 1300',
    url: '/assets/machinery/lr1300_crane.glb',
    bytes: 1519144,
    sha256: '028014b18526a8971b0d5fb291e360ae6bf25274f916674074d1dc6c52732e27',
    source: 'C:/Users/Adrian/Downloads/source/LR 1300.glb',
    license: UNVERIFIED,
  },
]);

const polyHavenProp = (key, label, bytes, sha256) => ({
  key,
  id: `prop.${key}`,
  label,
  url: `/assets/props/${key}/${key}.glb`,
  bytes,
  sha256,
  resolution: '2k',
  source: `https://polyhaven.com/a/${key}`,
  sourceDirectory: `/assets/props/${key}/_source/`,
  license: CC0,
});

export const PROPS = freezeEntries([
  polyHavenProp('barrel_03', 'Barril metalico', 2080348, 'db9fe6ce833bc0edbd76183abd909c40e648c2bc2632e582fae049b69db70b06'),
  polyHavenProp('cardboard_box_01', 'Caja de carton', 6686712, 'fae0a27876310df94b53af53ce6af23f0467ee3abb88321ae196f12048077c1e'),
  polyHavenProp('cement_bag', 'Saco de cemento', 5595620, '080f7bb6a7cf0c7d7320f29588fc5dc69ad3951973a282c2334129914300bfc5'),
  polyHavenProp('concrete_road_barrier', 'Barrera de hormigon', 10969356, '1247726f47d1f2131347ff878c8cdbc7fdf4321adad05a3fd6e614596634156b'),
  polyHavenProp('hand_truck', 'Carretilla de transporte', 10897736, '8eee69b9f81ba992915038f3b76821aa01da667af088df5e57010a35e86a7c6a'),
  polyHavenProp('ladder_sectioned_01', 'Escalera seccionada', 6676004, '437ff700969862e3bd79f9aa470123237b0c29185a08e9785d75f0b0e8259df2'),
  polyHavenProp('metal_jerrycan', 'Bidon metalico', 10586168, 'ab6a93849ff911d7a18364a06b28472f87ac66c33281837918832ca8b7a7fbd6'),
  polyHavenProp('metal_toolbox', 'Caja de herramientas metalica', 10116672, 'b3489df892f56866d738e2886b3668ee4a12ea3723954e58de29052ae8d26089'),
  polyHavenProp('modular_chainlink_fence', 'Vallado metalico modular', 16200928, 'ae12a92fabc75acdf76a4749faeea218a44f4ec46443cff3f0273cad2807536a'),
  polyHavenProp('modular_wooden_pier', 'Estructura modular de madera', 23049192, '4b67f0574e94cf294c2062b0ff7e19da30d48aad83000b999e7058fb1bec8929'),
  polyHavenProp('portable_generator', 'Generador portatil', 12451684, 'cab2c3f00b68b44d08d19e37011ac9ab2a03c372a54643c1bd5b1af53331cfca'),
  polyHavenProp('wooden_ladder', 'Escalera de madera', 8917168, '93b3725a1075b2fc8da814fad7e94b5084ed1e17a32616c3082c235bbaef5e7f'),
  polyHavenProp('concrete_road_barrier_02', 'Barrera de hormigon 02', 9831444, '79b92ab7e357a2b51b132a9f37704e6288974a58e95cf5a6582824348df94e18'),
  polyHavenProp('modular_electric_cables', 'Cables electricos modulares', 17621604, 'd94ef50b0c6858de5fbe7bec05b3df69ab1fb67ccd5b7c85fb1a1ac0e7d7fc03'),
  polyHavenProp('modular_industrial_pipes_01', 'Tuberias industriales modulares 01', 16610512, '241be4ebfee4f60c166d2d2fcc71864d6e8d9189e311d1f0127e11d72f6c51fd'),
  polyHavenProp('metal_tool_chest', 'Arcon metalico de herramientas', 7742340, '7711830c8fa8062e7ba5e6c684f290efb482e7446635dd14b7b8bb4f875cde86'),
  polyHavenProp('tool_cart', 'Carro de herramientas', 9836792, '521cb2e8df8ead08a8a419c466a9a5ee13320ae0fdf39f7709ca23fe4b62525b'),
  polyHavenProp('steel_frame_shelves_01', 'Estanterias de acero 01', 5567948, 'bbc7db5777547fcaa82314324a5be0ec1961d6d7f15aa062fe2fdbd1d1e7ee6c'),
  polyHavenProp('wooden_crate_01', 'Caja de madera 01', 8283544, '65ac700acea5a84217bba6a056462d6247764d49f6ed6db54e82742af003d414'),
]);

const textureMap = (url, bytes, sha256) => Object.freeze({ url, bytes, sha256 });

const concreteBase = '/assets/textures/Concrete044C';
const ground094aBase = '/assets/textures/Ground094A';
const gravelBase = '/assets/textures/Gravel023';
const metalBase = '/assets/textures/Metal055C';

export const TEXTURES = freezeEntries([
  {
    key: 'concrete044c',
    id: 'texture.concrete044c',
    label: 'Concrete044C PBR 4K',
    resolution: '4k',
    source: 'https://ambientcg.com/view?id=Concrete044C',
    sourceBundleSha256: '7f426fda11ceb30b89814cbb5e9a9448cc52b6423821b1d9bcc6ca3e60d54312',
    maps: Object.freeze({
      preview: textureMap(`${concreteBase}/Concrete044C.png`, 364186, '98f8582518bd2b0101ca2fd90d73bee6a62b4cf33ce9ef1ca8b66383fcf439a0'),
      ambientOcclusion: textureMap(`${concreteBase}/Concrete044C_4K-JPG_AmbientOcclusion.jpg`, 10193725, '94ed661371f725a2350829e9ad78bfadcefd1beae755cc0ebb968f68a8c845e4'),
      color: textureMap(`${concreteBase}/Concrete044C_4K-JPG_Color.jpg`, 15701682, '9c9de8261c03ab35e79119756ba938822fb8381d10d3439f8119e08f8396b34b'),
      displacement: textureMap(`${concreteBase}/Concrete044C_4K-JPG_Displacement.jpg`, 5736494, 'c2eca74c2d9b77e6711f1ad61dfe295d92e4abb3cc16088a29589e0373a17335'),
      metalness: textureMap(`${concreteBase}/Concrete044C_4K-JPG_Metalness.jpg`, 66667, '2550525805020660416989e6bf367042cf7677e3ffbac999aafa13c80e9676a6'),
      normalDx: textureMap(`${concreteBase}/Concrete044C_4K-JPG_NormalDX.jpg`, 34488862, '243753ef14fb0f4092b46969be705a59a906dabb7d2366ac07903d73c025a109'),
      normalGl: textureMap(`${concreteBase}/Concrete044C_4K-JPG_NormalGL.jpg`, 34492018, 'c304785832160fed628c94daf76040ae628edefb997124255a99a847facff908'),
      roughness: textureMap(`${concreteBase}/Concrete044C_4K-JPG_Roughness.jpg`, 12500712, 'd21cd302ac8a4688f9545d78883567766d5ec4027af6dd231109449debb9468e'),
    }),
    authoringFiles: Object.freeze([
      `${concreteBase}/Concrete044C_4K-JPG.blend`,
      `${concreteBase}/Concrete044C_4K-JPG.mtlx`,
      `${concreteBase}/Concrete044C_4K-JPG.tres`,
      `${concreteBase}/Concrete044C_4K-JPG.usdc`,
    ]),
    license: CC0,
  },
  {
    key: 'ground094a',
    id: 'texture.ground094a',
    label: 'Ground094A PBR 4K',
    resolution: '4k',
    source: 'https://ambientcg.com/view?id=Ground094A',
    downloadUrl: 'https://ambientcg.com/get?file=Ground094A_4K-JPG.zip',
    provenance: 'ZIP oficial 4K-JPG; cinco mapas runtime extraidos sin conversion.',
    sourceBundleSha256: 'e9d7f8b795f71251760d474a26fd7e6c4cd6bc9f3d948c0d16681fd489b804b0',
    maps: Object.freeze({
      ambientOcclusion: textureMap(`${ground094aBase}/Ground094A_4K-JPG_AmbientOcclusion.jpg`, 3758770, 'a005f64e91b049f281655bd38d8c4851f4150a5131a7771dbb3941807c22571b'),
      color: textureMap(`${ground094aBase}/Ground094A_4K-JPG_Color.jpg`, 13186571, 'd5797e6e2ebaac15a32b94954b796ab66dfa7110cc746972064ccb9894d1f0e1'),
      displacement: textureMap(`${ground094aBase}/Ground094A_4K-JPG_Displacement.jpg`, 3323220, 'd2185e2ab265714937d79a2203421bc5ea9b8e361084a822d0f68304f08d959c'),
      normalGl: textureMap(`${ground094aBase}/Ground094A_4K-JPG_NormalGL.jpg`, 24106448, 'e973e13d6fa4c35ced2334f595c50df89c2b8703ca9ea096220ca58f3869631b'),
      roughness: textureMap(`${ground094aBase}/Ground094A_4K-JPG_Roughness.jpg`, 13088125, '0e1424f0655cd68dd7abe3ad6679cb7c47c52631be560825ae41be6b9c4f6b0c'),
    }),
    license: CC0,
  },
  {
    key: 'gravel023',
    id: 'texture.gravel023',
    label: 'Gravel023 PBR 4K',
    resolution: '4k',
    source: 'https://ambientcg.com/view?id=Gravel023',
    sourceBundleSha256: 'c89a65685ca9992d5c556c43afa9268012bde441c8b644fda437047844155baf',
    maps: Object.freeze({
      preview: textureMap(`${gravelBase}/Gravel023.png`, 457025, '79e10fd2fb59d1927563e7245f3f5076d6299a2811ac2071d792b58dd6be7989'),
      ambientOcclusion: textureMap(`${gravelBase}/Gravel023_4K-JPG_AmbientOcclusion.jpg`, 10714616, '6d4e6215bfa28eb6d2172b07537ea639312de8293fa62ea069cd672bc5db4004'),
      color: textureMap(`${gravelBase}/Gravel023_4K-JPG_Color.jpg`, 14829261, 'bf5394642b5199cda6a63dd08c7408fbb0a090fbe08f62db0c27346465581f68'),
      displacement: textureMap(`${gravelBase}/Gravel023_4K-JPG_Displacement.jpg`, 6034014, '6324df8976ca436ba2d4eebe85077a84fd39d0083a324c78a963d75ef143defb'),
      normalDx: textureMap(`${gravelBase}/Gravel023_4K-JPG_NormalDX.jpg`, 35114013, 'a3cebeea717cda2f807859e6f8b1f78b2fa695af99168c668490c9ad5cf9f4af'),
      normalGl: textureMap(`${gravelBase}/Gravel023_4K-JPG_NormalGL.jpg`, 35042224, 'fc73ce36a3e4cc758bbd657ae1154aa2d4333d45cca147c601ef02cb1143821c'),
      roughness: textureMap(`${gravelBase}/Gravel023_4K-JPG_Roughness.jpg`, 6367245, 'c4900e32385d0c096acc9bd255f1f8bff3b5cc65402a746eafc5a80035c832ff'),
    }),
    authoringFiles: Object.freeze([
      `${gravelBase}/Gravel023_4K-JPG.blend`,
      `${gravelBase}/Gravel023_4K-JPG.mtlx`,
      `${gravelBase}/Gravel023_4K-JPG.tres`,
      `${gravelBase}/Gravel023_4K-JPG.usdc`,
    ]),
    license: CC0,
  },
  {
    key: 'metal055c',
    id: 'texture.metal055c',
    label: 'Metal055C PBR 4K',
    resolution: '4k',
    source: 'https://ambientcg.com/view?id=Metal055C',
    sourceBundleSha256: 'e716a118e3d3fbe920f3de76ae667dd76192175c11f48c8b9c38b8202aa183ad',
    maps: Object.freeze({
      preview: textureMap(`${metalBase}/Metal055C.png`, 391715, '33d8823722fb14176dc607b934741a44c1ece1bc16f3be5b9091fbc1f2c86117'),
      color: textureMap(`${metalBase}/Metal055C_4K-JPG_Color.jpg`, 19431449, '26617605319287284264f9fe34be3bc1425bd0fa65b9a6ae729b0273253137b9'),
      displacement: textureMap(`${metalBase}/Metal055C_4K-JPG_Displacement.jpg`, 4233576, 'c97117936fc6aeb23b75a92047907338eb85464f2c74be92200293e3abbbe2c0'),
      metalness: textureMap(`${metalBase}/Metal055C_4K-JPG_Metalness.jpg`, 3016383, '462208ad0f60d07a7fd5589e705f4e84233742a136aeb88874609d5660a619f0'),
      normalDx: textureMap(`${metalBase}/Metal055C_4K-JPG_NormalDX.jpg`, 17214499, '575587178bb8e4825d9896657d454483b986a86b09157fcd7dcc26fc3988e160'),
      normalGl: textureMap(`${metalBase}/Metal055C_4K-JPG_NormalGL.jpg`, 17144270, '8a5779c67a71b4ccf86289a1bf9f0c18e4e0522b1ce33b0cdf264bbb80d26f47'),
      roughness: textureMap(`${metalBase}/Metal055C_4K-JPG_Roughness.jpg`, 8827107, '5da9077f0b5e606ecee99b6f707914187891bc13b2e6dadb3db3821206f66dea'),
    }),
    authoringFiles: Object.freeze([
      `${metalBase}/Metal055C_4K-JPG.blend`,
      `${metalBase}/Metal055C_4K-JPG.mtlx`,
      `${metalBase}/Metal055C_4K-JPG.tres`,
      `${metalBase}/Metal055C_4K-JPG.usdc`,
    ]),
    license: CC0,
  },
]);

export const ASSET_MANIFEST = Object.freeze({
  characters: CHARACTERS,
  animations: ANIMATIONS,
  retargetSources: RETARGET_SOURCES,
  hdri: HDRIS,
  machinery: MACHINERY,
  props: PROPS,
  textures: TEXTURES,
});

export const ALL_ASSETS = Object.freeze(
  Object.values(ASSET_MANIFEST).flatMap((group) => Object.values(group)),
);

export const PUBLICATION_BLOCKED_ASSET_IDS = Object.freeze(
  ALL_ASSETS
    .filter((asset) => asset.license?.publicationAllowed === false)
    .map((asset) => asset.id),
);

export function findAssetById(id) {
  return ALL_ASSETS.find((asset) => asset.id === id) ?? null;
}

export default ASSET_MANIFEST;
