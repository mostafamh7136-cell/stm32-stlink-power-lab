import './styles.css';
import { preloadModels } from './scene/assets';
import { App } from './app/App';

function webglOk(): boolean {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}

async function boot(): Promise<void> {
  const loading = document.getElementById('loading')!;
  const text = document.getElementById('loading-text')!;
  const bar = document.getElementById('loading-bar')!;
  if (!webglOk()) { text.textContent = 'Your browser or device does not support WebGL, which this 3D guide needs.'; return; }
  try {
    await preloadModels((d, t) => { bar.style.width = `${(d / t) * 100}%`; text.textContent = `Loading real 3D component models… ${d}/${t}`; });
    new App().start();
    loading.classList.add('done');
  } catch (err) {
    console.error(err);
    text.textContent = 'Could not load the 3D models. Check your connection and reload.';
  }
}
boot();
