import * as THREE from 'three';
import { NUCLEO, DEVICE_NAMES } from '../../data/catalog';
import { drawTexture, slab, box } from '../pcb';
import { createAssembly, place, headerPins, jumperCap, type Assembly } from './assembly';

const W = 70, H = 82.5;

export function buildNucleo64(): Assembly {
  const asm = createAssembly('board', DEVICE_NAMES.nu);
  const tex = drawTexture(W, H, '#f4f4f2', '#111827', (s) => {
    s.line(-35, 24.5, 35, 24.5, '#9ca3af', [1.2, 0.8]);
    s.text(-20, 27, 'ST-LINK', 1.6, { bold: true });
    s.text(18.4, 34.2, 'CN4  SWD', 1.2, { bold: true });
    ['1', '2', '3', '4', '5', '6'].forEach((t, i) => s.text(12 + i * 2.54, 28.4, t, 0.9));
    s.text(5.3, 36, 'CN2', 1.1, { bold: true });
    s.text(13, 1.5, 'IDD', 1.2, { bold: true, color: '#b91c1c' });
    s.text(16.2, -1, 'JP6', 0.9, { align: 'left' });
    s.text(-31, 24, 'CN7', 1.1, { bold: true }); s.text(31, 24, 'CN10', 1.1, { bold: true });
    s.text(-26.5, 21.5 - 7.62, 'GND', 0.8, { align: 'left' });
    s.text(-26.5, 21.5 - 5.08, 'VDD', 0.8, { align: 'left' });
    s.text(0, -20, 'NUCLEO-L476RG', 2.2, { bold: true });
    s.text(-10, 4.5, 'B1 USER', 0.9); s.text(10, 4.5, 'B2 RESET', 0.9);
    s.rect(0, -8, 14, 14, '#d1d5db');
  });
  asm.group.add(slab(W, H, 1.6, '#e5e7eb', tex));

  // ST-LINK section
  place(asm.group, 'usbMini', -22, 40.2, 0, 180);
  place(asm.group, 'lqfp48', -8, 32, 0, 0);
  place(asm.group, 'xtal', -16, 30, 0, 0);
  place(asm.group, 'led', 0, 38, 0, 0);

  const cn2a = place(asm.group, 'h1x02', 4, 33.27, 0, 0);
  const cn2b = place(asm.group, 'h1x02', 6.54, 33.27, 0, 0);
  [['cap-CN2a', cn2a], ['cap-CN2b', cn2b]].forEach(([id, h]) => { const c = jumperCap(); (h as THREE.Group).add(c); asm.parts.set(id as string, c); });

  const cn4 = place(asm.group, 'h1x06', 12, 31, 0, 90);
  headerPins(asm, cn4, ['CN4-1', 'CN4-2', 'CN4-3', 'CN4-4', 'CN4-5', 'CN4-6'], NUCLEO, { pitch: 2.54, cols: 1, tipZ: 8.54, plug: 'dupont' });

  // Target section
  place(asm.group, 'lqfp64', 0, -8, 0, 0);
  place(asm.group, 'sot223', -20, 12, 0, 0);
  place(asm.group, 'button', -10, 8, 0, 0);
  place(asm.group, 'button', 10, 8, 0, 0);
  [[-14, -26], [14, -26], [6, 2], [-6, 2], [8, -18]].forEach(([x, y], i) => place(asm.group, i % 2 ? 'cap' : 'led', x, y, 0, 0));

  const jp6 = place(asm.group, 'h1x02', 13, -2, 0, 0);
  headerPins(asm, jp6, ['JP6-1', 'JP6-2'], NUCLEO, { pitch: 2.54, cols: 1, tipZ: 8.54, plug: 'dupont' });
  const cap = jumperCap('#b91c1c'); jp6.add(cap); asm.parts.set('cap-JP6', cap);

  const cn7 = place(asm.group, 'h2x19', -32.3, 21.5, 0, 0);
  const ids: (string | null)[] = Array(38).fill(null); ids[4] = 'CN7-5'; ids[7] = 'CN7-8';
  headerPins(asm, cn7, ids, NUCLEO, { pitch: 2.54, cols: 2, tipZ: 8.54, plug: 'dupont' });
  place(asm.group, 'h2x19', 29.76, 21.5, 0, 0);

  [[-31, 38], [31, 38], [-31, -38], [31, -38]].forEach(([x, y]) => { const f = box(4, 4, 5, '#111827'); f.position.set(x, y, -4.1); asm.group.add(f); });
  asm.group.position.z = 6.6;
  return asm;
}
