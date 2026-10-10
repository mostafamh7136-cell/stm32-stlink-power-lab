import type { BoardId } from './types';

export interface PowerMode { id: string; label: string; mA: number; note: string }
export interface PowerProfile { chip: string; modes: PowerMode[]; boardOverhead_mA: number; overheadNote: string }

/** Illustrative typical values (datasheet ballpark); real firmware will differ. */
export const POWER: Record<BoardId, PowerProfile> = {
  bp: {
    chip: 'STM32F103C8 @ 72 MHz',
    boardOverhead_mA: 2.2,
    overheadNote: 'Blue Pill PWR LED + regulator back-feed',
    modes: [
      { id: 'run', label: 'Run', mA: 30, note: 'CPU at 72 MHz with peripherals on' },
      { id: 'sleep', label: 'Sleep', mA: 11, note: 'CPU stopped, peripherals running' },
      { id: 'stop', label: 'Stop', mA: 0.024, note: 'Clocks off, SRAM retained' },
      { id: 'standby', label: 'Standby', mA: 0.0035, note: 'Only wake-up logic powered' },
    ],
  },
  nu: {
    chip: 'STM32L476RG @ 80 MHz (IDD jumper)',
    boardOverhead_mA: 0,
    overheadNote: 'IDD measures the MCU only',
    modes: [
      { id: 'run', label: 'Run', mA: 10.2, note: 'CPU at 80 MHz from flash' },
      { id: 'sleep', label: 'Sleep', mA: 2.7, note: 'CPU stopped, peripherals running' },
      { id: 'stop2', label: 'Stop 2', mA: 0.0012, note: 'SRAM retained, fast wake-up' },
      { id: 'standby', label: 'Standby', mA: 0.00035, note: 'SRAM2 retained' },
      { id: 'shutdown', label: 'Shutdown', mA: 0.00003, note: 'Lowest-power mode' },
    ],
  },
};

export function formatCurrent(mA: number): string {
  if (mA >= 1) return `${mA.toFixed(mA >= 100 ? 0 : 2)} mA`;
  if (mA >= 0.001) return `${(mA * 1000).toFixed(mA >= 0.1 ? 0 : 1)} µA`;
  return `${(mA * 1e6).toFixed(0)} nA`;
}
