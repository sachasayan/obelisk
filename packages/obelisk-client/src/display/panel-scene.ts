import {
  ACESFilmicToneMapping, BoxGeometry, DataTexture, EquirectangularReflectionMapping, FogExp2, Group,
  Mesh, MeshStandardMaterial, PCFShadowMap, PerspectiveCamera, PlaneGeometry, RGBAFormat, Scene,
  ShaderMaterial, SRGBColorSpace, Vector2, WebGLRenderer,
} from 'three';
import type { WebGLRenderTarget } from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import type { PanelGeometry } from '../../../../shared/panel';
import { writeRgba } from './frame';
import type { DisplayFrame } from './frame';
import { createPanelRoom, hazeLayer } from './panel-room';

class RoomOcclusionPass extends GTAOPass {
  override render(renderer: WebGLRenderer, writeBuffer: WebGLRenderTarget, readBuffer: WebGLRenderTarget, dt: number, maskActive: boolean) {
    const visibleLayers = this.camera.layers.mask;
    this.camera.layers.disable(hazeLayer);
    try {
      super.render(renderer, writeBuffer, readBuffer, dt, maskActive);
    } finally {
      this.camera.layers.mask = visibleLayers;
    }
  }
}

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
    vec3 plastic = vec3(0.006, 0.006, 0.007);
    vec3 bulb = vec3(0.013, 0.015, 0.019) + 0.005 * highlight;
    vec3 color = mix(plastic, bulb, lens)
      + pow(led, vec3(0.68)) * (lens * 2.2 + halo * 0.19);
    gl_FragColor = vec4(color, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`;

export function createPanelScene(container: HTMLElement, { width, height, tileWidth, tileHeight }: PanelGeometry) {
  const renderer = new WebGLRenderer({ antialias: true, alpha: false });
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.65);
  renderer.setPixelRatio(pixelRatio);
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.11;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFShadowMap;
  renderer.shadowMap.autoUpdate = false;
  renderer.shadowMap.needsUpdate = true;
  renderer.domElement.setAttribute('aria-label', 'Live 3D LED installation');
  renderer.domElement.setAttribute('role', 'img');
  container.append(renderer.domElement);

  const scene = new Scene();
  const camera = new PerspectiveCamera(47, 1, .35, Math.max(2000, Math.max(width, height) * 12));
  camera.layers.enable(hazeLayer);
  const room = createPanelRoom({ width, height, tileWidth, tileHeight }, renderer, requestRender);
  scene.background = room.background;
  scene.fog = new FogExp2(room.background, .001 / room.scale);
  scene.add(room.room);

  const supportsHalfFloat = renderer.extensions.has('EXT_color_buffer_float') || renderer.extensions.has('EXT_color_buffer_half_float');
  const composer = supportsHalfFloat ? new EffectComposer(renderer) : undefined;
  const occlusion = composer && new RoomOcclusionPass(scene, camera);
  const bloom = composer && new UnrealBloomPass(new Vector2(1, 1), .26, .57, 1.08);
  const output = composer && new OutputPass();
  if (composer && occlusion && bloom && output) {
    occlusion.blendIntensity = .46;
    occlusion.updateGtaoMaterial({ radius: 8 * room.scale, thickness: 2.6 * room.scale, samples: 8, distanceFallOff: .65 });
    occlusion.updatePdMaterial({ radius: 3, samples: 8 });
    composer.addPass(new RenderPass(scene, camera));
    composer.addPass(occlusion);
    composer.addPass(bloom);
    composer.addPass(output);
  }
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enablePan = false;
  controls.minDistance = Math.max(height * 1.6, width * 0.24);
  controls.maxDistance = Math.max(width, height) * 12;
  controls.minAzimuthAngle = -Math.PI / 2.5;
  controls.maxAzimuthAngle = Math.PI / 2.5;
  controls.minPolarAngle = Math.PI * .29;
  controls.maxPolarAngle = Math.PI * .6;

  const image = new Uint8Array(width * height * 4);
  const texture = new DataTexture(image, width, height, RGBAFormat);
  texture.colorSpace = SRGBColorSpace;
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
      tile.receiveShadow = true;
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

  let requestedFrame = 0;
  let disposed = false;
  const environment = supportsHalfFloat ? new HDRLoader().load('/room/studio.hdr', (texture) => {
    if (disposed) return;
    texture.mapping = EquirectangularReflectionMapping;
    scene.environment = texture;
    scene.environmentIntensity = .2;
    scene.environmentRotation.y = 2.64;
    requestRender();
  }) : undefined;

  function requestRender() {
    if (disposed || requestedFrame) return;
    requestedFrame = window.requestAnimationFrame(() => {
      requestedFrame = 0;
      if (composer) composer.render();
      else renderer.render(scene, camera);
    });
  }

  function fitDistance(aspect: number) {
    const fov = camera.fov * Math.PI / 180;
    return Math.max(
      width / (1.36 * Math.tan(fov / 2) * aspect),
      (height + room.scale * 134) / (1.42 * Math.tan(fov / 2)),
    );
  }

  function setView(front: boolean) {
    const distance = fitDistance(camera.aspect);
    const y = front ? 0 : -room.scale * 6;
    controls.target.set(0, y, 0);
    camera.position.set(
      front ? 0 : -Math.min(distance * .22, room.scale * 73),
      front ? y : y + Math.min(distance * .10, room.scale * 26),
      distance,
    );
    controls.update();
    requestRender();
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
    composer?.setSize(w, h);
    occlusion?.setSize(Math.max(1, Math.round(w * pixelRatio * .57)), Math.max(1, Math.round(h * pixelRatio * .57)));
  }

  resize();
  const observer = new ResizeObserver(() => {
    resize();
    requestRender();
  });
  observer.observe(container);
  controls.addEventListener('change', requestRender);
  setView(false);

  return {
    front: () => setView(true),
    reset: () => setView(false),
    paint(frame: DisplayFrame) {
      writeRgba(frame, image);
      texture.needsUpdate = true;
      room.updatePanelSpill(image);
      requestRender();
    },
    dispose() {
      disposed = true;
      observer.disconnect();
      window.cancelAnimationFrame(requestedFrame);
      controls.dispose();
      texture.dispose();
      lenses.dispose();
      body.dispose();
      railGeometry.dispose();
      room.dispose();
      scene.environment = null;
      environment?.dispose();
      output?.dispose();
      bloom?.dispose();
      occlusion?.dispose();
      composer?.dispose();
      tileMaterials.forEach((material) => material.dispose());
      casing.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    },
  };
}
