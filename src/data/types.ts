export type BoardId = 'bp' | 'nu';
export type ProbeId = 'v3' | 'v2';
export type Role = 'probe' | 'board' | 'meter' | 'source';
export type PinRef = `${Role}:${string}`;
export type PartRef = `${Role}:${string}`;
export type WireColor = 'gnd' | 'vcc' | 'dio' | 'clk' | 'rst' | 'pwr' | 'meter';

export interface WireSpec {
  from: PinRef;
  to: PinRef;
  color: WireColor;
}

export interface Step {
  id: string;
  title: string;
  /** Trusted, author-controlled HTML (never user input). */
  html: string;
  wires: WireSpec[];
  highlight: PinRef[];
  /** Parts (e.g. jumper caps) that get removed in this step. */
  remove: PartRef[];
  /** Show the live power-measurement simulator. */
  power?: boolean;
  /** Final review step: show everything. */
  review?: boolean;
}

export interface Scenario {
  board: BoardId;
  probe: ProbeId;
  roles: Role[];
  steps: Step[];
}

export interface PinInfo {
  label: string;
  detail: string;
}
