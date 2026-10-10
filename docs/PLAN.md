# Plan

## Goal
Help a maker go from parts on the desk to a trustworthy current reading without a mis-wire. Teach the *why* (sense vs supply, IDD, debug-session leakage) as well as the *what*.

## Users
1. Hobbyists with a Blue Pill and a cheap ST-LINK/V2 plus a multimeter.
2. Engineers with a Nucleo and an STLINK-V3PWR doing low-power firmware.

## Milestones
| # | Milestone | Status |
|---|---|---|
| M1 | Content model and 4 scenarios, with tests | ✅ |
| M2 | Asset pipeline: KiCad STEP → glTF | ✅ |
| M3 | 3D stage, devices, animated wires, camera direction | ✅ |
| M4 | Guide and practice modes, pin inspector, review | ✅ |
| M5 | Power simulator (V3PWR trace / multimeter ranges) | ✅ |
| M6 | CI, Pages/Vercel deploy, docs | ✅ |
| M7 | More boards (Black Pill, Nucleo-32/144), STLINK-V3MINIE | ⏳ |
| M8 | Upload your own CubeMonitor-Power CSV and overlay it on the simulator | ⏳ |
| M9 | i18n, PWA offline mode, Playwright visual regression | ⏳ |

## Risks and mitigations
- **Pinout differences between board revisions:** silkscreen labels are prominent and the docs tell users to match labels.
- **Heavy WebGL on low-end phones:** quantized meshes, capped DPR, and a fallback message when WebGL is missing.
- **Model licensing:** KiCad CC-BY-SA, attributed in the UI and CREDITS.
