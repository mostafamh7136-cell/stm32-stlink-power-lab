import { describe, it, expect } from 'vitest';
import { buildScenario, allWires } from '../src/data/scenarios';
import { STDC14, JTAG20, BLUEPILL, NUCLEO, METER, SOURCE, PARTS } from '../src/data/catalog';
import { POWER, formatCurrent } from '../src/data/power';
import type { BoardId, ProbeId, PinRef } from '../src/data/types';

const combos: [BoardId, ProbeId][] = [['bp', 'v3'], ['bp', 'v2'], ['nu', 'v3'], ['nu', 'v2']];

function catalogFor(ref: PinRef, board: BoardId, probe: ProbeId) {
  const [role] = ref.split(':');
  return role === 'probe' ? (probe === 'v3' ? STDC14 : JTAG20)
    : role === 'board' ? (board === 'bp' ? BLUEPILL : NUCLEO)
    : role === 'meter' ? METER : SOURCE;
}

describe.each(combos)('scenario %s + %s', (board, probe) => {
  const sc = buildScenario(board, probe);

  it('has unique step ids and starts/ends correctly', () => {
    const ids = sc.steps.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids[0]).toBe('prep');
    expect(ids.at(-1)).toBe('review');
  });

  it('every wire endpoint exists in the device catalog and uses an active role', () => {
    for (const { wire } of allWires(sc)) {
      for (const ref of [wire.from, wire.to]) {
        const [role, id] = ref.split(':');
        expect(sc.roles).toContain(role);
        expect(catalogFor(ref, board, probe)[id], ref).toBeDefined();
      }
    }
  });

  it('connects GND, SWDIO, SWCLK and a measured supply path', () => {
    const colors = allWires(sc).map((w) => w.wire.color);
    for (const c of ['gnd', 'dio', 'clk', 'rst', 'vcc', 'pwr'] as const) expect(colors).toContain(c);
  });

  it('never wires a pin to itself and never duplicates a connection', () => {
    const keys = allWires(sc).map(({ wire }) => [wire.from, wire.to].sort().join('|'));
    expect(new Set(keys).size).toBe(keys.length);
    allWires(sc).forEach(({ wire }) => expect(wire.from).not.toBe(wire.to));
  });

  it('removes only known parts', () => {
    sc.steps.flatMap((s) => s.remove).forEach((r) => expect(PARTS[board]).toContain(r.split(':')[1]));
  });

  it('includes exactly one power simulation step', () => {
    expect(sc.steps.filter((s) => s.power)).toHaveLength(1);
  });
});

describe('power helpers', () => {
  it('formats units', () => {
    expect(formatCurrent(30)).toBe('30.00 mA');
    expect(formatCurrent(0.024)).toBe('24.0 µA');
    expect(formatCurrent(0.00003)).toBe('30 nA');
  });
  it('orders modes from highest to lowest current', () => {
    for (const p of Object.values(POWER)) {
      const v = p.modes.map((m) => m.mA);
      expect([...v].sort((a, b) => b - a)).toEqual(v);
    }
  });
});
