import {
  ACESFilmicToneMapping, BoxGeometry, DataTexture, Group,
  Mesh, MeshStandardMaterial, PCFShadowMap, PerspectiveCamera, PlaneGeometry, RGBAFormat,
  Scene, ShaderMaterial, Vector2, WebGLRenderer,
} from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { PanelGeometry } from '../../../../shared/panel';
import { writeRgba } from './frame';
import type { DisplayFrame } from './frame';
import { createPanelRoom } from './panel-room';

const lensVertex = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }`;

const lensFragment = `
  uniform sampler2D frame;
  uniform vec2 panelSize;
  uniform vec2 tileSize;
  uniform vec2 tileStart;
  varying vec2 vUv;

  void main() {
    vec2 local = vec2(vUv.x, 1.0 - vUv.y) * tileSize;
    vec2 cell = min(floor(local), tileSize - 1.0);
    vec3 led = texture2D(frame, (tileStart + cell + 0.5) / panelSize).rgb;
    float distanceFromCenter = length(fract(local) - 0.5);
    float lens = 1.0 - smoothstep(0.21, 0.31, distanceFromCenter);
    float halo = 1.0 - smoothstep(0.18, 0.58, distanceFromCenter);
    float highlight = 1.0 - smoothstep(0.02, 0.16, length(fract(local) - vec2(0.43, 0.43)));
    vec3 plastic = vec3(0.052, 0.052, 0.053);
    vec3 bulb = vec3(0.095, 0.107, 0.116) + 0.04 * highlight;
    vec3 color = mix(plastic, bulb, lens)
      + pow(led, vec3(0.65)) * (lens * 0.93 + halo * 0.17);
    gl_FragColor = vec4(color, 1.0);
  }`;

export function createPanelScene(container: HTMLElement, { width, height, tileWidth, tileHeight }: PanelGeometry) {
  const renderer = new WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.03;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFShadowMap;
  renderer.shadowMap.autoUpdate = false;
  renderer.shadowMap.needsUpdate = true;
  renderer.domElement.setAttribute('aria-label', 'Live 3D LED installation');
  renderer.domElement.setAttribute('role', 'img');
  container.append(renderer.domElement);

  const scene = new Scene();
  const camera = new PerspectiveCamera(34, 1, 0.1, Math.max(2500, Math.max(width, height) * 16));
  const room = createPanelRoom({ width, height, tileWidth, tileHeight }, Math.min(8, renderer.capabilities.getMaxAnisotropy()), render);
  scene.background = room.background;
  scene.add(room.room);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enablePan = false;
  controls.minDistance = Math.max(height * 1.6, width * 0.24);
  controls.maxDistance = Math.max(width, height) * 12;
  controls.minAzimuthAngle = -Math.PI / 2.5;
  controls.maxAzimuthAngle = Math.PI / 2.5;
  controls.minPolarAngle = Math.PI / 5;
  controls.maxPolarAngle = Math.PI * 0.77;

  const image = new Uint8Array(width * height * 4);
  const texture = new DataTexture(image, width, height, RGBAFormat);
  const lenses = new PlaneGeometry(tileWidth - 0.2, tileHeight - 0.2);
  const body = new BoxGeometry(tileWidth - 0.26, tileHeight - 0.26, 1.75);
  const casing = new MeshStandardMaterial({ color: 0x161c20, roughness: 0.61, metalness: 0.22 });

  const mounting = new Group();
  scene.add(mounting);
  const railGeometry = new BoxGeometry(width + 0.8, height * 0.67, 0.9);
  const rail = new Mesh(railGeometry, casing);
  rail.position.z = -2.25;
  rail.castShadow = true;
  mounting.add(rail);

  const tileMaterials: ShaderMaterial[] = [];
  for (let row = 0; row < height / tileHeight; row++) {
    for (let column = 0; column < width / tileWidth; column++) {
      const x = (column + 0.5) * tileWidth - width / 2;
      const y = height / 2 - (row + 0.5) * tileHeight;
      const tile = new Mesh(body, casing);
      tile.position.set(x, y, -0.9);
      tile.castShadow = true;
      mounting.add(tile);

      const material = new ShaderMaterial({
        vertexShader: lensVertex,
        fragmentShader: lensFragment,
        uniforms: {
          frame: { value: texture },
          panelSize: { value: new Vector2(width, height) },
          tileSize: { value: new Vector2(tileWidth, tileHeight) },
          tileStart: { value: new Vector2(column * tileWidth, row * tileHeight) },
        },
      });
      tileMaterials.push(material);
      const face = new Mesh(lenses, material);
      face.position.set(x, y, 0);
      mounting.add(face);
    }
  }

  function render() {
    renderer.render(scene, camera);
  }

  function fitDistance(aspect: number) {
    const fov = camera.fov * Math.PI / 180;
    return Math.max(
      width / (1.6 * Math.tan(fov / 2) * aspect),
      (height + room.scale * 26) / (1.15 * Math.tan(fov / 2)),
    );
  }

  function setView(front: boolean) {
    const distance = fitDistance(camera.aspect);
    const y = front ? 0 : -room.scale * 4;
    controls.target.set(0, y, 0);
    camera.position.set(front ? 0 : -distance * .24, front ? y : y + distance * .155, distance);
    controls.update();
    render();
  }

  function resize() {
    const w = Math.max(1, container.clientWidth);
    const h = Math.max(1, container.clientHeight);
    const nextAspect = w / h;
    const scale = fitDistance(nextAspect) / fitDistance(camera.aspect);
    camera.aspect = nextAspect;
    camera.updateProjectionMatrix();
    if (camera.position.lengthSq() && Number.isFinite(scale) && scale !== 1) {
      camera.position.sub(controls.target).multiplyScalar(scale).add(controls.target);
      controls.update();
    }
    renderer.setSize(w, h, false);
  }

  resize();
  const observer = new ResizeObserver(() => {
    resize();
    render();
  });
  observer.observe(container);
  controls.addEventListener('change', render);
  setView(false);

  return {
    front: () => setView(true),
    reset: () => setView(false),
    paint(frame: DisplayFrame) {
      writeRgba(frame, image);
      texture.needsUpdate = true;
      render();
    },
    dispose() {
      observer.disconnect();
      controls.dispose();
      texture.dispose();
      lenses.dispose();
      body.dispose();
      railGeometry.dispose();
      room.dispose();
      tileMaterials.forEach((material) => material.dispose());
      casing.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    },
  };
}
