# Architecture

## Overview
A static single-page app with no backend. TypeScript and three.js are built by Vite and served from a CDN (GitHub Pages or Vercel).

```mermaid
flowchart LR
  subgraph Build time
    STEP[KiCad STEP models] -->|occt-import-js + glTF-Transform<br/>scripts/convert-step.mjs| GLB[public/models/*.glb<br/>quantized, deduped]
  end
  subgraph Runtime (browser)
    main[main.ts<br/>WebGL check + preload] --> App
    App[app/App.ts<br/>UI controller] <--> Store[app/store.ts<br/>state + URL hash]
    App --> Lab[scene/Lab.ts<br/>scenario → 3D]
    Lab --> Stage[scene/Stage.ts<br/>renderer, camera, picking]
    Lab --> Devices[scene/devices/*<br/>assemblies + pin anchors]
    Lab --> Wire[scene/Wire.ts<br/>animated jumpers]
    App --> Power[ui/PowerPanel.ts<br/>current simulator]
    Data[(data/*<br/>catalog, scenarios, power)] --> App & Lab
  end
  GLB --> Devices
```

## Layers
| Layer | Path | Responsibility | Depends on |
|---|---|---|---|
| **Data** | `src/data` | Pure, typed content: pin catalogs, step scenarios, power profiles. No DOM or three.js. | none |
| **Scene** | `src/scene` | Builds 3D devices from data and renders a step's state (wires, markers, jumper caps, camera). | three, data |
| **App/UI** | `src/app`, `src/ui` | State, DOM rendering, input, practice-mode logic, simulator. | scene, data |

## Key concepts
- **Scenario** = `buildScenario(board, probe)`. It returns the device *roles* (`probe`, `board`, `meter`, `source`) and ordered **steps**. Each step has `wires`, `highlight`, `remove` and flags. Pin references are strings like `probe:4` or `board:JP6-2`.
- **Assembly**: a device's `THREE.Group`, plus `pins` (anchors with exit direction and plug type) and `parts` (removable objects).
  Models follow the KiCad convention: origin at pin 1, pins along −Y, second column at +X. Pin positions are computed from pitch rather than read from the meshes.
- **State → render** is idempotent. `Lab.render(step, opts)` derives every wire and marker state from the step index, mode and the set of placed wires, so jumping to any step is consistent.
- **Coordinates**: Z-up, millimetres, so the scene matches the real component dimensions.

## Quality
- `tsc --strict`. **Vitest** checks that every wire endpoint exists in the catalog, there are no duplicate or self connections, parts referenced for removal exist, and power profiles are ordered.
- CI (`.github/workflows/ci.yml`) runs typecheck, tests and build. `deploy.yml` publishes to GitHub Pages.
- Performance: shared geometry and materials across clones, quantized meshes (about 1 MB for all models), three.js split into its own chunk, DPR capped at 2.
- Security headers and caching in `vercel.json`. No user content is rendered as HTML.
