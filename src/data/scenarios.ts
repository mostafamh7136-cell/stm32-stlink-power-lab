import type { BoardId, ProbeId, PinRef, Role, Scenario, Step, WireSpec, WireColor } from './types';

const wire = (from: PinRef, to: PinRef, color: WireColor): WireSpec => ({ from, to, color });

export function buildScenario(board: BoardId, probe: ProbeId): Scenario {
  const v3 = probe === 'v3';
  const bp = board === 'bp';
  const P = v3 ? { g: '5', dio: '4', clk: '6', rst: '12', vcc: '3' } : { g: '4', dio: '7', clk: '9', rst: '15', vcc: '1' };
  const B = bp ? { g: 'GND', dio: 'DIO', clk: 'CLK', rst: 'R', vcc: '3V3' } : { g: 'CN4-3', dio: 'CN4-4', clk: 'CN4-2', rst: 'CN4-5', vcc: 'CN4-1' };
  const roles: Role[] = ['probe', 'board'];
  if (!v3) { if (bp) roles.push('source'); roles.push('meter'); }

  const steps: Step[] = [];
  const add = (s: Partial<Step> & Pick<Step, 'id' | 'title' | 'html'>) =>
    steps.push({ wires: [], highlight: [], remove: [], ...s });
  const pr = (id: string) => `probe:${id}` as PinRef;
  const bd = (id: string) => `board:${id}` as PinRef;

  add({
    id: 'prep', title: 'Before you start',
    html: `<p>Keep <b>everything unplugged</b>. Don't connect USB to the probe or the board until the power-up step.</p><ul>
      <li>Female–female Dupont jumpers, ideally 15 cm or shorter. Long SWD wires cause flaky connections.</li>
      ${v3 ? '<li>Install <b>STM32CubeMonitor-Power</b> for measuring and <b>STM32CubeProgrammer</b> for flashing.</li><li>The V3PWR debug port is 1.27 mm (STDC14). Use the supplied flat cable plus a 1.27→2.54 mm adapter, or fine-pitch jumpers.</li>'
           : '<li>A multimeter with a DC mA/µA range. Move the red lead to the <b>mA/µA jack</b>.</li><li>Install <b>STM32CubeProgrammer</b>.</li>'}
      ${bp ? "<li>Leave the Blue Pill's micro-USB <b>unplugged</b> the whole time. It would power the board around the measurement.</li><li>Both BOOT jumpers should be on <b>0</b>.</li>" : ''}</ul>
      <div class="tip">Drag to orbit, scroll to zoom, and click any pin for details. Switch to <b>Practice</b> mode to make the connections yourself.</div>`,
  });

  if (!bp) add({
    id: 'jumpers', title: 'Prepare the Nucleo jumpers',
    html: `<ol><li>Remove <b>both CN2 jumpers</b>. This disconnects the on-board ST-LINK from the MCU, so your external probe controls SWD.</li>
      <li>Remove the <b>IDD jumper (JP6)</b>. This opens the MCU's supply path. The measurement goes into this gap.</li></ol>
      <div class="warn">The IDD jumper's number varies by board (JP6 on most Nucleo-64 boards, JP5 on some). Look for <b>IDD</b> on the silkscreen. Keep the jumpers so you can restore normal use.</div>`,
    highlight: [bd('JP6-1'), bd('JP6-2')],
    remove: ['board:cap-CN2a', 'board:cap-CN2b', 'board:cap-JP6'],
  });

  add({
    id: 'gnd', title: 'Ground first',
    html: `<p>Connect probe <b>GND</b> to board <b>GND</b>. Ground goes first so every other signal shares a common reference.</p>
      <div class="tip">${v3 ? 'STDC14 pins 5 and 7 are both GND.' : 'Every even pin from 4 to 20 is GND. Any of them works.'}</div>`,
    wires: [wire(pr(P.g), bd(B.g), 'gnd')],
  });
  add({
    id: 'swdio', title: 'SWDIO (data)',
    html: `<p>SWDIO is the bidirectional debug data line. ${bp ? 'On the Blue Pill it\'s PA13, labeled <b>IO</b>.' : 'It goes to CN4 pin 4.'}</p>`,
    wires: [wire(pr(P.dio), bd(B.dio), 'dio')],
  });
  add({
    id: 'swclk', title: 'SWCLK (clock)',
    html: `<p>SWCLK is the debug clock, driven by the probe. ${bp ? 'On the Blue Pill it\'s PA14, labeled <b>CLK</b>.' : 'It goes to CN4 pin 2.'}</p>`,
    wires: [wire(pr(P.clk), bd(B.clk), 'clk')],
  });
  add({
    id: 'nrst', title: 'NRST (reset)',
    html: `<p>This one is optional but strongly recommended. With NRST connected, CubeProgrammer can <b>Connect under reset</b>. You need that once your firmware enters Stop/Standby or reconfigures PA13/PA14.</p>
      ${bp ? '<div class="tip">On the Blue Pill, NRST is the pin labeled <b>R</b> on the side header.</div>' : ''}`,
    wires: [wire(pr(P.rst), bd(B.rst), 'rst')],
  });
  add({
    id: 'vref', title: 'Voltage reference',
    html: `<p>Connect probe <b>${v3 ? 'T_VCC' : 'VAPP'}</b> to the target's VDD. This is a <b>sense input, not a supply</b>. The probe reads the target voltage to match its signal levels.</p>`,
    wires: [wire(pr(P.vcc), bd(B.vcc), 'vcc')],
  });

  if (bp && v3) add({
    id: 'supply', title: 'Measured supply',
    html: `<p>Connect the V3PWR's <b>VOUT</b> to the Blue Pill's <b>3.3</b> pin, and the power terminal's <b>GND</b> to board GND. Everything the board draws now flows through the V3PWR's meter.</p>
      <div class="warn">The reading includes the power LED (about 1–3 mA) and regulator back-feed leakage. For µA-level work, desolder the PWR LED.</div>`,
    wires: [wire(pr('VOUT'), bd('3V3'), 'pwr'), wire(pr('PGND'), bd('GND'), 'gnd')],
  });
  if (bp && !v3) add({
    id: 'loop', title: 'Build the meter loop',
    html: `<p>Put the multimeter <b>in series</b>: source <b>+3V3 → meter mA/µA</b>, then <b>meter COM → Blue Pill 3.3</b>. Connect source GND to board GND.</p>
      <div class="tip">Source options: a bench supply set to 3.3 V, or the 3.3 V pin of a clone ST-LINK USB stick (the official V2 doesn't supply power).</div>
      <div class="warn">Never put the meter straight across 3.3 V and GND while it's in current mode. That's a short circuit and may blow the meter's fuse.</div>`,
    wires: [wire('source:P', 'meter:A', 'meter'), wire('meter:COM', bd('3V3'), 'pwr'), wire('source:G', bd('GND'), 'gnd')],
  });
  if (!bp && v3) add({
    id: 'supply', title: 'Measured supply into IDD',
    html: `<p>Connect <b>VOUT</b> to the <b>VDD_MCU side of JP6</b> (JP6-2), and the power terminal's <b>GND</b> to Morpho GND. With JP6 open, VOUT feeds only the MCU.</p>
      <div class="warn">Check which JP6 pin is the MCU side with a continuity test to <b>CN7 pin 5 (VDD)</b>. Keep the Nucleo's USB unplugged.</div>`,
    wires: [wire(pr('VOUT'), bd('JP6-2'), 'pwr'), wire(pr('PGND'), bd('CN7-8'), 'gnd')],
  });
  if (!bp && !v3) add({
    id: 'loop', title: 'Meter across IDD',
    html: `<p>Bridge the open JP6 with the multimeter: <b>mA/µA → JP6-1</b> (3V3 side) and <b>COM → JP6-2</b> (VDD_MCU side). All of the MCU's current now flows through the meter.</p>
      <div class="tip">The board is powered from the Nucleo's own USB. The on-board ST-LINK still supplies 5 V with the CN2 jumpers removed.</div>`,
    wires: [wire('meter:A', bd('JP6-1'), 'meter'), wire('meter:COM', bd('JP6-2'), 'pwr')],
  });

  add({
    id: 'power', title: 'Power up, flash & measure', power: true,
    html: v3
      ? `<ol><li>Plug in the V3PWR's USB${bp ? '' : " (leave the Nucleo's USB unplugged)"}.</li><li>In <b>STM32CubeMonitor-Power</b>, select the V3PWR and set <b>3300 mV</b>. VOUT stays off until software enables it.</li>
         <li>In <b>STM32CubeProgrammer</b>, choose ST-LINK, SWD, mode "Under reset", then Connect. Flash your firmware, then <b>Disconnect</b>.</li><li>Start the acquisition. Try the simulator below.</li></ol>`
      : `<ol><li>${bp ? 'Turn on the 3.3 V source.' : "Plug in the Nucleo's USB."} The meter should read a few mA.</li><li>Plug in the ST-LINK/V2. In <b>STM32CubeProgrammer</b>, choose SWD, mode "Under reset", then Connect. Target voltage should read about 3.3 V.</li>
         <li>Flash your firmware, <b>Disconnect</b>, and press reset. Try the simulator below.</li></ol>`,
  });
  add({
    id: 'accuracy', title: 'Get accurate readings',
    html: `<ul><li><b>Close the debug session</b> before measuring. An active debugger keeps debug clocks running in low-power modes, which inflates current by mA.</li>
      <li>For the lowest µA readings, also unplug SWDIO, SWCLK and NRST (keep GND). The probe's I/O lines can leak current.</li>
      <li>In firmware, clear the DBGMCU low-power debug bits and set unused GPIOs to analog mode.</li>
      ${v3 ? '<li>Use a high sampling rate to catch short wake-up bursts. The average is what matters for battery life.</li>'
           : "<li>Start on the mA range. The µA range's burden voltage can brown out the MCU during wake-up spikes.</li>"}</ul>`,
  });
  add({ id: 'review', title: 'Final check', review: true, html: `<div class="tip">"No target found" usually means SWDIO and SWCLK are swapped, there's no common GND, or the voltage reference is missing.</div>` });

  return { board, probe, roles, steps };
}

export const allWires = (s: Scenario): { wire: WireSpec; step: number }[] =>
  s.steps.flatMap((st, i) => st.wires.map((wire) => ({ wire, step: i })));
