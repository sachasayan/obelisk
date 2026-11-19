import { Box3, Group, LoadingManager, Mesh, MeshStandardMaterial, Texture, Vector3 } from 'three';
import type { BufferGeometry, Material, Object3D, WebGLRenderer } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import basisScriptUrl from 'three/addons/libs/basis/basis_transcoder.js?url';
import basisWasmUrl from 'three/addons/libs/basis/basis_transcoder.wasm?url';

interface Furniture {
  name: string;
  position: [x: number, y: number, z: number];
  size: number;
  axis: 'x' | 'y';
  angle?: number;
  glow?: number;
}

function disposeModel(model: Object3D) {
  const geometries = new Set<BufferGeometry>();
  const materials = new Set<Material>();
  const textures = new Set<Texture>();
  model.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    geometries.add(object.geometry);
    for (const material of [object.material].flat()) {
      materials.add(material);
      for (const value of Object.values(material)) {
        if (value instanceof Texture) textures.add(value);
      }
    }
  });
  geometries.forEach((geometry) => geometry.dispose());
  materials.forEach((material) => material.dispose());
  textures.forEach((texture) => texture.dispose());
}

export function loadRoomFurniture(
  renderer: WebGLRenderer,
  room: Group,
  placements: readonly Furniture[],
  scale: number,
  wallZ: number,
  onLoaded: () => void,
) {
  let disposed = false;
  const models: Group[] = [];
  const manager = new LoadingManager();
  manager.setURLModifier((url) => {
    if (url === '/room/basis_transcoder.js') return basisScriptUrl;
    if (url === '/room/basis_transcoder.wasm') return basisWasmUrl;
    return url;
  });
  // Three also ships these files for unbundled use. Resolve their build URLs locally.
  const textures = new KTX2Loader(manager).setTranscoderPath('/room/').setWorkerLimit(2).detectSupport(renderer);
  const loader = new GLTFLoader().setKTX2Loader(textures).setMeshoptDecoder(MeshoptDecoder);

  const loads = placements.map(async ({ name, position, size, axis, angle = 0, glow }) => {
    try {
      const { scene: model } = await loader.loadAsync(`/room/${name}.glb`);
      if (disposed) {
        disposeModel(model);
        return;
      }

      const bounds = new Box3().setFromObject(model);
      const center = bounds.getCenter(new Vector3());
      const factor = size * scale / bounds.getSize(new Vector3())[axis];
      model.scale.setScalar(factor);
      model.position.set(-center.x * factor, -bounds.min.y * factor, -center.z * factor);
      model.traverse((object) => {
        if (!(object instanceof Mesh)) return;
        object.castShadow = name !== 'rug';
        object.receiveShadow = true;
        if (glow === undefined) return;

        for (const material of [object.material].flat()) {
          if (material instanceof MeshStandardMaterial && material.emissiveMap) {
            material.emissive.set(0xffc99b);
            material.emissiveIntensity = glow;
          }
        }
      });

      const [x, y, z] = position;
      const anchor = new Group();
      anchor.position.set(x * scale, y * scale, wallZ + z * scale);
      anchor.rotation.y = angle;
      anchor.add(model);
      room.add(anchor);
      models.push(model);
      onLoaded();
    } catch (error) {
      if (!disposed) console.warn(`Unable to load the 3D room's ${name} model.`, error);
    }
  });
  void Promise.all(loads).finally(() => textures.dispose());

  return () => {
    disposed = true;
    models.forEach(disposeModel);
  };
}
