import {
  AmbientLight, BoxGeometry, Color, DataTexture, DirectionalLight, Group,
  Mesh, MeshStandardMaterial, PerspectiveCamera, PlaneGeometry, RGBAFormat,
  Scene, ShaderMaterial, Vector2, WebGLRenderer,
} from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { PanelGeometry } from '../../../../shared/panel';
import { writeRgba } from './frame';
import type { DisplayFrame } from './frame';

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
    vec3 plastic = vec3(0.036, 0.042, 0.046);
    vec3 bulb = vec3(0.095, 0.107, 0.116) + 0.04 * highlight;
    vec3 color = mix(plastic, bulb, lens)
      + pow(led, vec3(0.65)) * (lens * 0.93 + halo * 0.17);
    gl_FragColor = vec4(color, 1.0);
  }`;

export function createPanelScene(container: HTMLElement, { width, height, tileWidth, tileHeight }: PanelGeometry) {
  const renderer = new WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.domElement.setAttribute('aria-label', 'Live 3D LED installation');
  renderer.domElement.setAttribute('role', 'img');
  container.append(renderer.domElement);

  const scene = new Scene();
  scene.background = new Color(0x30393e);
  const camera = new PerspectiveCamera(34, 1, 0.1, 2500);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enablePan = false;
  controls.minDistance = Math.max(height * 1.6, width * 0.24);
  controls.maxDistance = width * 7;
  controls.minAzimuthAngle = -Math.PI / 2.5;
  controls.maxAzimuthAngle = Math.PI / 2.5;
  controls.minPolarAngle = Math.PI / 5;
  controls.maxPolarAngle = Math.PI * 0.77;

  const image = new Uint8Array(width * height * 4);
  const texture = new DataTexture(image, width, height, RGBAFormat);
  const lenses = new PlaneGeometry(tileWidth - 0.2, tileHeight - 0.2);
  const body = new BoxGeometry(tileWidth - 0.26, tileHeight - 0.26, 1.75);
  const casing = new MeshStandardMaterial({ color: 0x161c20, roughness: 0.61, metalness: 0.22 });
  const wall = new MeshStandardMaterial({ color: 0x505a61, roughness: 0.96 });
  const wallGeometry = new PlaneGeometry(width * 12, width * 12);
  const surface = new Mesh(wallGeometry, wall);
  surface.position.z = -3.75;
  scene.add(surface);

  const mounting = new Group();
  scene.add(mounting);
  const railGeometry = new BoxGeometry(width + 0.8, height * 0.67, 0.9);
  const rail = new Mesh(railGeometry, casing);
  rail.position.z = -2.25;
  mounting.add(rail);

  const tileMaterials: ShaderMaterial[] = [];
  for (let row = 0; row < height / tileHeight; row++) {
    for (let column = 0; column < width / tileWidth; column++) {
      const x = (column + 0.5) * tileWidth - width / 2;
      const y = height / 2 - (row + 0.5) * tileHeight;
      const tile = new Mesh(body, casing);
      tile.position.set(x, y, -0.9);
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

  scene.add(new AmbientLight(0xaabecb, 1.16));
  const key = new DirectionalLight(0xfff0d3, 2.35);
  key.position.set(-width * 0.38, width * 0.55, width * 0.7);
  scene.add(key);

  function render() {
    renderer.render(scene, camera);
  }

  function setView(front: boolean) {
    const fov = camera.fov * Math.PI / 180;
    const distance = Math.max(
      width / (1.7 * Math.tan(fov / 2) * camera.aspect),
      (height + 15) / (1.1 * Math.tan(fov / 2)),
    );
    controls.target.set(0, 0, 0);
    camera.position.set(front ? 0 : -distance * 0.27, front ? 0 : distance * 0.19, distance);
    controls.update();
    render();
  }

  function resize() {
    const w = Math.max(1, container.clientWidth);
    const h = Math.max(1, container.clientHeight);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
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
      wallGeometry.dispose();
      tileMaterials.forEach((material) => material.dispose());
      casing.dispose();
      wall.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    },
  };
}
