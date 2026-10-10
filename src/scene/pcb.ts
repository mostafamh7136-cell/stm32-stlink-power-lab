import * as THREE from 'three';

export interface Silk {
  text(x: number, y: number, s: string, size?: number, opts?: { align?: CanvasTextAlign; rot?: number; color?: string; bold?: boolean }): void;
  rect(x: number, y: number, w: number, h: number, color: string, fill?: boolean): void;
  line(x1: number, y1: number, x2: number, y2: number, color?: string, dash?: number[]): void;
  circle(x: number, y: number, r: number, color: string): void;
}

const PX_PER_MM = 14;

/** Draws a texture in board millimetres (origin at board centre, +Y up). */
export function drawTexture(w: number, h: number, bg: string, ink: string, draw: (s: Silk) => void): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = Math.round(w * PX_PER_MM); c.height = Math.round(h * PX_PER_MM);
  const g = c.getContext('2d')!;
  const X = (x: number) => (x + w / 2) * PX_PER_MM;
  const Y = (y: number) => (h / 2 - y) * PX_PER_MM;
  g.fillStyle = bg; g.fillRect(0, 0, c.width, c.height);
  const silk: Silk = {
    text(x, y, s, size = 1.2, o = {}) {
      g.save(); g.translate(X(x), Y(y)); if (o.rot) g.rotate((-o.rot * Math.PI) / 180);
      g.fillStyle = o.color ?? ink; g.font = `${o.bold ? 700 : 600} ${size * PX_PER_MM}px "Inter", system-ui, sans-serif`;
      g.textAlign = o.align ?? 'center'; g.textBaseline = 'middle'; g.fillText(s, 0, 0); g.restore();
    },
    rect(x, y, rw, rh, color, fill = false) {
      g.strokeStyle = color; g.fillStyle = color; g.lineWidth = 0.18 * PX_PER_MM;
      const args = [X(x - rw / 2), Y(y + rh / 2), rw * PX_PER_MM, rh * PX_PER_MM] as const;
      fill ? g.fillRect(...args) : g.strokeRect(...args);
    },
    line(x1, y1, x2, y2, color = ink, dash = []) {
      g.strokeStyle = color; g.lineWidth = 0.2 * PX_PER_MM; g.setLineDash(dash.map((d) => d * PX_PER_MM));
      g.beginPath(); g.moveTo(X(x1), Y(y1)); g.lineTo(X(x2), Y(y2)); g.stroke(); g.setLineDash([]);
    },
    circle(x, y, r, color) { g.fillStyle = color; g.beginPath(); g.arc(X(x), Y(y), r * PX_PER_MM, 0, Math.PI * 2); g.fill(); },
  };
  draw(silk);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  return tex;
}

/** A slab whose top face (z = 0) carries a drawn texture. Used for PCBs and enclosure tops. */
export function slab(w: number, h: number, t: number, side: string, top: THREE.Texture, opts: { roughness?: number; metalness?: number } = {}): THREE.Mesh {
  const sideMat = new THREE.MeshStandardMaterial({ color: side, roughness: 0.7 });
  const topMat = new THREE.MeshStandardMaterial({ map: top, roughness: opts.roughness ?? 0.55, metalness: opts.metalness ?? 0 });
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, t), [sideMat, sideMat, sideMat, sideMat, topMat, sideMat]);
  m.position.z = -t / 2; m.castShadow = true; m.receiveShadow = true;
  return m;
}

export function box(w: number, h: number, d: number, color: string, opts: { roughness?: number; metalness?: number } = {}): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ color, roughness: opts.roughness ?? 0.6, metalness: opts.metalness ?? 0 }));
  m.castShadow = true; m.receiveShadow = true;
  return m;
}
