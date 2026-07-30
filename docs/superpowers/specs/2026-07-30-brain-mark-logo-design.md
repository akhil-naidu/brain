# Brain mark logo design

**Date:** 2026-07-30  
**Status:** approved for planning

## Goal

Replace the emoji brain mark (`🧠`) with a custom geometric SVG logo inspired by a hexagonal circuit-brain reference — original artwork, not a stock path copy.

## Decisions

| Topic | Choice |
| --- | --- |
| Color | Violet → magenta horizontal gradient (`#4C1D95` → `#DB2777`) |
| Detail | Dual assets: detailed mark for UI; simplified silhouette for favicon |
| Delivery | Dual static SVGs under the existing public / app icon paths |

## Visual design

- Geometric brain built from interlocking hex-like lobes
- Vertical left/right hemisphere split; empty center hex cutout
- White circuit traces with terminal dots (detailed mark only)
- Flat, tech/AI aesthetic; mirrored composition
- Original custom paths — do not trace or embed Adobe Stock artwork

## Assets & wiring

| File | Responsibility |
| --- | --- |
| `public/brain-mark.png` | Detailed circuit-hex mark (generated from reference via image model) |
| `public/brain-mark.svg` | Same mark embedded for SVG consumers |
| `app/icon.png` | Favicon (simplified/resized from the same artwork) |
| `components/brain-mark.tsx` | Renders `/brain-mark.png` via `next/image`; no emoji |

Existing consumer: sidebar brand in `BrainChatShell` via `BrainMark`. Metadata icons point at `/icon.png` in `app/layout.tsx`.

## Generation notes

Hand-drawn geometric SVG was too dissimilar to the reference. Final artwork was generated with Cursor image generation using the user’s reference screenshot, then cropped/trimmed with transparent background for UI use. Nano Banana skill links in this environment were broken, so the built-in image model with reference images was used instead.

## Out of scope

- Changing product name, theme tokens, or primary teal brand colors elsewhere in the UI
- New marketing / landing surfaces
- Animated logo

## Success criteria

- Sidebar shows the detailed custom mark (no emoji)
- Browser tab / app icon shows the simplified custom mark
- Both share the violet → magenta gradient
- `npm run verify` still passes
