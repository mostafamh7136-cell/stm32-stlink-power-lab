import { POWER, formatCurrent, type PowerProfile } from '../data/power';
import type { BoardId, ProbeId } from '../data/types';

/** Live, simulated current-measurement view (CubeMonitor-Power style or multimeter). */
export class PowerPanel {
  private raf = 0;
  private buf: number[] = [];
  private mode = 0;
  private led = true;
  private range: 'mA' | 'uA' = 'mA';
  private t = 0;
  private last = 0;
  private readTimer = 0;
  private readonly profile: PowerProfile;
  private canvas!: HTMLCanvasElement;

  constructor(private readonly host: HTMLElement, board: BoardId, private readonly probe: ProbeId, private readonly onReadout: (main: string, sub: string) => void) {
    this.profile = POWER[board];
    const v3 = probe === 'v3';
    host.innerHTML = `<div class="pw">
      <h4>${v3 ? 'CubeMonitor-Power view' : 'Multimeter reading'} <small>simulated · ${this.profile.chip}</small></h4>
      <div class="chips" data-role="modes">${this.profile.modes.map((m, i) => `<button aria-pressed="${i === 0}" data-i="${i}" title="${m.note}">${m.label}</button>`).join('')}</div>
      <canvas width="700" height="300" aria-label="Simulated current trace"></canvas>
      <div class="reads"><div>Now<b data-r="now">-</b></div><div>Average<b data-r="avg">-</b></div><div>Peak<b data-r="peak">-</b></div></div>
      <div class="row">
        ${board === 'bp' ? `<label><input type="checkbox" data-c="led" checked> ${this.profile.overheadNote} (+${this.profile.boardOverhead_mA} mA)</label>` : ''}
        ${!v3 ? `<span>Range:</span><div class="chips" data-role="range" style="margin:0"><button aria-pressed="true" data-v="mA">mA</button><button aria-pressed="false" data-v="uA">µA</button></div>` : ''}
      </div>
      <div class="alert" data-r="alert"></div>
      <div class="note">Periodic spikes are wake-ups. Values are illustrative datasheet ballparks, not measurements.</div></div>`;
    this.canvas = host.querySelector('canvas')!;
    host.querySelector('[data-role=modes]')!.addEventListener('click', (e) => {
      const b = (e.target as HTMLElement).closest('button'); if (!b) return;
      this.mode = +b.dataset.i!; host.querySelectorAll('[data-role=modes] button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    });
    host.querySelector('[data-c=led]')?.addEventListener('change', (e) => { this.led = (e.target as HTMLInputElement).checked; });
    host.querySelector('[data-role=range]')?.addEventListener('click', (e) => {
      const b = (e.target as HTMLElement).closest('button'); if (!b) return;
      this.range = b.dataset.v as 'mA' | 'uA'; host.querySelectorAll('[data-role=range] button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    });
    this.last = performance.now();
    const loop = (now: number) => { this.step(Math.min((now - this.last) / 1000, 0.1)); this.last = now; this.raf = requestAnimationFrame(loop); };
    this.raf = requestAnimationFrame(loop);
  }

  private sample(): number {
    const m = this.profile.modes[this.mode];
    let i = m.mA * (1 + (Math.random() - 0.5) * 0.06);
    if (this.mode > 0 && (this.t % 2) < 0.03) i = this.profile.modes[0].mA * 0.8; // periodic wake-up
    if (this.mode === 0) i *= 1 + 0.08 * Math.sin(this.t * 9) * Math.sin(this.t * 2.3);
    return i + (this.led ? this.profile.boardOverhead_mA : 0);
  }

  private step(dt: number): void {
    this.t += dt;
    const n = Math.max(1, Math.round(dt * 120));
    for (let k = 0; k < n; k++) { this.buf.push(this.sample()); }
    if (this.buf.length > 1200) this.buf.splice(0, this.buf.length - 1200);
    this.draw();
    this.readTimer += dt;
    if (this.readTimer > 0.25) { this.readTimer = 0; this.updateReads(); }
  }

  private updateReads(): void {
    const b = this.buf.slice(-240); const now = b.at(-1) ?? 0;
    const avg = b.reduce((a, x) => a + x, 0) / Math.max(1, b.length); const peak = Math.max(...b);
    const q = (k: string) => this.host.querySelector(`[data-r=${k}]`) as HTMLElement;
    q('now').textContent = formatCurrent(now); q('avg').textContent = formatCurrent(avg); q('peak').textContent = formatCurrent(peak);
    let alert = '';
    if (this.probe === 'v2') {
      if (this.range === 'uA') {
        if (avg > 4) { this.onReadout('OL', 'µA DC · over range'); alert = 'Over range on µA. The high burden voltage can also brown out the MCU. Switch to mA.'; }
        else this.onReadout((avg * 1000).toFixed(1), 'µA DC');
      } else {
        this.onReadout(avg.toFixed(2), 'mA DC');
        if (avg < 0.05) alert = 'Reads close to 0.00 mA. Switch to the µA range for low-power modes.';
      }
    }
    q('alert').textContent = alert;
  }

  private draw(): void {
    const c = this.canvas, g = c.getContext('2d')!, W = c.width, H = c.height;
    g.fillStyle = '#060a14'; g.fillRect(0, 0, W, H);
    const lo = Math.log10(1e-5), hi = Math.log10(100); // 10 nA … 100 mA
    const y = (mA: number) => H - ((Math.log10(Math.max(mA, 1e-5)) - lo) / (hi - lo)) * (H - 20) - 10;
    g.font = '18px system-ui'; g.fillStyle = '#64748b'; g.strokeStyle = '#1e293b'; g.lineWidth = 1;
    [[1e-5, '10 nA'], [1e-3, '1 µA'], [0.1, '100 µA'], [10, '10 mA']].forEach(([v, l]) => { const yy = y(v as number); g.beginPath(); g.moveTo(0, yy); g.lineTo(W, yy); g.stroke(); g.fillText(l as string, 8, yy - 4); });
    const pts = this.buf.slice(-W); const x0 = W - pts.length;
    g.beginPath(); pts.forEach((v, i) => (i ? g.lineTo(x0 + i, y(v)) : g.moveTo(x0 + i, y(v))));
    g.strokeStyle = '#38bdf8'; g.lineWidth = 2.2; g.stroke();
    g.lineTo(W, H); g.lineTo(x0, H); g.closePath(); g.fillStyle = '#38bdf81a'; g.fill();
  }

  destroy(): void { cancelAnimationFrame(this.raf); this.host.innerHTML = ''; }
}
