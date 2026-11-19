import {
  BoxGeometry, Color, DirectionalLight, Group, HemisphereLight, Mesh,
  MeshStandardMaterial, PlaneGeometry, PointLight, RepeatWrapping, SRGBColorSpace, TextureLoader,
} from 'three';
import type { BufferGeometry } from 'three';
import type { PanelGeometry } from '../../../../shared/panel';

export function createPanelRoom({ width, height }: PanelGeometry, anisotropy: number, render: () => void) {
  const scale = Math.max(width / 128, height / 54, .36);
  const roomWidth = Math.max(width * 4, scale * 390);
  const roomHeight = Math.max(height + scale * 96, scale * 162);
  const depth = scale * 340;
  const floorY = -height / 2 - scale * 39;
  const wallZ = -3.75;
  const room = new Group();
  const geometries = new Set<BufferGeometry>();
  const materials = new Set<MeshStandardMaterial>();
  let disposed = false;

  function invalidate() {
    if (!disposed) render();
  }

  const loader = new TextureLoader();
  const grain = loader.load('/textures/oak.webp', invalidate);
  const normal = loader.load('/textures/oak-normal.webp', invalidate);
  const concrete = loader.load('/textures/concrete.webp', invalidate);
  grain.colorSpace = SRGBColorSpace;
  concrete.colorSpace = SRGBColorSpace;
  for (const texture of [grain, normal, concrete]) {
    texture.wrapS = texture.wrapT = RepeatWrapping;
    texture.anisotropy = anisotropy;
  }
  for (const texture of [grain, normal]) {
    texture.repeat.set(roomWidth / (scale * 61), roomHeight / (scale * 75));
  }
  concrete.repeat.set(roomWidth / (scale * 88), depth / (scale * 88));

  function build(geometry: BufferGeometry, material: MeshStandardMaterial, x: number, y: number, z: number) {
    geometries.add(geometry);
    materials.add(material);
    const mesh = new Mesh(geometry, material);
    mesh.position.set(x, y, z);
    mesh.receiveShadow = true;
    room.add(mesh);
    return mesh;
  }

  const oak = new MeshStandardMaterial({ color: 0xe9d3ba, map: grain, normalMap: normal, roughness: .69 });
  oak.normalScale.set(.58, .58);
  const wallMid = floorY + roomHeight / 2;
  build(new PlaneGeometry(roomWidth, roomHeight), oak, 0, wallMid, wallZ);

  const jointWidth = scale * .18;
  const boardWidth = scale * 14.3;
  const joint = new PlaneGeometry(jointWidth, roomHeight);
  const seam = new MeshStandardMaterial({ color: 0x6f4b30, roughness: .95 });
  for (let x = -roomWidth / 2 + boardWidth * .8; x < roomWidth / 2; x += boardWidth) {
    build(joint, seam, x, wallMid, wallZ + .035);
  }

  const stone = new MeshStandardMaterial({ color: 0xc4bcb1, map: concrete, roughness: .87 });
  const floor = build(new PlaneGeometry(roomWidth, depth), stone, 0, floorY, wallZ + depth / 2);
  floor.rotation.x = -Math.PI / 2;
  const trim = new MeshStandardMaterial({ color: 0xccc1ad, roughness: .78 });
  build(new BoxGeometry(roomWidth, scale * 2.5, scale * .6), trim, 0, floorY + scale * 1.25, wallZ + scale * .3);

  // A low console makes the mounting height and LED panel scale visible at room distance.
  const consoleWidth = scale * 88;
  const walnut = new MeshStandardMaterial({ color: 0x604332, roughness: .7 });
  const doors = new MeshStandardMaterial({ color: 0x7b5740, roughness: .69 });
  const legs = new MeshStandardMaterial({ color: 0x242522, roughness: .56 });
  build(new BoxGeometry(consoleWidth, scale * 10, scale * 13), walnut, 0, floorY + scale * 9.5, wallZ + scale * 7.3).castShadow = true;
  build(new BoxGeometry(consoleWidth + scale * 1.1, scale * 1.0, scale * 14.1), walnut,
    0, floorY + scale * 14.8, wallZ + scale * 7.3).castShadow = true;
  const door = new BoxGeometry(consoleWidth / 3 - scale * .75, scale * 8.7, scale * .45);
  for (const x of [-consoleWidth / 3, 0, consoleWidth / 3]) {
    build(door, doors, x, floorY + scale * 9.4, wallZ + scale * 14);
  }
  const leg = new BoxGeometry(scale * 1.15, scale * 4.5, scale * 1.2);
  for (const x of [-consoleWidth * .42, consoleWidth * .42]) {
    for (const z of [scale * 2.4, scale * 12.2]) {
      build(leg, legs, x, floorY + scale * 2.25, wallZ + z).castShadow = true;
    }
  }

  room.add(new HemisphereLight(0xffecd6, 0x746458, 1.42));
  const daylight = new DirectionalLight(0xfff0da, 1.85);
  daylight.position.set(-scale * 76, scale * 100, scale * 90);
  daylight.castShadow = true;
  const shadowRange = Math.max(width, height) * .62 + 28 * scale;
  Object.assign(daylight.shadow.camera, {
    left: -shadowRange, right: shadowRange, top: shadowRange, bottom: -shadowRange,
    near: .5, far: 360 * scale,
  });
  daylight.shadow.camera.updateProjectionMatrix();
  daylight.shadow.mapSize.set(1024, 1024);
  daylight.shadow.normalBias = scale * .18;
  daylight.shadow.bias = -.00025;
  daylight.shadow.radius = 2;
  room.add(daylight);

  const fill = new DirectionalLight(0xe0ebff, .57);
  fill.position.set(scale * 65, scale * 30, scale * 45);
  room.add(fill);
  const windowLight = new PointLight(0xffefdb, 6200 * scale * scale, 275 * scale);
  windowLight.position.set(-scale * 81, scale * 43, scale * 72);
  room.add(windowLight);

  return {
    room,
    background: new Color(0xbcb2a4),
    scale,
    dispose() {
      disposed = true;
      grain.dispose();
      normal.dispose();
      concrete.dispose();
      daylight.shadow.dispose();
      geometries.forEach((geometry) => geometry.dispose());
      materials.forEach((material) => material.dispose());
    },
  };
}
