import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

type Tick = (dt: number, t: number) => void;

/** Owns renderer, camera, controls, lighting, picking and camera animation. Z-up, millimetres. */
export class Stage {
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  readonly renderer: THREE.WebGLRenderer;
  readonly labels: CSS2DRenderer;
  readonly controls: OrbitControls;
  readonly world = new THREE.Group();
  pickables: THREE.Object3D[] = [];
  onPick?: (o: THREE.Object3D | null) => void;
  onHover?: (o: THREE.Object3D | null) => void;
  autoCamera = true;

  private readonly clock = new THREE.Clock();
  private readonly ticks = new Set<Tick>();
  private readonly ray = new THREE.Raycaster();
  private readonly ndc = new THREE.Vector2();
  private hovered: THREE.Object3D | null = null;
  private fly: { p0: THREE.Vector3; p1: THREE.Vector3; t0: THREE.Vector3; t1: THREE.Vector3; start: number; dur: number } | null = null;
  private readonly reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  constructor(private readonly host: HTMLElement) {
    THREE.Object3D.DEFAULT_UP.set(0, 0, 1);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    host.appendChild(this.renderer.domElement);

    this.labels = new CSS2DRenderer();
    this.labels.domElement.className = 'label-layer';
    host.appendChild(this.labels.domElement);

    this.camera = new THREE.PerspectiveCamera(38, 1, 1, 5000);
    this.camera.up.set(0, 0, 1);
    this.camera.position.set(-60, -260, 230);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.maxPolarAngle = Math.PI * 0.48;
    this.controls.minDistance = 25;
    this.controls.maxDistance = 900;
    this.controls.addEventListener('start', () => { this.fly = null; });

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.background = new THREE.Color('#0d1424');
    this.scene.fog = new THREE.Fog('#0d1424', 700, 1600);

    const sun = new THREE.DirectionalLight('#ffffff', 2.2);
    sun.position.set(-150, -120, 320); sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -260, right: 260, top: 260, bottom: -260, near: 10, far: 900 });
    sun.shadow.bias = -0.0004; sun.shadow.radius = 4;
    this.scene.add(sun, new THREE.HemisphereLight('#dbeafe', '#1e293b', 0.6));

    // ESD desk mat with a subtle mm grid
    const mat = new THREE.Mesh(new THREE.PlaneGeometry(1400, 1000), new THREE.MeshStandardMaterial({ color: '#2b3a4a', roughness: 0.92 }));
    mat.receiveShadow = true; this.scene.add(mat);
    const grid = new THREE.GridHelper(1400, 140, '#3b4d61', '#33445a');
    grid.rotation.x = Math.PI / 2; grid.position.z = 0.05; (grid.material as THREE.Material).transparent = true; (grid.material as THREE.Material).opacity = 0.35;
    this.scene.add(grid, this.world);

    this.bindPointer();
    new ResizeObserver(() => this.resize()).observe(host);
    this.resize();
    this.renderer.setAnimationLoop(() => this.frame());
  }

  addTick(fn: Tick): () => void { this.ticks.add(fn); return () => this.ticks.delete(fn); }

  label(text: string, cls: string): CSS2DObject {
    const el = document.createElement('div'); el.className = cls; el.textContent = text;
    return new CSS2DObject(el);
  }

  /** Smoothly frame a set of world points. */
  frame3D(points: THREE.Vector3[], pad = 1.25, force = false): void {
    if (!points.length || (!this.autoCamera && !force)) return;
    const box = new THREE.Box3().setFromPoints(points);
    const center = box.getCenter(new THREE.Vector3());
    const r = Math.max(box.getSize(new THREE.Vector3()).length() / 2, 22);
    const dir = this.camera.position.clone().sub(this.controls.target).normalize();
    if (dir.z < 0.55) { dir.z = 0.55; dir.normalize(); }
    const fov = THREE.MathUtils.degToRad(this.camera.fov);
    const aspect = Math.min(this.camera.aspect, 1.6);
    const dist = (r * pad) / Math.sin(Math.min(fov, fov * aspect) / 2);
    const p1 = center.clone().addScaledVector(dir, dist);
    if (this.reducedMotion) { this.camera.position.copy(p1); this.controls.target.copy(center); return; }
    this.fly = { p0: this.camera.position.clone(), p1, t0: this.controls.target.clone(), t1: center, start: performance.now(), dur: 1100 };
  }

  private bindPointer(): void {
    const el = this.renderer.domElement;
    let down: { x: number; y: number } | null = null;
    const pick = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      this.ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      this.ray.setFromCamera(this.ndc, this.camera);
      return this.ray.intersectObjects(this.pickables, false)[0]?.object ?? null;
    };
    el.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY }; });
    el.addEventListener('pointerup', (e) => {
      if (down && Math.hypot(e.clientX - down.x, e.clientY - down.y) < 6) this.onPick?.(pick(e));
      down = null;
    });
    el.addEventListener('pointermove', (e) => {
      if (e.buttons) return;
      const o = pick(e);
      if (o !== this.hovered) { this.hovered = o; el.style.cursor = o ? 'pointer' : 'grab'; this.onHover?.(o); }
    });
  }

  private resize(): void {
    const { clientWidth: w, clientHeight: h } = this.host;
    if (!w || !h) return;
    this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h); this.labels.setSize(w, h);
  }

  private frame(): void {
    const dt = Math.min(this.clock.getDelta(), 0.05), t = this.clock.elapsedTime;
    if (this.fly) {
      const f = this.fly; const k = Math.min(1, (performance.now() - f.start) / f.dur);
      const e = k < 0.5 ? 4 * k ** 3 : 1 - (-2 * k + 2) ** 3 / 2;
      this.camera.position.lerpVectors(f.p0, f.p1, e); this.controls.target.lerpVectors(f.t0, f.t1, e);
      if (k >= 1) this.fly = null;
    }
    this.ticks.forEach((fn) => fn(dt, t));
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
    this.labels.render(this.scene, this.camera);
  }

  snapshot(): string { this.renderer.render(this.scene, this.camera); return this.renderer.domElement.toDataURL('image/png'); }
}
