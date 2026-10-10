import * as THREE from 'three';
import { METER, SOURCE, DEVICE_NAMES } from '../../data/catalog';
import { drawTexture, slab } from '../pcb';
import { createAssembly, addPin, type Assembly } from './assembly';

function jack(parent: THREE.Object3D, x: number, y: number, ring: string): void {
  const body = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.2, 2, 32), new THREE.MeshStandardMaterial({ color: '#0b0b0b', roughness: 0.4 }));
  body.rotation.x = Math.PI / 2; body.position.set(x, y, 0.6); body.castShadow = true; parent.add(body);
  const r = new THREE.Mesh(new THREE.TorusGeometry(3.2, 0.5, 12, 32), new THREE.MeshStandardMaterial({ color: ring, roughness: 0.35 }));
  r.position.set(x, y, 1.6); parent.add(r);
  const hole = new THREE.Mesh(new THREE.CircleGeometry(1.2, 24), new THREE.MeshBasicMaterial({ color: '#000' }));
  hole.position.set(x, y, 1.65); parent.add(hole);
}

/** Display texture that can be redrawn at runtime. */
function liveDisplay(w: number, h: number) {
  const c = document.createElement('canvas'); c.width = 512; c.height = Math.round((512 * h) / w);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const g = c.getContext('2d')!;
  const draw = (main: string, sub = '') => {
    g.fillStyle = '#b7c7a3'; g.fillRect(0, 0, c.width, c.height);
    g.fillStyle = 'rgba(0,0,0,.06)'; for (let i = 0; i < c.height; i += 4) g.fillRect(0, i, c.width, 1);
    g.fillStyle = '#1b2414'; g.textAlign = 'right'; g.textBaseline = 'middle';
    g.font = `700 ${c.height * 0.5}px "DSEG7 Classic", ui-monospace, monospace`; g.fillText(main, c.width - 24, c.height * 0.46);
    g.font = `600 ${c.height * 0.16}px system-ui`; g.textAlign = 'left'; g.fillText(sub, 18, c.height * 0.86);
    tex.needsUpdate = true;
  };
  draw('0.000', 'DC A');
  return { tex, draw };
}

export function buildMultimeter(): Assembly {
  const asm = createAssembly('meter', DEVICE_NAMES.meter);
  const Wd = 78, Hd = 140, D = 26;
  const top = drawTexture(Wd, Hd, '#f1c21b', '#111', (s) => {
    s.rect(0, 12, 62, 84, '#1f2937', true);
    s.text(0, 49, 'DIGITAL MULTIMETER', 3.2, { bold: true, color: '#f8fafc' });
    ['OFF', 'V~', 'V⎓', 'Ω', 'µA', 'mA', 'A'].forEach((t, i) => {
      const a = Math.PI * (0.85 - i * 0.28); s.text(Math.cos(a) * 21, 2 + Math.sin(a) * 21, t, 2.4, { color: i === 5 ? '#fde047' : '#e5e7eb', bold: i === 5 });
    });
    ['10A', 'mA µA', 'COM', 'VΩ'].forEach((t, i) => s.text(-27 + i * 18, -60, t, 2.6, { bold: true, color: '#111' }));
  });
  asm.group.add(slab(Wd, Hd, D, '#d4a514', top, { roughness: 0.8 }));
  const disp = liveDisplay(54, 22);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(54, 22), new THREE.MeshStandardMaterial({ map: disp.tex, roughness: 0.25, emissive: '#223', emissiveIntensity: 0.05 }));
  screen.position.set(0, 36, 0.15); asm.group.add(screen);
  const knob = new THREE.Mesh(new THREE.CylinderGeometry(12, 13, 6, 48), new THREE.MeshStandardMaterial({ color: '#111827', roughness: 0.5 }));
  knob.rotation.x = Math.PI / 2; knob.position.set(0, 2, 3); knob.castShadow = true; asm.group.add(knob);
  const pointer = new THREE.Mesh(new THREE.BoxGeometry(2, 11, 1), new THREE.MeshStandardMaterial({ color: '#f8fafc' }));
  pointer.position.set(0, 6, 6.2); const kp = new THREE.Group(); kp.position.set(0, 2, 0); pointer.position.set(0, 5.5, 6.2); kp.add(pointer);
  kp.rotation.z = Math.PI * (0.85 - 5 * 0.28) - Math.PI / 2; asm.group.add(kp);
  [['#ef4444', -27], ['#ef4444', -9], ['#111827', 9], ['#ef4444', 27]].forEach(([c, x]) => jack(asm.group, x as number, -51, c as string));
  addPin(asm, asm.group, 'A', METER, new THREE.Vector3(-9, -51, 1.6), new THREE.Vector3(0, 0, 1), 'banana');
  addPin(asm, asm.group, 'COM', METER, new THREE.Vector3(9, -51, 1.6), new THREE.Vector3(0, 0, 1), 'banana');
  asm.setReadout = (main, sub) => disp.draw(main, sub);
  asm.group.position.z = D;
  return asm;
}

export function buildBenchSupply(): Assembly {
  const asm = createAssembly('source', DEVICE_NAMES.source);
  const Wd = 90, Hd = 60, D = 30;
  const top = drawTexture(Wd, Hd, '#334155', '#e2e8f0', (s) => {
    s.text(-41, 24, 'DC POWER SUPPLY', 3, { align: 'left', bold: true });
    s.text(-14, -20, '+', 4, { color: '#f87171', bold: true }); s.text(14, -20, '−', 4, { bold: true });
  });
  asm.group.add(slab(Wd, Hd, D, '#1e293b', top));
  const disp = liveDisplay(44, 16); disp.draw('3.30 V', 'CV  LIMIT 100 mA');
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(44, 16), new THREE.MeshStandardMaterial({ map: disp.tex, roughness: 0.3 }));
  screen.position.set(-12, 6, 0.15); asm.group.add(screen);
  [['#ef4444', -14], ['#111827', 14]].forEach(([c, x]) => {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(3.5, 3.5, 8, 24), new THREE.MeshStandardMaterial({ color: c as string, roughness: 0.35 }));
    post.rotation.x = Math.PI / 2; post.position.set(x as number, -12, 4); post.castShadow = true; asm.group.add(post);
  });
  addPin(asm, asm.group, 'P', SOURCE, new THREE.Vector3(-14, -12, 8), new THREE.Vector3(0, 0, 1), 'banana');
  addPin(asm, asm.group, 'G', SOURCE, new THREE.Vector3(14, -12, 8), new THREE.Vector3(0, 0, 1), 'banana');
  asm.setReadout = (main, sub) => disp.draw(main, sub);
  asm.group.position.z = D;
  return asm;
}
