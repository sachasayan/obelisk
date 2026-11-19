import {
  AdditiveBlending, BoxGeometry, Color, CylinderGeometry, DirectionalLight, DoubleSide,
  Group, HemisphereLight, Mesh, MeshStandardMaterial, PlaneGeometry, PointLight,
  RepeatWrapping, ShaderMaterial, SpotLight, SRGBColorSpace, TextureLoader,
} from 'three';
import type { BufferGeometry, Material } from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import type { PanelGeometry } from '../../../../shared/panel';

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
    float edge = pow(max(0.0, dot(normalize(vNormal), normalize(vTowardCamera))), 1.6);
    float taper = smoothstep(0.03, 0.56, vUv.y) * (1.0 - smoothstep(0.88, 1.0, vUv.y));
    gl_FragColor = vec4(vec3(1.0, 0.61, 0.29), 0.072 * edge * taper);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`;

export function createPanelRoom({ width, height }: PanelGeometry, anisotropy: number, render: () => void) {
  const scale = Math.max(width / 128, height / 60, .4);
  const roomWidth = 2 * Math.max(width / 2 + 34 * scale, 99 * scale);
  const widthInRoom = roomWidth / scale;
  const depth = 220;
  const floorY = -height / (scale * 2) - 58;
  const ceilingY = height / (scale * 2) + 58;
  const wallHeight = (ceilingY - floorY) * scale;
  const wallMid = (floorY + ceilingY) / 2;
  const wallZ = -3.75;
  const room = new Group();
  const geometries = new Set<BufferGeometry>();
  const materials = new Set<Material>();
  const spotlights: SpotLight[] = [];
  let disposed = false;

  const loader = new TextureLoader();
  const grain = loader.load('/textures/oak.webp', invalidate);
  const normal = loader.load('/textures/oak-normal.webp', invalidate);
  const concrete = loader.load('/textures/concrete.webp', invalidate);
  const upholstery = loader.load('/textures/upholstery.webp', invalidate);
  const textures = [grain, normal, concrete, upholstery];

  function invalidate() {
    if (!disposed) render();
  }

  for (const texture of [grain, concrete, upholstery]) texture.colorSpace = SRGBColorSpace;
  for (const texture of textures) {
    texture.wrapS = texture.wrapT = RepeatWrapping;
    texture.anisotropy = anisotropy;
  }
  for (const texture of [grain, normal]) {
    texture.repeat.set(widthInRoom / 52, wallHeight / (scale * 62));
  }
  concrete.repeat.set(widthInRoom / 75, depth / 75);
  upholstery.repeat.set(2.4, 2.4);

  function mesh(geometry: BufferGeometry, material: Material, x: number, y: number, z: number, castShadow = false) {
    geometries.add(geometry);
    materials.add(material);
    const object = new Mesh(geometry, material);
    object.position.set(x * scale, y * scale, z * scale + wallZ);
    object.castShadow = castShadow;
    object.receiveShadow = true;
    room.add(object);
    return object;
  }

  function box(w: number, h: number, d: number) {
    return new BoxGeometry(w * scale, h * scale, d * scale);
  }

  function rounded(w: number, h: number, d: number, radius: number) {
    return new RoundedBoxGeometry(w * scale, h * scale, d * scale, 3, radius * scale);
  }

  function cylinder(top: number, bottom: number, length: number, open = false) {
    return new CylinderGeometry(top * scale, bottom * scale, length * scale, 32, 1, open);
  }

  const oak = new MeshStandardMaterial({ color: 0xcda683, map: grain, normalMap: normal, roughness: .78 });
  oak.normalScale.set(.6, .6);
  mesh(new PlaneGeometry(roomWidth, wallHeight), oak, 0, wallMid, 0);

  const seam = new MeshStandardMaterial({ color: 0x503426, roughness: .95 });
  const joint = new PlaneGeometry(.17 * scale, wallHeight);
  for (let x = -widthInRoom / 2 + 8; x < widthInRoom / 2; x += 13.2) {
    mesh(joint, seam, x, wallMid, .014);
  }

  const plaster = new MeshStandardMaterial({ color: 0x292b31, roughness: .92 });
  const side = new PlaneGeometry(depth * scale, wallHeight);
  mesh(side, plaster, -widthInRoom / 2, wallMid, depth / 2).rotation.y = Math.PI / 2;
  mesh(side, plaster, widthInRoom / 2, wallMid, depth / 2).rotation.y = -Math.PI / 2;
  const ceiling = new MeshStandardMaterial({ color: 0x383638, roughness: 1 });
  const slab = new PlaneGeometry(roomWidth, depth * scale);
  mesh(slab, ceiling, 0, ceilingY, depth / 2).rotation.x = Math.PI / 2;
  const concreteFloor = new MeshStandardMaterial({ color: 0x77716f, map: concrete, roughness: .91 });
  mesh(slab, concreteFloor, 0, floorY, depth / 2).rotation.x = -Math.PI / 2;

  const trim = new MeshStandardMaterial({ color: 0x272421, roughness: .83 });
  mesh(box(widthInRoom, 2, .7), trim, 0, floorY + 1, .3);
  const rug = new MeshStandardMaterial({ color: 0x29272b, map: upholstery, roughness: 1 });
  mesh(rounded(144, .65, 78, .27), rug, 0, floorY + .31, 49);

  const couch = new MeshStandardMaterial({ color: 0xd8c9ad, map: upholstery, roughness: .93 });
  const cushion = new MeshStandardMaterial({ color: 0xffe5c7, map: upholstery, roughness: .89 });
  couch.color.multiplyScalar(1.55);
  cushion.color.multiplyScalar(1.64);
  const leather = new MeshStandardMaterial({ color: 0x573f32, roughness: .76 });
  const moss = new MeshStandardMaterial({ color: 0x696951, roughness: .91 });
  const bronze = new MeshStandardMaterial({ color: 0x724b2f, metalness: .68, roughness: .41 });
  const darkMetal = new MeshStandardMaterial({ color: 0x181719, metalness: .53, roughness: .42 });
  const xCouch = 3;
  mesh(rounded(105, 8.5, 38, 2.2), couch, xCouch, floorY + 10, 28, true);
  const feet = cylinder(.95, 1.12, 6.5);
  for (const x of [xCouch - 45, xCouch + 45]) {
    for (const z of [14, 40]) mesh(feet, darkMetal, x, floorY + 3.6, z, true);
  }
  const arm = rounded(8.4, 16.8, 39, 2.7);
  mesh(arm, couch, xCouch - 49, floorY + 17, 28, true);
  mesh(arm, couch, xCouch + 49, floorY + 17, 28, true);
  const seat = rounded(30.1, 7.5, 29.5, 2.7);
  const back = rounded(30.4, 20.5, 8.8, 3.1);
  for (const x of [xCouch - 30.6, xCouch, xCouch + 30.6]) {
    mesh(seat, cushion, x, floorY + 15.5, 31, true);
    mesh(back, cushion, x, floorY + 25, 14, true).rotation.x = -.143;
  }
  const pillow = rounded(15, 14, 4.5, 2.1);
  const leftPillow = mesh(pillow, leather, xCouch - 38, floorY + 24, 22, true);
  leftPillow.rotation.set(-.24, -.15, -.21);
  const rightPillow = mesh(pillow, moss, xCouch + 38, floorY + 24, 22, true);
  rightPillow.rotation.set(-.28, .17, .19);

  const shadeMaterial = new MeshStandardMaterial({
    color: 0xcb9660, emissive: 0xffa14c, emissiveIntensity: .69, roughness: .89, side: DoubleSide,
  });
  const filament = new MeshStandardMaterial({ color: 0xffd09a, emissive: 0xffa34a, emissiveIntensity: 3.2, roughness: .6 });

  function lamp(x: number, z: number, supportY: number, height: number, radius: number, power: number) {
    mesh(cylinder(radius * .66, radius * .73, .9), bronze, x, supportY + .45, z, true);
    mesh(cylinder(.58, .63, height), bronze, x, supportY + height / 2, z, true);
    mesh(cylinder(radius * .65, radius, radius * 1.16, true), shadeMaterial, x, supportY + height, z);
    mesh(cylinder(radius * .36, radius * .36, .28), filament, x, supportY + height - radius * .42, z);
    mesh(cylinder(radius * 1.002, radius * 1.002, .17, true), bronze, x, supportY + height - radius * .575, z);

    const glow = new PointLight(0xffad63, power * scale * scale, 80 * scale, 2);
    glow.position.set(x * scale, (supportY + height - radius * .62) * scale, wallZ + z * scale);
    room.add(glow);
  }

  lamp(-75, 26, floorY, 62, 10, 580);
  const endTable = new MeshStandardMaterial({ color: 0x6b4a38, roughness: .79 });
  mesh(cylinder(11, 9.4, 16), endTable, 73, floorY + 8, 28, true);
  mesh(cylinder(11.6, 11.6, 1.15), endTable, 73, floorY + 16.3, 28, true);
  lamp(73, 28, floorY + 17, 18, 7, 270);

  const potRing = cylinder(3.1, 3.1, .8);
  const potLens = cylinder(2.25, 2.25, .2);
  const beamDepth = 59;
  const beamGeometry = cylinder(1.25, 22, beamDepth, true);
  const haze = new ShaderMaterial({
    vertexShader: hazeVertex, fragmentShader: hazeFragment,
    transparent: true, depthWrite: false, blending: AdditiveBlending,
  });
  for (const x of [-56, 0, 56]) {
    const z = 31;
    mesh(potRing, darkMetal, x, ceilingY - .38, z);
    mesh(potLens, filament, x, ceilingY - .88, z);
    const spot = new SpotLight(0xffd49d, 2730 * scale * scale, 164 * scale, .63, .83, 2);
    spot.position.set(x * scale, (ceilingY - 1) * scale, wallZ + z * scale);
    spot.target.position.set(x * scale, -14 * scale, wallZ + 9 * scale);
    spot.castShadow = x === 0;
    if (spot.castShadow) {
      spot.shadow.mapSize.set(1024, 1024);
      spot.shadow.camera.near = 2 * scale;
      spot.shadow.camera.far = 157 * scale;
      spot.shadow.normalBias = .13 * scale;
      spot.shadow.bias = -.00045;
      spot.shadow.radius = 2;
    }
    spotlights.push(spot);
    room.add(spot, spot.target);

    const shaft = mesh(beamGeometry, haze, x, ceilingY - 1 - beamDepth / 2, z - 7.1);
    shaft.rotation.x = .236;
    shaft.layers.set(hazeLayer);
    shaft.receiveShadow = false;
  }

  room.add(new HemisphereLight(0x9faac7, 0x5c4136, 1.02));
  const bounce = new DirectionalLight(0xa0b0e9, .7);
  bounce.position.set(-63 * scale, 37 * scale, 85 * scale);
  room.add(bounce);
  const roomBounce = new PointLight(0xc7d5ff, 1760 * scale * scale, 165 * scale, 2);
  roomBounce.position.set(33 * scale, 9 * scale, wallZ + 83 * scale);
  room.add(roomBounce);

  return {
    room,
    background: new Color(0x15151b),
    scale,
    dispose() {
      disposed = true;
      textures.forEach((texture) => texture.dispose());
      spotlights.forEach((light) => light.shadow.dispose());
      geometries.forEach((geometry) => geometry.dispose());
      materials.forEach((material) => material.dispose());
    },
  };
}
