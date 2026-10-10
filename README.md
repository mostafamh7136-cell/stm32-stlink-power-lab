# ⚡ STM32 ⇄ ST-LINK Power Lab

An interactive 3D, step-by-step guide to **wiring an STM32 board to an ST-LINK probe so you can take power (current) readings**.

**Live:** see the repository's *About* link (GitHub Pages / Vercel).

![stack](https://img.shields.io/badge/three.js-r169-000?logo=three.js) ![ts](https://img.shields.io/badge/TypeScript-strict-3178c6?logo=typescript) ![vite](https://img.shields.io/badge/Vite-5-646cff?logo=vite)

## Features
- **4 setups:** Blue Pill (STM32F103C8) or Nucleo-64 (STM32L476RG) × STLINK-V3PWR (built-in power meter) or ST-LINK/V2 + multimeter.
- **Real 3D component models.** The LQFP MCUs, pin headers, STDC14, the 20-pin IDC, USB connectors, the terminal block, the crystal, switches and passives come from the official **KiCad 3D library**. They are converted from STEP to glTF by `scripts/convert-step.mjs`.
- **Guide mode:** each wire is drawn with an animation, target pins pulse, and the camera flies to the step.
- **Practice mode:** click the source pin, then the destination pin. It checks your answer, counts mistakes, and offers hints or "Show me".
- **Pin inspector:** click any pin to see its function and the step that uses it.
- **Jumper-removal animation** for the Nucleo CN2 and IDD (JP6) jumpers.
- **Live power simulator:** a CubeMonitor-Power-style log-scale trace, or a multimeter with mA/µA ranges, over-range and burden warnings, and the reading shown on the 3D meter's display.
- **Final review table**, shareable deep links (`#/nu/v2/4?practice`), keyboard shortcuts, screenshots, fullscreen, a responsive layout, and reduced-motion support.

## Quick start
```bash
npm ci
npm run dev        # http://localhost:5173
npm test           # data-integrity tests (vitest)
npm run build      # typecheck + production build → dist/
```

## Docs
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): system design, modules, data flow
- [docs/PLAN.md](docs/PLAN.md): goals, milestones, roadmap, risks
- [docs/DESIGN.md](docs/DESIGN.md): UX flows, visual system, accessibility
- [CREDITS.md](CREDITS.md): 3D model licensing

> ⚠️ The board outlines and enclosures are simplified. Always match the silkscreen labels on your own hardware. Current values in the simulator are illustrative.
