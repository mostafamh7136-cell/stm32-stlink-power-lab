import * as THREE from 'three';
import { STDC14, JTAG20, DEVICE_NAMES } from '../../data/catalog';
import { drawTexture, slab } from '../pcb';
import { createAssembly, place, headerPins, addPin, type Assembly } from './assembly';

/** STLINK-V3PWR: stylised enclosure; connectors are real KiCad models. */
export function buildStlinkV3Pwr(): Assembly {
  const asm = createAssembly('probe', DEVICE_NAMES.v3);
  const Wd = 66, Hd = 48, D = 16;
  const tex = drawTexture(Wd, Hd, '#1e293b', '#e2e8f0', (s) => {
    s.text(-31, 19, 'STLINK-V3PWR', 3.2, { align: 'left', bold: true });
    s.text(-31, 14.5, 'Debugger · programmer · power monitor', 1.6, { align: 'left', color: '#94a3b8' });
    s.text(-6, 10.5, 'DEBUG · STDC14', 1.5, { bold: true });
    s.circle(-11.6, 4.0, 0.6, '#facc15'); s.text(-12.8, 4.0, '1', 1.2, { align: 'right', color: '#facc15' });
    s.text(9.9, -1.4, 'POWER OUT', 1.5, { bold: true, color: '#fdba74' });
    s.text(8, -3.6, 'VOUT', 1.3, { color: '#fdba74' }); s.text(11.81, -3.6, 'GND', 1.3);
    s.rect(9.9, -14, 14, 18, '#334155');
    s.text(0, 21.5, 'USB', 1.2, { color: '#94a3b8' });
  });
  const shell = slab(Wd, Hd, D, '#0f172a', tex, { roughness: 0.4 });
  asm.group.add(shell);

  const stdc = place(asm.group, 'h2x07f', -10, 4.0, 0, 90);
  headerPins(asm, stdc, ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14'], STDC14, { pitch: 1.27, cols: 2, tipZ: 4.0, plug: 'dupontFine' });

  const term = place(asm.group, 'terminal', 8, -6, 0, 0);
  addPin(asm, term, 'VOUT', STDC14, new THREE.Vector3(0, -7.6, 3.4), new THREE.Vector3(0, -1, 0.35).normalize(), 'ferrule');
  addPin(asm, term, 'PGND', STDC14, new THREE.Vector3(3.81, -7.6, 3.4), new THREE.Vector3(0, -1, 0.35).normalize(), 'ferrule');

  place(asm.group, 'usbMini', 0, 22.5, 0, 180);
  asm.group.position.z = D;
  return asm;
}

/** ST-LINK/V2: stylised case with the real 20-pin IDC connector. */
export function buildStlinkV2(): Assembly {
  const asm = createAssembly('probe', DEVICE_NAMES.v2);
  const Wd = 72, Hd = 40, D = 16;
  const tex = drawTexture(Wd, Hd, '#d6dbe3', '#0f172a', (s) => {
    s.rect(0, 13.5, 72, 8, '#1d4ed8', true);
    s.text(-33, 13.5, 'ST-LINK/V2', 3.4, { align: 'left', bold: true, color: '#ffffff' });
    s.text(0, -9, 'JTAG / SWD · 20-pin', 1.6, { bold: true });
    s.text(-14.6, -2.8, '1', 1.3, { bold: true, color: '#b91c1c' });
    s.text(-14.6, 2.8, '2', 1.3, { color: '#475569' });
  });
  asm.group.add(slab(Wd, Hd, D, '#9aa3b2', tex, { roughness: 0.45 }));
  const idc = place(asm.group, 'idc2x10', -12, -1.27, 0, 90);
  headerPins(asm, idc, Array.from({ length: 20 }, (_, i) => String(i + 1)), JTAG20, { pitch: 2.54, cols: 2, tipZ: 8.0, plug: 'dupont' });
  place(asm.group, 'usbMini', -36.5, 0, 0, -90);
  asm.group.position.z = D;
  return asm;
}
