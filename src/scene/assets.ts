import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

/** Real component models converted from the official KiCad 3D library (STEP → glTF, see scripts/). */
export const MODELS = {
  lqfp48: 'LQFP-48_7x7mm_P0.5mm',
  lqfp64: 'LQFP-64_10x10mm_P0.5mm',
  h1x02: 'PinHeader_1x02_P2.54mm_Vertical',
  h1x04: 'PinHeader_1x04_P2.54mm_Vertical',
  h1x06: 'PinHeader_1x06_P2.54mm_Vertical',
  h1x20: 'PinHeader_1x20_P2.54mm_Vertical',
  h2x03: 'PinHeader_2x03_P2.54mm_Vertical',
  h2x19: 'PinHeader_2x19_P2.54mm_Vertical',
  h2x07f: 'PinHeader_2x07_P1.27mm_Vertical',
  idc2x10: 'IDC-Header_2x10_P2.54mm_Vertical',
  usbMicro: 'USB_Micro-B_Molex_47346-0001',
  usbMini: 'USB_Mini-B_Lumberg_2486_01_Horizontal',
  xtal: 'Crystal_SMD_3225-4Pin_3.2x2.5mm',
  led: 'LED_0603_1608Metric',
  res: 'R_0603_1608Metric',
  cap: 'C_0603_1608Metric',
  sot223: 'SOT-223',
  button: 'SW_SPST_TL3342',
  terminal: 'PhoenixContact_MC_1_5_2-G-3.81_1x02_P3.81mm_Horizontal',
} as const;
export type ModelKey = keyof typeof MODELS;

const cache = new Map<ModelKey, THREE.Object3D>();

export async function preloadModels(onProgress: (done: number, total: number) => void): Promise<void> {
  const loader = new GLTFLoader();
  const keys = Object.keys(MODELS) as ModelKey[];
  let done = 0;
  await Promise.all(keys.map(async (k) => {
    const gltf = await loader.loadAsync(`${import.meta.env.BASE_URL}models/${MODELS[k]}.glb`);
    gltf.scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; }
    });
    cache.set(k, gltf.scene);
    onProgress(++done, keys.length);
  }));
}

/** Cheap instance: geometry + materials are shared between clones. */
export function model(key: ModelKey): THREE.Object3D {
  const src = cache.get(key);
  if (!src) throw new Error(`Model not loaded: ${key}`);
  return src.clone(true);
}
