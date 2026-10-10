import * as THREE from 'three';
import type { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import type { Scenario, WireSpec, PinRef, Role } from '../data/types';
import { allWires } from '../data/scenarios';
import { Stage } from './Stage';
import { Wire, WIRE_COLORS, type WireState } from './Wire';
import type { Assembly, PinAnchor } from './devices/assembly';
import { buildBluePill } from './devices/bluePill';
import { buildNucleo64 } from './devices/nucleo64';
import { buildStlinkV3Pwr, buildStlinkV2 } from './devices/probes';
import { buildMultimeter, buildBenchSupply } from './devices/bench';

export const wireKey = (w: WireSpec) => `${w.from}|${w.to}`;
type MarkerState = 'idle' | 'target' | 'hover' | 'pending' | 'error' | 'ok';

interface Marker { key: PinRef; pin: PinAnchor; asm: Assembly; pick: THREE.Mesh; ring: THREE.Mesh; label: CSS2DObject; state: MarkerState; flash: number; world: THREE.Vector3 }

const LAYOUT: Record<string, Partial<Record<Role, [number, number, number]>>> = {
  'bp-v3': { board: [0, 0, 0], probe: [-120, 10, 0] },
  'bp-v2': { board: [0, 0, 0], probe: [-125, 20, 0], meter: [-25, -118, 0], source: [-150, -105, 0] },
  'nu-v3': { board: [0, 0, 0], probe: [-128, 30, 0] },
  'nu-v2': { board: [0, 0, 0], probe: [-128, 30, 0], meter: [35, -135, 0] },
};

/** Scene-level controller: builds devices for a scenario and renders a given step. */
export class Lab {
  private assemblies = new Map<Role, Assembly>();
  private markers = new Map<PinRef, Marker>();
  private wires = new Map<string, { wire: Wire; spec: WireSpec; step: number }>();
  private nameLabels: CSS2DObject[] = [];
  private removed = new Map<string, number>();
  private scenario!: Scenario;
  showAllLabels = false;

  constructor(private readonly stage: Stage) {
    stage.addTick((dt, t) => this.tick(dt, t));
  }

  get roles(): Role[] { return this.scenario.roles; }
  assembly(r: Role): Assembly | undefined { return this.assemblies.get(r); }
  marker(key: PinRef): Marker | undefined { return this.markers.get(key); }
  markerFromObject(o: THREE.Object3D | null): Marker | undefined { return o ? this.markers.get(o.userData.key as PinRef) : undefined; }

  load(sc: Scenario): void {
    this.dispose();
    this.scenario = sc;
    const build: Record<Role, () => Assembly> = {
      board: sc.board === 'bp' ? buildBluePill : buildNucleo64,
      probe: sc.probe === 'v3' ? buildStlinkV3Pwr : buildStlinkV2,
      meter: buildMultimeter,
      source: buildBenchSupply,
    };
    const layout = LAYOUT[`${sc.board}-${sc.probe}`];
    for (const role of sc.roles) {
      const asm = build[role]();
      const [x, y] = layout[role] ?? [0, 0, 0];
      asm.group.position.x = x; asm.group.position.y = y;
      this.stage.world.add(asm.group);
      this.assemblies.set(role, asm);
    }
    this.stage.world.updateMatrixWorld(true);

    for (const [role, asm] of this.assemblies) {
      const box = new THREE.Box3().setFromObject(asm.group);
      const nl = this.stage.label(asm.name, 'lbl lbl-device');
      nl.position.set((box.min.x + box.max.x) / 2, box.max.y + 6, box.max.z + 4);
      this.stage.world.add(nl); this.nameLabels.push(nl);
      for (const pin of asm.pins.values()) this.addMarker(`${role}:${pin.id}` as PinRef, pin, asm);
    }
    allWires(sc).forEach(({ wire: spec, step }, i) => {
      const a = this.markers.get(spec.from)!, b = this.markers.get(spec.to)!;
      const dirA = a.pin.exit.clone().transformDirection(a.pin.anchor.matrixWorld);
      const dirB = b.pin.exit.clone().transformDirection(b.pin.anchor.matrixWorld);
      const wire = new Wire(a.world, dirA, a.pin.plug, b.world, dirB, b.pin.plug, WIRE_COLORS[spec.color], i * 7 + 3);
      wire.group.userData.wireKey = wireKey(spec);
      this.stage.world.add(wire.group);
      this.wires.set(wireKey(spec), { wire, spec, step });
    });
    this.stage.pickables = [...this.markers.values()].map((m) => m.pick);
  }

  private addMarker(key: PinRef, pin: PinAnchor, asm: Assembly): void {
    const world = pin.anchor.getWorldPosition(new THREE.Vector3());
    const r = pin.plug === 'banana' ? 3.4 : pin.plug === 'dupontFine' ? 0.8 : pin.plug === 'ferrule' ? 1.8 : 1.45;
    const pick = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0, depthWrite: false }));
    pick.position.copy(world); pick.userData.key = key; pick.renderOrder = 10;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r * 1.6, r * 0.22, 8, 40), new THREE.MeshBasicMaterial({ color: '#38bdf8', transparent: true, opacity: 0, depthTest: false }));
    ring.position.copy(world); ring.renderOrder = 11;
    const label = this.stage.label(pin.info.label, 'lbl lbl-pin');
    label.position.copy(world).add(new THREE.Vector3(0, 0, 5)); label.visible = false;
    this.stage.world.add(pick, ring, label);
    this.markers.set(key, { key, pin, asm, pick, ring, label, state: 'idle', flash: 0, world });
  }

  setMarker(key: PinRef, state: MarkerState, color?: string): void {
    const m = this.markers.get(key); if (!m) return;
    m.state = state;
    const ringMat = m.ring.material as THREE.MeshBasicMaterial;
    const pickMat = m.pick.material as THREE.MeshBasicMaterial;
    const c = state === 'error' ? '#ef4444' : state === 'ok' ? '#22c55e' : state === 'pending' ? '#22d3ee' : state === 'hover' ? '#ffffff' : color ?? '#38bdf8';
    ringMat.color.set(c); pickMat.color.set(c);
    ringMat.opacity = state === 'idle' ? 0 : 0.95;
    pickMat.opacity = state === 'idle' ? 0 : state === 'hover' ? 0.45 : 0.75;
    if (state === 'error' || state === 'ok') m.flash = 1;
    m.label.visible = state !== 'idle' || this.showAllLabels;
    m.label.element.classList.toggle('lbl-hot', state !== 'idle');
  }

  /** Render a step. practicePlaced = wires the learner has connected in practice mode. */
  render(stepIdx: number, opts: { practice: boolean; placed: Set<string>; showAll: boolean; animate: boolean }): void {
    const step = this.scenario.steps[stepIdx];
    const review = !!step.review;
    for (const { wire, spec, step: s } of this.wires.values()) {
      let st: WireState;
      if (review) st = 'done';
      else if (s < stepIdx) st = 'done';
      else if (s === stepIdx) st = opts.practice ? (opts.placed.has(wireKey(spec)) ? 'active' : 'hidden') : 'active';
      else st = opts.showAll ? 'ghost' : 'hidden';
      wire.setState(st, opts.animate);
    }
    // jumper removal
    const shouldRemove = new Set<string>();
    this.scenario.steps.forEach((s, i) => { if (i <= stepIdx) s.remove.forEach((r) => shouldRemove.add(r)); });
    for (const role of this.roles) {
      const asm = this.assemblies.get(role)!;
      for (const [id, part] of asm.parts) {
        const ref = `${role}:${id}`;
        if (shouldRemove.has(ref)) { if (!this.removed.has(ref)) this.removed.set(ref, opts.animate ? 0 : 1); }
        else { this.removed.delete(ref); part.visible = true; part.position.z = 0; part.scale.setScalar(1); }
      }
    }
    // markers
    for (const m of this.markers.values()) this.setMarker(m.key, 'idle');
    if (!opts.practice) {
      step.wires.forEach((w) => { this.setMarker(w.from, 'target', WIRE_COLORS[w.color]); this.setMarker(w.to, 'target', WIRE_COLORS[w.color]); });
      step.highlight.forEach((h) => this.setMarker(h, 'target', '#ef4444'));
    }
    if (review) for (const { spec } of this.wires.values()) { this.markers.get(spec.from)!.label.visible = true; this.markers.get(spec.to)!.label.visible = true; }
    if (opts.animate) this.frameStep(stepIdx);
  }

  frameStep(stepIdx: number, force = false): void {
    const step = this.scenario.steps[stepIdx];
    const pts: THREE.Vector3[] = [];
    const refs = [...step.wires.flatMap((w) => [w.from, w.to]), ...step.highlight];
    refs.forEach((r) => { const m = this.markers.get(r); if (m) pts.push(m.world); });
    step.remove.forEach((r) => { const [role, id] = r.split(':'); const p = this.assemblies.get(role as Role)?.parts.get(id); if (p) pts.push(p.getWorldPosition(new THREE.Vector3())); });
    if (!pts.length || step.review || step.power) this.overviewPoints(pts);
    this.stage.frame3D(pts, step.wires.length ? 1.2 : 1.05, force);
  }

  private overviewPoints(pts: THREE.Vector3[]): void {
    for (const asm of this.assemblies.values()) {
      const b = new THREE.Box3().setFromObject(asm.group); pts.push(b.min, b.max);
    }
  }

  overview(): void { const pts: THREE.Vector3[] = []; this.overviewPoints(pts); this.stage.frame3D(pts, 1.0, true); }

  private tick(dt: number, t: number): void {
    for (const { wire } of this.wires.values()) wire.update(dt, t);
    for (const m of this.markers.values()) {
      if (m.state === 'idle') continue;
      const s = 1 + 0.18 * Math.sin(t * 4.5);
      m.ring.scale.setScalar(m.state === 'target' || m.state === 'pending' ? s : 1);
      if (m.flash > 0) { m.flash -= dt * 1.4; if (m.flash <= 0 && (m.state === 'error' || m.state === 'ok')) this.setMarker(m.key, 'idle'); }
    }
    for (const [ref, k] of this.removed) {
      if (k >= 1) { this.findPart(ref)!.visible = false; continue; }
      const nk = Math.min(1, k + dt * 0.9); this.removed.set(ref, nk);
      const part = this.findPart(ref)!; part.visible = true;
      part.position.z = 30 * nk * nk; part.scale.setScalar(1 - 0.4 * nk);
    }
  }

  private findPart(ref: string): THREE.Object3D | undefined {
    const [role, id] = ref.split(':'); return this.assemblies.get(role as Role)?.parts.get(id);
  }

  setReadout(main: string, sub?: string): void {
    this.assemblies.get('meter')?.setReadout?.(main, sub);
  }

  dispose(): void {
    for (const { wire } of this.wires.values()) wire.dispose();
    this.stage.world.clear();
    this.assemblies.clear(); this.markers.clear(); this.wires.clear(); this.nameLabels = []; this.removed.clear();
    // CSS2D elements are removed lazily by the renderer; clear the layer explicitly.
    this.stage.labels.domElement.replaceChildren();
  }
}
