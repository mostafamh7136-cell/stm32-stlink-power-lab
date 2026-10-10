import { BLUEPILL, DEVICE_NAMES } from '../../data/catalog';
import { drawTexture, slab, box } from '../pcb';
import { createAssembly, place, headerPins, jumperCap, type Assembly } from './assembly';

const W = 53, H = 22.8;
const TOP = ['G', 'G', '3.3', 'R', 'B11', 'B10', 'B1', 'B0', 'A7', 'A6', 'A5', 'A4', 'A3', 'A2', 'A1', 'A0', 'C15', 'C14', 'C13', 'VB'];
const BOT = ['3.3', 'G', '5V', 'B9', 'B8', 'B7', 'B6', 'B5', 'B4', 'B3', 'A15', 'A12', 'A11', 'A10', 'A9', 'A8', 'B15', 'B14', 'B13', 'B12'];
const X0 = -24.13;

export function buildBluePill(): Assembly {
  const asm = createAssembly('board', DEVICE_NAMES.bp);
  const tex = drawTexture(W, H, '#1748b8', '#f8fafc', (s) => {
    TOP.forEach((t, i) => s.text(X0 + i * 2.54, 10.1, t, 0.95, { rot: 90, color: t === 'R' ? '#fde047' : undefined, bold: t === 'R' }));
    BOT.forEach((t, i) => s.text(X0 + i * 2.54, -10.1, t, 0.95, { rot: 90 }));
    ['3.3', 'IO', 'CLK', 'GND'].forEach((t, i) => s.text(22.9, 3.81 - i * 2.54, t, 1.0, { align: 'right', bold: true }));
    s.text(13.5 + 2.54, 3.6, 'BOOT0  BOOT1', 0.8);
    s.text(-12, 0.7, 'RESET', 0.8);
    s.text(17, -3.7, 'PWR  PC13', 0.75);
    s.rect(23.6, 0, 5.2, 11.6, '#f8fafc');
  });
  const pcb = slab(W, H, 1.6, '#123a94', tex);
  asm.group.add(pcb);

  place(asm.group, 'lqfp48', 3, 0, 0, 45);
  place(asm.group, 'usbMicro', -24.4, 0, 0, -90);
  place(asm.group, 'xtal', -6.5, 3.6, 0, 0);
  place(asm.group, 'button', -12, -3.3, 0, 0);
  [[15.5, -5.6], [18.5, -5.6]].forEach(([x, y]) => place(asm.group, 'led', x, y, 0, 90));
  [[-2, -5.3], [8.5, 5.3], [-17, 3], [-17, -3], [9.5, -5.3]].forEach(([x, y], i) => place(asm.group, i % 2 ? 'cap' : 'res', x, y, 0, 0));

  // 2 x 20-pin side headers (pins along +X after +90° rotation)
  const top = place(asm.group, 'h1x20', X0, 7.62, 0, 90);
  place(asm.group, 'h1x20', X0, -7.62, 0, 90);
  headerPins(asm, top, TOP.map((t) => (t === 'R' ? 'R' : null)), BLUEPILL, { pitch: 2.54, cols: 1, tipZ: 8.54, plug: 'dupont' });

  // 4-pin SWD header at the end opposite the USB connector
  const swd = place(asm.group, 'h1x04', 25.0, 3.81, 0, 0);
  headerPins(asm, swd, ['3V3', 'DIO', 'CLK', 'GND'], BLUEPILL, { pitch: 2.54, cols: 1, tipZ: 8.54, plug: 'dupont' });

  // BOOT jumpers (2x3) with both shunts on "0"
  const boot = place(asm.group, 'h2x03', 13.5, -1.27, 0, 90);
  [0, 1].forEach((c) => { const cap = jumperCap(); cap.position.set(c * 2.54, 0, 0); boot.add(cap); });

  // little foam standoffs
  [[-22, 9], [22, 9], [-22, -9], [22, -9]].forEach(([x, y]) => { const f = box(4, 4, 5, '#111827'); f.position.set(x, y, -4.1); asm.group.add(f); });
  asm.group.position.z = 6.6;
  return asm;
}
