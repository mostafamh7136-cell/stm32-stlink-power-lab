import * as THREE from 'three';
import type { PinInfo } from '../../data/types';
import { model, type ModelKey } from '../assets';

export type Plug = 'dupont' | 'dupontFine' | 'ferrule' | 'banana';

export interface PinAnchor {
  id: string;
  info: PinInfo;
  /** Point the wire attaches to (pin tip / terminal mouth / jack top). */
  anchor: THREE.Object3D;
  /** Local exit direction for the wire. */
  exit: THREE.Vector3;
  plug: Plug;
}

export interface Assembly {
  key: string;
  name: string;
  group: THREE.Group;
  pins: Map<string, PinAnchor>;
  parts: Map<string, THREE.Object3D>;
  setReadout?(text: string, sub?: string): void;
}

export function createAssembly(key: string, name: string): Assembly {
  const group = new THREE.Group(); group.name = key;
  return { key, name, group, pins: new Map(), parts: new Map() };
}

/** Place a KiCad model. KiCad origin = pin 1; pins run along -Y; 2nd column at +X. */
export function place(parent: THREE.Object3D, key: ModelKey, x: number, y: number, z = 0, rotDeg = 0): THREE.Group {
  const g = new THREE.Group();
  g.position.set(x, y, z); g.rotation.z = THREE.MathUtils.degToRad(rotDeg);
  g.add(model(key)); parent.add(g);
  return g;
}

/** Register header pins by KiCad pin number. ids[i] → pin i+1 (null = unused). */
export function headerPins(asm: Assembly, header: THREE.Group, ids: (string | null)[], catalog: Record<string, PinInfo>,
  o: { pitch: number; cols: 1 | 2; tipZ: number; plug: Plug }): void {
  ids.forEach((id, i) => {
    if (!id) return;
    const col = o.cols === 2 ? i % 2 : 0;
    const row = o.cols === 2 ? Math.floor(i / 2) : i;
    addPin(asm, header, id, catalog, new THREE.Vector3(col * o.pitch, -row * o.pitch, o.tipZ), new THREE.Vector3(0, 0, 1), o.plug);
  });
}

export function addPin(asm: Assembly, parent: THREE.Object3D, id: string, catalog: Record<string, PinInfo>, pos: THREE.Vector3, exit: THREE.Vector3, plug: Plug): void {
  const info = catalog[id];
  if (!info) throw new Error(`Unknown pin ${asm.key}:${id}`);
  const anchor = new THREE.Object3D(); anchor.position.copy(pos); anchor.name = `${asm.key}:${id}`;
  parent.add(anchor);
  asm.pins.set(id, { id, info, anchor, exit, plug });
}

/** Jumper shunt cap (2.54 mm) sitting on two adjacent pins. */
export function jumperCap(color = '#1f2937'): THREE.Group {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.5 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.4, 5.0, 5.6), mat);
  body.position.set(0, -1.27, 5.6); body.castShadow = true; g.add(body);
  return g;
}
