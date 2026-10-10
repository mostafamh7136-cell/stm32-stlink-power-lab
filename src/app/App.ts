import { buildScenario } from '../data/scenarios';
import { STDC14, JTAG20, BLUEPILL, NUCLEO, METER, SOURCE, DEVICE_NAMES } from '../data/catalog';
import type { PinRef, Scenario, WireSpec } from '../data/types';
import { Stage } from '../scene/Stage';
import { Lab, wireKey } from '../scene/Lab';
import { WIRE_COLORS } from '../scene/Wire';
import { PowerPanel } from '../ui/PowerPanel';
import { Store, type State } from './store';

const $ = <T extends HTMLElement = HTMLElement>(s: string) => document.querySelector(s) as T;
const LEGEND: [keyof typeof WIRE_COLORS, string][] = [['gnd', 'GND'], ['vcc', 'VDD sense'], ['dio', 'SWDIO'], ['clk', 'SWCLK'], ['rst', 'NRST'], ['pwr', 'Measured supply'], ['meter', 'Meter loop']];
const legendColor = (c: string) => (c === WIRE_COLORS.gnd ? '#4b5563' : c);

export class App {
  private readonly store = new Store({ board: 'bp', probe: 'v3', step: 0, mode: 'guide', showAll: false, labels: false, autoCam: true });
  private readonly stage: Stage;
  private readonly lab: Lab;
  private sc!: Scenario;
  private placed = new Set<string>();
  private pending: PinRef | null = null;
  private mistakes = 0;
  private power: PowerPanel | null = null;
  private toastTimer = 0;

  constructor() {
    this.stage = new Stage($('#viewport'));
    this.lab = new Lab(this.stage);
    // Diagnostics hook used by the e2e smoke test (read-only use).
    (window as unknown as { __powerLab: unknown }).__powerLab = { stage: this.stage, lab: this.lab, store: this.store };
  }

  start(): void {
    const s = this.store.get();
    ($('#board') as HTMLSelectElement).value = s.board; ($('#probe') as HTMLSelectElement).value = s.probe;
    this.bindUi();
    this.loadScenario(true);
    this.store.subscribe((n, p) => this.onState(n, p));
    $('#legend').innerHTML = LEGEND.map(([k, l]) => `<span><i class="sw" style="background:${legendColor(WIRE_COLORS[k])}"></i>${l}</span>`).join('');
  }

  private loadScenario(first = false): void {
    const s = this.store.get();
    this.sc = buildScenario(s.board, s.probe);
    this.lab.load(this.sc);
    this.placed.clear(); this.pending = null; this.mistakes = 0;
    const step = Math.min(s.step, this.sc.steps.length - 1);
    if (step !== s.step) this.store.set({ step });
    this.renderStep(true);
    if (first && step === 0) this.lab.overview();
  }

  private onState(n: State, p: State): void {
    if (n.board !== p.board || n.probe !== p.probe) { this.loadScenario(); this.lab.overview(); return; }
    if (n.mode !== p.mode) { this.placed.clear(); this.pending = null; this.mistakes = 0; }
    this.stage.autoCamera = n.autoCam;
    this.lab.showAllLabels = n.labels;
    this.renderStep(n.step !== p.step || n.mode !== p.mode);
  }

  private renderStep(animate: boolean): void {
    const s = this.store.get(); const st = this.sc.steps[s.step];
    const practice = s.mode === 'practice' && st.wires.length > 0;
    this.lab.showAllLabels = s.labels;
    this.lab.render(s.step, { practice, placed: this.placed, showAll: s.showAll, animate });
    if (practice && this.pending) this.lab.setMarker(this.pending, 'pending');

    // steps list
    $('#steps').innerHTML = this.sc.steps.map((x, i) => `<li class="${i === s.step ? 'cur' : ''} ${i < s.step ? 'done' : ''}" data-i="${i}" tabindex="0">
      <span class="n">${i < s.step ? '✓' : i + 1}</span><span>${x.title}</span>
      <span class="dots">${x.wires.map((w) => `<i style="background:${legendColor(WIRE_COLORS[w.color])}"></i>`).join('')}</span></li>`).join('');

    // panel
    const conns = st.wires.map((w) => this.connHtml(w, practice)).join('');
    const review = st.review ? this.reviewTable() : '';
    $('#step-body').innerHTML = `<div class="kicker">Step ${s.step + 1} of ${this.sc.steps.length}${practice ? ' · Practice' : ''}</div><h2>${st.title}</h2>${conns}${st.html}${review}`;
    $('#progress').style.width = `${(s.step / (this.sc.steps.length - 1)) * 100}%`;
    $('#count').textContent = `${s.step + 1} / ${this.sc.steps.length}`;
    ($('#prev') as HTMLButtonElement).disabled = s.step === 0;
    ($('#next') as HTMLButtonElement).disabled = s.step === this.sc.steps.length - 1;

    // practice HUD
    const hud = $('#hud');
    if (practice) {
      const done = st.wires.filter((w) => this.placed.has(wireKey(w))).length;
      hud.hidden = false;
      hud.innerHTML = `<span>🎯 Click the two pins to connect · <b>${done}/${st.wires.length}</b> placed · ${this.mistakes} mistake${this.mistakes === 1 ? '' : 's'}</span>
        <button data-a="hint">Hint</button><button data-a="reveal">Show me</button>`;
    } else hud.hidden = true;

    // power simulator
    if (animate || !this.power) {
      this.power?.destroy(); this.power = null;
      if (st.power) this.power = new PowerPanel($('#power'), this.sc.board, this.sc.probe, (m, sub) => this.lab.setReadout(m, sub));
      else this.lab.setReadout('0.000', 'DC A');
    }
  }

  private pinName(ref: PinRef): string {
    const [role, id] = ref.split(':');
    const cat = role === 'probe' ? (this.sc.probe === 'v3' ? STDC14 : JTAG20) : role === 'board' ? (this.sc.board === 'bp' ? BLUEPILL : NUCLEO) : role === 'meter' ? METER : SOURCE;
    const dev = role === 'probe' ? DEVICE_NAMES[this.sc.probe] : role === 'board' ? DEVICE_NAMES[this.sc.board] : DEVICE_NAMES[role as 'meter' | 'source'];
    const num = /^\d+$/.test(id) ? ` pin ${id}` : '';
    return `<b>${cat[id].label}</b> <span style="color:var(--mut)">${dev.split(' · ')[0]}${num}</span>`;
  }

  private connHtml(w: WireSpec, practice: boolean): string {
    const placed = this.placed.has(wireKey(w));
    const hide = practice && !placed;
    return `<div class="conn ${placed ? 'placed' : ''}"><i class="sw" style="background:${legendColor(WIRE_COLORS[w.color])}"></i>
      ${hide ? '<span style="color:var(--mut)">Find this connection in 3D…</span>' : `${this.pinName(w.from)} <span class="arrow">→</span> ${this.pinName(w.to)}`}${placed ? ' ✓' : ''}</div>`;
  }

  private reviewTable(): string {
    const rows = this.sc.steps.flatMap((s, i) => s.wires.map((w) => `<tr><td>${i + 1}</td><td>${this.pinName(w.from)}</td><td>${this.pinName(w.to)}</td><td><i class="sw" style="background:${legendColor(WIRE_COLORS[w.color])}"></i></td></tr>`));
    return `<p>Compare your hardware against every connection before you power up:</p><table><tr><th>#</th><th>From</th><th>To</th><th></th></tr>${rows.join('')}</table>`;
  }

  private onPick(key: PinRef | null): void {
    const s = this.store.get(); const st = this.sc.steps[s.step];
    if (!key) { $('#inspector').hidden = true; return; }
    if (s.mode === 'practice' && st.wires.length) return this.practicePick(key, st.wires);
    this.inspect(key);
  }

  private practicePick(key: PinRef, wires: WireSpec[]): void {
    if (!this.pending) { this.pending = key; this.lab.setMarker(key, 'pending'); return; }
    if (this.pending === key) { this.lab.setMarker(key, 'idle'); this.pending = null; return; }
    const a = this.pending; this.pending = null;
    const hit = wires.find((w) => !this.placed.has(wireKey(w)) && ((w.from === a && w.to === key) || (w.from === key && w.to === a)));
    if (hit) {
      this.placed.add(wireKey(hit));
      this.renderStep(false);
      this.lab.setMarker(a, 'ok'); this.lab.setMarker(key, 'ok');
      const all = wires.every((w) => this.placed.has(wireKey(w)));
      this.toast(all ? '✅ Step complete. Press Next →' : '✓ Correct connection', 'ok');
    } else {
      this.mistakes++;
      const startsRight = wires.some((w) => !this.placed.has(wireKey(w)) && (w.from === a || w.to === a));
      this.renderStep(false);
      this.lab.setMarker(a, 'error'); this.lab.setMarker(key, 'error');
      this.toast(startsRight ? '✗ Right first pin, wrong destination. Try again.' : '✗ That pin isn\'t part of this step. Use Hint if you\'re stuck.', 'bad');
    }
  }

  private inspect(key: PinRef): void {
    const m = this.lab.marker(key); if (!m) return;
    const uses = this.sc.steps.flatMap((s, i) => s.wires.filter((w) => w.from === key || w.to === key).map((w) => ({ w, i })));
    const el = $('#inspector'); el.hidden = false;
    el.innerHTML = `<button class="x" aria-label="Close">×</button><div class="dev">${m.asm.name}</div><h3>${m.pin.info.label}${/^\d+$/.test(m.pin.id) ? ` · pin ${m.pin.id}` : ''}</h3>
      <p>${m.pin.info.detail}</p>${uses.length ? uses.map(({ w, i }) => `<button data-step="${i}">Step ${i + 1}: → ${this.pinName(w.from === key ? w.to : w.from)}</button>`).join('') : '<p class="small">Not used in this setup.</p>'}`;
    el.querySelector('.x')!.addEventListener('click', () => (el.hidden = true));
    el.querySelectorAll<HTMLButtonElement>('[data-step]').forEach((b) => b.addEventListener('click', () => this.go(+b.dataset.step!)));
  }

  private toast(msg: string, kind: 'ok' | 'bad' | '' = ''): void {
    const t = $('#toast'); t.textContent = msg; t.className = `toast show ${kind}`;
    clearTimeout(this.toastTimer); this.toastTimer = window.setTimeout(() => (t.className = 'toast'), 2600);
  }

  private go(i: number): void {
    const n = Math.max(0, Math.min(this.sc.steps.length - 1, i));
    if (n !== this.store.get().step) { this.pending = null; this.store.set({ step: n }); }
  }

  private toggle(k: 'showAll' | 'labels' | 'autoCam', btn: string): void {
    const v = !this.store.get()[k]; this.store.set({ [k]: v } as Partial<State>);
    $(btn).setAttribute('aria-pressed', String(v));
  }

  private bindUi(): void {
    this.stage.onPick = (o) => this.onPick(this.lab.markerFromObject(o)?.key ?? null);
    this.stage.onHover = (o) => {
      const m = this.lab.markerFromObject(o);
      document.querySelectorAll('.lbl-pin.hover').forEach((e) => e.classList.remove('hover'));
      if (m) { m.label.visible = true; m.label.element.classList.add('hover'); }
      else this.renderStepLabelsOnly();
    };
    $('#board').addEventListener('change', (e) => this.store.set({ board: (e.target as HTMLSelectElement).value as State['board'], step: 0 }));
    $('#probe').addEventListener('change', (e) => this.store.set({ probe: (e.target as HTMLSelectElement).value as State['probe'], step: 0 }));
    document.querySelectorAll<HTMLButtonElement>('.seg button').forEach((b) => b.addEventListener('click', () => this.setMode(b.dataset.mode as State['mode'])));
    this.setMode(this.store.get().mode, false);
    $('#prev').addEventListener('click', () => this.go(this.store.get().step - 1));
    $('#next').addEventListener('click', () => this.go(this.store.get().step + 1));
    $('#steps').addEventListener('click', (e) => { const li = (e.target as HTMLElement).closest('li'); if (li) this.go(+li.dataset.i!); });
    $('#steps').addEventListener('keydown', (e) => { const li = (e.target as HTMLElement).closest('li'); if (li && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); this.go(+li.dataset.i!); } });
    $('#tg-labels').addEventListener('click', () => this.toggle('labels', '#tg-labels'));
    $('#tg-all').addEventListener('click', () => this.toggle('showAll', '#tg-all'));
    $('#tg-cam').addEventListener('click', () => this.toggle('autoCam', '#tg-cam'));
    $('#btn-overview').addEventListener('click', () => this.lab.overview());
    $('#btn-full').addEventListener('click', () => (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen()));
    $('#btn-help').addEventListener('click', () => ($('#help') as HTMLDialogElement).showModal());
    $('#btn-shot').addEventListener('click', () => { const a = document.createElement('a'); a.href = this.stage.snapshot(); a.download = `power-lab-${this.sc.board}-${this.sc.probe}-step${this.store.get().step + 1}.png`; a.click(); });
    $('#hud').addEventListener('click', (e) => {
      const a = (e.target as HTMLElement).closest('button')?.dataset.a; const st = this.sc.steps[this.store.get().step];
      const next = st.wires.find((w) => !this.placed.has(wireKey(w)));
      if (!next) return;
      if (a === 'hint') { this.lab.setMarker(next.from, 'target', WIRE_COLORS[next.color]); this.toast('💡 Start from the glowing pin.'); }
      if (a === 'reveal') { st.wires.forEach((w) => this.placed.add(wireKey(w))); this.renderStep(false); }
    });
    window.addEventListener('keydown', (e) => {
      if ((e.target as HTMLElement).closest('input,select,textarea') || e.metaKey || e.ctrlKey) return;
      const k = e.key.toLowerCase();
      if (k === 'arrowright') this.go(this.store.get().step + 1);
      else if (k === 'arrowleft') this.go(this.store.get().step - 1);
      else if (k === 'p') this.setMode(this.store.get().mode === 'guide' ? 'practice' : 'guide');
      else if (k === 'l') this.toggle('labels', '#tg-labels');
      else if (k === 'a') this.toggle('showAll', '#tg-all');
      else if (k === 'c') this.toggle('autoCam', '#tg-cam');
      else if (k === 'o') this.lab.overview();
      else if (k === 'f') $('#btn-full').click();
      else if (k === '?') ($('#help') as HTMLDialogElement).showModal();
      else if (k === 'escape') $('#inspector').hidden = true;
    });
    window.addEventListener('hashchange', () => { const h = Store.fromHash(); if (h.board) { ($('#board') as HTMLSelectElement).value = h.board; ($('#probe') as HTMLSelectElement).value = h.probe!; this.store.set(h); } });
  }

  private renderStepLabelsOnly(): void {
    /* restore label visibility to step state without re-animating */
    const s = this.store.get(); const st = this.sc.steps[s.step];
    const practice = s.mode === 'practice' && st.wires.length > 0;
    this.lab.render(s.step, { practice, placed: this.placed, showAll: s.showAll, animate: false });
    if (practice && this.pending) this.lab.setMarker(this.pending, 'pending');
  }

  private setMode(mode: State['mode'], apply = true): void {
    document.querySelectorAll<HTMLButtonElement>('.seg button').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.mode === mode)));
    if (apply) { this.store.set({ mode }); this.toast(mode === 'practice' ? '🎯 Practice: click the source pin, then the destination pin.' : '📘 Guide mode'); }
  }
}
