import type { PinInfo } from './types';

/** Pure data: the pins each device exposes to the guide. Used by 3D builders and tests. */
const p = (label: string, detail: string): PinInfo => ({ label, detail });

export const DEVICE_NAMES = {
  bp: 'Blue Pill · STM32F103C8',
  nu: 'Nucleo-64 · STM32L476RG',
  v3: 'STLINK-V3PWR',
  v2: 'ST-LINK/V2',
  meter: 'Multimeter',
  source: '3.3 V source',
} as const;

export const STDC14: Record<string, PinInfo> = {
  '1': p('NC', 'Not connected'),
  '2': p('NC', 'Not connected'),
  '3': p('T_VCC', 'Target voltage sense input (does not power the target)'),
  '4': p('SWDIO', 'Serial Wire Debug data (bidirectional)'),
  '5': p('GND', 'Ground'),
  '6': p('SWCLK', 'Serial Wire Debug clock'),
  '7': p('GND', 'Ground'),
  '8': p('SWO', 'Serial Wire Output trace (optional)'),
  '9': p('NC', 'Key / not connected'),
  '10': p('NC', 'Not connected (JTAG TDI)'),
  '11': p('GNDDetect', 'Ground-detect, tie to GND on target cables'),
  '12': p('NRST', 'Target reset (active low)'),
  '13': p('VCP_RX', 'Virtual COM port RX'),
  '14': p('VCP_TX', 'Virtual COM port TX'),
  VOUT: p('VOUT', 'Programmable, measured power output (1.6 – 3.6 V)'),
  PGND: p('GND', 'Power-output ground'),
};

export const JTAG20: Record<string, PinInfo> = (() => {
  const m: Record<string, PinInfo> = {
    '1': p('VAPP', 'Target voltage sense input (does not power the target)'),
    '2': p('NC', 'Not used'),
    '3': p('TRST', 'JTAG test reset'),
    '5': p('TDI', 'JTAG data in'),
    '7': p('SWDIO/TMS', 'SWD data / JTAG TMS'),
    '9': p('SWCLK/TCK', 'SWD clock / JTAG TCK'),
    '11': p('NC', 'Not used'),
    '13': p('SWO/TDO', 'Trace output / JTAG TDO'),
    '15': p('NRST', 'Target reset (active low)'),
    '17': p('NC', 'Not used'),
    '19': p('NC', 'Not used'),
  };
  for (let i = 4; i <= 20; i += 2) m[String(i)] = p('GND', 'Ground');
  return m;
})();

export const BLUEPILL: Record<string, PinInfo> = {
  '3V3': p('3.3', 'SWD header: 3.3 V rail'),
  DIO: p('IO', 'SWD header: SWDIO (PA13)'),
  CLK: p('CLK', 'SWD header: SWCLK (PA14)'),
  GND: p('GND', 'SWD header: ground'),
  R: p('R', 'Side header: NRST (reset, active low)'),
};

export const NUCLEO: Record<string, PinInfo> = {
  'CN4-1': p('VDD_TARGET', 'CN4 pin 1 · target VDD (reference)'),
  'CN4-2': p('SWCLK', 'CN4 pin 2 · SWCLK'),
  'CN4-3': p('GND', 'CN4 pin 3 · ground'),
  'CN4-4': p('SWDIO', 'CN4 pin 4 · SWDIO'),
  'CN4-5': p('NRST', 'CN4 pin 5 · reset'),
  'CN4-6': p('SWO', 'CN4 pin 6 · trace output'),
  'JP6-1': p('JP6-1', 'IDD jumper · 3V3 supply side'),
  'JP6-2': p('JP6-2', 'IDD jumper · VDD_MCU side'),
  'CN7-8': p('GND', 'Morpho CN7 pin 8 · ground'),
  'CN7-5': p('VDD', 'Morpho CN7 pin 5 · VDD (MCU)'),
};

export const METER: Record<string, PinInfo> = {
  A: p('mA/µA', 'Current input jack (fused)'),
  COM: p('COM', 'Common / negative jack'),
};

export const SOURCE: Record<string, PinInfo> = {
  P: p('+3V3', 'Positive output, 3.3 V'),
  G: p('GND', 'Negative output / ground'),
};

export const PARTS = {
  nu: ['cap-CN2a', 'cap-CN2b', 'cap-JP6'],
  bp: [] as string[],
};
