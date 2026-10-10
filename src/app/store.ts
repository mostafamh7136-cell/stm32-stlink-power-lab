import type { BoardId, ProbeId } from '../data/types';

export interface State {
  board: BoardId; probe: ProbeId; step: number; mode: 'guide' | 'practice';
  showAll: boolean; labels: boolean; autoCam: boolean;
}
type Listener = (s: State, prev: State) => void;

/** Tiny observable store with URL-hash persistence (shareable deep links). */
export class Store {
  private s: State;
  private ls = new Set<Listener>();
  constructor(init: State) { this.s = { ...init, ...Store.fromHash() }; }
  get(): State { return this.s; }
  set(patch: Partial<State>): void {
    const prev = this.s; this.s = { ...prev, ...patch };
    this.ls.forEach((l) => l(this.s, prev));
    const h = `#/${this.s.board}/${this.s.probe}/${this.s.step + 1}${this.s.mode === 'practice' ? '?practice' : ''}`;
    if (location.hash !== h) history.replaceState(null, '', h);
  }
  subscribe(l: Listener): () => void { this.ls.add(l); return () => this.ls.delete(l); }
  static fromHash(): Partial<State> {
    const m = location.hash.match(/^#\/(bp|nu)\/(v3|v2)\/(\d+)(\?practice)?/);
    return m ? { board: m[1] as BoardId, probe: m[2] as ProbeId, step: Math.max(0, +m[3] - 1), mode: m[4] ? 'practice' : 'guide' } : {};
  }
}
