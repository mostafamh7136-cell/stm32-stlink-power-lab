import * as THREE from 'three';
import type { Plug } from './devices/assembly';

export const WIRE_COLORS = {
  gnd: '#1a1a1a', vcc: '#e11d48', dio: '#facc15', clk: '#16a34a', rst: '#9333ea', pwr: '#f97316', meter: '#0ea5e9',
} as const;

export type WireState = 'hidden' | 'ghost' | 'done' | 'active';

const PLUG_LEN: Record<Plug, number> = { dupont: 8, dupontFine: 4.5, ferrule: 6, banana: 19 };

function plugMesh(plug: Plug, color: string): THREE.Object3D {
  const g = new THREE.Group();
  const black = new THREE.MeshStandardMaterial({ color: '#111', roughness: 0.55 });
  if (plug === 'dupont' || plug === 'dupontFine') {
    const s = plug === 'dupont' ? 2.5 : 1.5, h = plug === 'dupont' ? 14 : 8;
    const m = new THREE.Mesh(new THREE.BoxGeometry(s, s, h), black); m.position.z = h / 2 - (plug === 'dupont' ? 6 : 3.5); g.add(m);
  } else if (plug === 'banana') {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.2, 22, 20), new THREE.MeshStandardMaterial({ color, roughness: 0.4 }));
    m.rotation.x = Math.PI / 2; m.position.z = 8; g.add(m);
  } else {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 8, 12), new THREE.MeshStandardMaterial({ color: '#c0c4c8', metalness: 0.9, roughness: 0.3 }));
    m.rotation.x = Math.PI / 2; m.position.z = 2; g.add(m);
  }
  g.traverse((o) => { (o as THREE.Mesh).castShadow = true; });
  return g;
}

/** Animated jumper wire with realistic plugs. Grows along its length when connected. */
export class Wire {
  readonly group = new THREE.Group();
  readonly mesh: THREE.Mesh;
  private progress = 0;
  private target = 0;
  private readonly mat: THREE.MeshStandardMaterial;
  private readonly plugs: THREE.Object3D[];
  private readonly segIdx: number;
  private state: WireState = 'hidden';

  constructor(a: THREE.Vector3, aDir: THREE.Vector3, aPlug: Plug, b: THREE.Vector3, bDir: THREE.Vector3, bPlug: Plug, color: string, seed: number) {
    const a1 = a.clone().addScaledVector(aDir, PLUG_LEN[aPlug]);
    const b1 = b.clone().addScaledVector(bDir, PLUG_LEN[bPlug]);
    const a2 = a1.clone().addScaledVector(aDir, 10);
    const b2 = b1.clone().addScaledVector(bDir, 10);
    const dist = a1.distanceTo(b1);
    const lift = 14 + dist * 0.16;
    const side = new THREE.Vector3().subVectors(b1, a1).cross(new THREE.Vector3(0, 0, 1)).normalize().multiplyScalar(((seed % 5) - 2) * 2.2);
    const m1 = a2.clone().lerp(b2, 0.33).add(side); m1.z = Math.max(a2.z, b2.z) + lift;
    const m2 = a2.clone().lerp(b2, 0.66).add(side); m2.z = Math.max(a2.z, b2.z) + lift * 0.9;
    const curve = new THREE.CatmullRomCurve3([a1, a2, m1, m2, b2, b1], false, 'centripetal');
    const radial = 10;
    const geo = new THREE.TubeGeometry(curve, 160, 0.62, radial, false);
    this.segIdx = radial * 6;
    this.mat = new THREE.MeshStandardMaterial({ color, roughness: 0.45, metalness: 0.0, transparent: true, emissive: color, emissiveIntensity: 0 });
    this.mesh = new THREE.Mesh(geo, this.mat);
    this.mesh.castShadow = true;
    this.group.add(this.mesh);
    const mk = (p: THREE.Vector3, dir: THREE.Vector3, plug: Plug) => {
      const o = plugMesh(plug, color); o.position.copy(p);
      o.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir.clone().normalize());
      this.group.add(o); return o;
    };
    this.plugs = [mk(a, aDir, aPlug), mk(b, bDir, bPlug)];
    this.apply();
  }

  setState(s: WireState, animate = true): void {
    const was = this.state; this.state = s;
    this.target = s === 'hidden' ? 0 : 1;
    if (!animate || was !== 'hidden' || s === 'hidden') this.progress = this.target;
    else this.progress = 0;
    this.apply();
  }

  update(dt: number, t: number): void {
    if (this.progress < this.target) { this.progress = Math.min(1, this.progress + dt * 1.6); this.apply(); }
    if (this.state === 'active') this.mat.emissiveIntensity = 0.25 + 0.2 * Math.sin(t * 5);
  }

  private apply(): void {
    const e = 1 - Math.pow(1 - this.progress, 3);
    const total = (this.mesh.geometry.index?.count ?? 0);
    this.mesh.geometry.setDrawRange(0, Math.floor((total * e) / this.segIdx) * this.segIdx);
    this.group.visible = this.state !== 'hidden';
    this.plugs[0].visible = this.progress > 0;
    this.plugs[1].visible = this.progress >= 0.98;
    this.mat.opacity = this.state === 'ghost' ? 0.28 : 1;
    this.mat.depthWrite = this.state !== 'ghost';
    this.mat.emissiveIntensity = this.state === 'active' ? 0.3 : 0;
  }

  dispose(): void {
    this.group.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) { m.geometry.dispose(); } });
    this.mat.dispose();
  }
}
