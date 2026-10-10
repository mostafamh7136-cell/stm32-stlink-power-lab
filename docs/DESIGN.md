# Design

## Layout
`[Steps rail 250px] [3D viewport, flexible] [Instruction panel 390px]`. On screens narrower than 820px these stack vertically.

## Visual system
- Dark "lab at night" palette: background `#0a0f1d`, panels `#111a2e`, accent cyan `#38bdf8`, primary `#2563eb`.
- **Wire colours follow common bench conventions**, and the same colour is used in the 3D view, legend, step dots and connection cards:
  GND black · VDD sense red · SWDIO yellow · SWCLK green · NRST purple · measured supply orange · meter loop blue.
- States: pulsing ring = do this now · cyan = first pin selected · green flash = correct · red = wrong or remove this.

## Interaction flows
1. **Guide:** Next → the camera flies to the step → the wire animates from source to destination → read the tip.
2. **Practice:** click a pin (it turns cyan) → click the destination → ✓ places the wire, ✗ gives a hint. Hint and Show me are always available.
3. **Measure:** choose the power mode (Run, Sleep, Stop…), watch the log-scale trace and switch meter ranges. Warnings explain over-range and burden voltage.

## Accessibility
Keyboard shortcuts for everything, focusable step list, `aria-live` instructions, `role=radiogroup` mode switch, reduced-motion support (no camera tweening), and text alternatives in the panel for every 3D connection.
