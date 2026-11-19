import {
  AdditiveBlending, Box3, BoxGeometry, Color, CylinderGeometry, DirectionalLight, Group,
  HemisphereLight, Mesh, MeshStandardMaterial, PlaneGeometry, PointLight, RepeatWrapping,
  ShaderMaterial, SpotLight, SRGBColorSpace, TextureLoader, Vector3,
} from 'three';
import type { BufferGeometry, Material, WebGLRenderer } from 'three';
import type { PanelGeometry } from '../../../../shared/panel';
import { loadRoomFurniture } from './room-furniture';

export const hazeLayer = 1;

const hazeVertex = `
  varying vec3 vNormal;
  varying vec3 vTowardCamera;
  varying vec2 vUv;
  void main() {
    vec4 surface = modelViewMatrix * vec4(position, 1.0);
    vNormal = normalize(normalMatrix * normal);
    vTowardCamera = -surface.xyz;
    vUv = uv;
    gl_Position = projectionMatrix * surface;
  }`;

const hazeFragment = `
  varying vec3 vNormal;
  varying vec3 vTowardCamera;
  varying vec2 vUv;
  void main() {
    float edge = pow(max(0.0, dot(normalize(vNormal), normalize(vTowardCamera))), 1.8);
    float taper = smoothstep(0.03, 0.56, vUv.y) * (1.0 - smoothstep(0.8, 1.0, vUv.y));
    gl_FragColor = vec4(vec3(1.0, 0.66, 0.39), 0.033 * edge * taper);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`;

export function createPanelRoom(
  { width, height }: PanelGeometry,
  renderer: WebGLRenderer,
  render: () => void,
) {
  const scale = Math.max(width / 128, height / 60, .4);
  const unitsPerFoot = 16;
  const widthInRoom = 20 * unitsPerFoot;
  const roomWidth = widthInRoom * scale;
  const depth = 16 * unitsPerFoot;
  const floorY = -4.25 * unitsPerFoot;
  const ceilingY = floorY + 9 * unitsPerFoot;
  const wallHeight = (ceilingY - floorY) * scale;
  const wallMid = (floorY + ceilingY) / 2;
  const wallZ = -3.75;
  const clearance = .45 * unitsPerFoot * scale;
  const cameraBounds = new Box3(
    new Vector3(-roomWidth / 2 + clearance, floorY * scale + clearance, wallZ + clearance),
    new Vector3(roomWidth / 2 - clearance, ceilingY * scale - clearance, wallZ + depth * scale - clearance),
  );
  const room = new Group();
  const geometries = new Set<BufferGeometry>();
  const materials = new Set<Material>();
  const spotlights: SpotLight[] = [];
  let disposed = false;

  function invalidate() {
    if (!disposed) render();
  }

  const loader = new TextureLoader();
  const grain = loader.load('/textures/oak.webp', invalidate);
  const normal = loader.load('/textures/oak-normal.webp', invalidate);
  const carpet = loader.load('/room/carpet.webp', invalidate);
  const carpetNormal = loader.load('/room/carpet-normal.webp', invalidate);
  const textures = [grain, normal, carpet, carpetNormal];
  grain.colorSpace = carpet.colorSpace = SRGBColorSpace;
  const anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  for (const texture of textures) {
    texture.wrapS = texture.wrapT = RepeatWrapping;
    texture.anisotropy = anisotropy;
  }
  for (const texture of [grain, normal]) {
    texture.repeat.set(widthInRoom / 57, wallHeight / (scale * 62));
  }
  for (const texture of [carpet, carpetNormal]) {
    texture.repeat.set(widthInRoom / 26, depth / 26);
  }

  function mesh(geometry: BufferGeometry, material: Material, x: number, y: number, z: number) {
    geometries.add(geometry);
    materials.add(material);
    const object = new Mesh(geometry, material);
    object.position.set(x * scale, y * scale, z * scale + wallZ);
    object.receiveShadow = true;
    room.add(object);
    return object;
  }

  function cylinder(top: number, bottom: number, length: number, open = false) {
    return new CylinderGeometry(top * scale, bottom * scale, length * scale, 32, 1, open);
  }

  const oak = new MeshStandardMaterial({ color: 0xe1bfa1, map: grain, normalMap: normal, roughness: .66 });
  oak.normalScale.set(.6, .6);
  mesh(new PlaneGeometry(roomWidth, wallHeight), oak, 0, wallMid, 0);

  const seam = new MeshStandardMaterial({ color: 0x5d3d2b, roughness: .94 });
  const joint = new PlaneGeometry(.17 * scale, wallHeight);
  for (let x = -widthInRoom / 2 + 8; x < widthInRoom / 2; x += 13.2) {
    mesh(joint, seam, x, wallMid, .014);
  }

  const plaster = new MeshStandardMaterial({ color: 0x2d2b31, roughness: .94 });
  const side = new PlaneGeometry(depth * scale, wallHeight);
  mesh(side, plaster, -widthInRoom / 2, wallMid, depth / 2).rotation.y = Math.PI / 2;
  mesh(side, plaster, widthInRoom / 2, wallMid, depth / 2).rotation.y = -Math.PI / 2;
  mesh(new PlaneGeometry(roomWidth, wallHeight), plaster, 0, wallMid, depth).rotation.y = Math.PI;
  const ceiling = new MeshStandardMaterial({ color: 0x393638, roughness: .97 });
  const slab = new PlaneGeometry(roomWidth, depth * scale);
  mesh(slab, ceiling, 0, ceilingY, depth / 2).rotation.x = Math.PI / 2;
  const flooring = new MeshStandardMaterial({
    color: 0xada397, map: carpet, normalMap: carpetNormal, roughness: .96,
  });
  flooring.normalScale.set(.57, .57);
  mesh(slab, flooring, 0, floorY, depth / 2).rotation.x = -Math.PI / 2;

  const trim = new MeshStandardMaterial({ color: 0x38302b, roughness: .82 });
  mesh(new BoxGeometry(roomWidth, 2 * scale, .7 * scale), trim, 0, floorY + 1, .3);

  const tableHeight = 23;
  const coffeeHeight = 18;
  const rugSurface = floorY + .42;
  const tableX = 61;
  const tableZ = 157;
  const floorLampX = -88;
  const floorLampZ = 113;
  const disposeFurniture = loadRoomFurniture(renderer, room, [
    { name: 'rug', position: [17, floorY + .02, 112], axis: 'x', size: 180 },
    { name: 'sofa', position: [-3, rugSurface, 144], axis: 'x', size: 106, angle: Math.atan2(3, -144) },
    { name: 'sofa', position: [98, rugSurface, 105], axis: 'x', size: 80, angle: Math.atan2(-98, -105) },
    { name: 'floor-lamp', position: [floorLampX, floorY, floorLampZ], axis: 'y', size: 67, angle: .13, glow: .79 },
    { name: 'side-table', position: [tableX, floorY, tableZ], axis: 'y', size: tableHeight, angle: .28 },
    { name: 'table-lamp', position: [tableX, floorY + tableHeight, tableZ], axis: 'y', size: 26, angle: -.18, glow: .74 },
    { name: 'coffee-table', position: [10, rugSurface, 87], axis: 'y', size: coffeeHeight },
    { name: 'vase', position: [21, rugSurface + coffeeHeight, 87], axis: 'y', size: 9, angle: -.3 },
  ], scale, wallZ, () => {
    renderer.shadowMap.needsUpdate = true;
    invalidate();
  });

  const darkMetal = new MeshStandardMaterial({ color: 0x242129, metalness: .57, roughness: .4 });
  const filament = new MeshStandardMaterial({ color: 0xffd3a4, emissive: 0xffb16d, emissiveIntensity: 2.6, roughness: .58 });
  const potRing = cylinder(3.1, 3.1, .8);
  const potLens = cylinder(2.25, 2.25, .2);
  const beamDepth = 60;
  const beamGeometry = cylinder(1.25, 23, beamDepth, true);
  const haze = new ShaderMaterial({
    vertexShader: hazeVertex, fragmentShader: hazeFragment,
    transparent: true, depthWrite: false, blending: AdditiveBlending,
  });
  for (const x of [-56, 0, 56]) {
    const z = 33;
    mesh(potRing, darkMetal, x, ceilingY - .38, z);
    mesh(potLens, filament, x, ceilingY - .88, z);
    const spot = new SpotLight(0xffdcaf, 4850 * scale * scale, 188 * scale, .67, .84, 2);
    spot.position.set(x * scale, (ceilingY - 1.15) * scale, wallZ + z * scale);
    spot.target.position.set(x * .97 * scale, -18 * scale, wallZ + 8 * scale);
    spot.castShadow = x === 0;
    if (spot.castShadow) {
      spot.shadow.mapSize.set(1024, 1024);
      spot.shadow.camera.near = 2 * scale;
      spot.shadow.camera.far = 171 * scale;
      spot.shadow.normalBias = .14 * scale;
      spot.shadow.bias = -.00029;
      spot.shadow.radius = 2.5;
    }
    spotlights.push(spot);
    room.add(spot, spot.target);

    const shaft = mesh(beamGeometry, haze, x, ceilingY - 1.1 - beamDepth / 2, z - 8.6);
    shaft.rotation.x = .283;
    shaft.layers.set(hazeLayer);
    shaft.receiveShadow = false;
  }

  function practical(x: number, y: number, z: number, power: number) {
    const source = new PointLight(0xffbd86, power * scale * scale, 91 * scale, 2);
    source.position.set(x * scale, y * scale, wallZ + z * scale);
    room.add(source);
  }
  practical(floorLampX, floorY + 60, floorLampZ, 970);
  practical(tableX, floorY + tableHeight + 17, tableZ, 550);

  const seatingLight = new SpotLight(0xffe1c5, 4500 * scale * scale, 205 * scale, .64, .93, 2);
  seatingLight.position.set(-38 * scale, (ceilingY - 5) * scale, wallZ + 153 * scale);
  seatingLight.target.position.set(16 * scale, (floorY + 13) * scale, wallZ + 121 * scale);
  seatingLight.castShadow = true;
  seatingLight.shadow.mapSize.set(1024, 1024);
  seatingLight.shadow.camera.near = 2 * scale;
  seatingLight.shadow.camera.far = 192 * scale;
  seatingLight.shadow.normalBias = .13 * scale;
  seatingLight.shadow.bias = -.00023;
  seatingLight.shadow.radius = 3;
  spotlights.push(seatingLight);
  room.add(seatingLight, seatingLight.target);

  room.add(new HemisphereLight(0xbfcbe0, 0x766557, .71));
  const softFill = new DirectionalLight(0xdce7ff, .49);
  softFill.position.set(-75 * scale, 40 * scale, 85 * scale);
  room.add(softFill);
  const roomBounce = new PointLight(0xd4ddf5, 1660 * scale * scale, 178 * scale, 2);
  roomBounce.position.set(35 * scale, 11 * scale, wallZ + 91 * scale);
  room.add(roomBounce);

  const panelSpill = new PointLight(0xffffff, 0, 91 * scale, 2);
  panelSpill.position.set(0, -.16 * height, 10 * scale);
  room.add(panelSpill);

  return {
    room,
    cameraBounds,
    background: new Color(0x19191e),
    scale,
    updatePanelSpill(rgba: Uint8Array) {
      const pixelStep = 4 * Math.max(1, Math.ceil(width * height / 700));
      let red = 0;
      let green = 0;
      let blue = 0;
      let samples = 0;
      for (let i = 0; i < rgba.length; i += pixelStep) {
        red += (rgba[i] / 255) ** 2;
        green += (rgba[i + 1] / 255) ** 2;
        blue += (rgba[i + 2] / 255) ** 2;
        samples++;
      }
      const peak = Math.max(red, green, blue);
      panelSpill.intensity = Math.min(350, 750 * peak / samples) * scale * scale;
      if (peak) panelSpill.color.setRGB(red / peak, green / peak, blue / peak);
    },
    dispose() {
      disposed = true;
      disposeFurniture();
      textures.forEach((texture) => texture.dispose());
      spotlights.forEach((light) => light.shadow.dispose());
      geometries.forEach((geometry) => geometry.dispose());
      materials.forEach((material) => material.dispose());
    },
  };
}
