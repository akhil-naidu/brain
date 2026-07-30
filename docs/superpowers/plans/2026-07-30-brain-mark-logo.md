# Brain Mark Logo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the emoji brain mark with dual custom SVGs (detailed UI mark + simplified favicon) using a violet→magenta gradient.

**Architecture:** Static SVG assets are the source of truth. `BrainMark` loads `public/brain-mark.svg` via `<img>` so sidebar and empty state share one detailed file; Next metadata continues to use `app/icon.svg`.

**Tech Stack:** SVG, React (`components/brain-mark.tsx`), Next.js metadata icons

## Global Constraints

- Original artwork only — do not copy Adobe Stock paths
- Gradient: `#4C1D95` → `#DB2777` (horizontal)
- Detailed mark has circuit traces; favicon is silhouette-only
- Do not change teal theme tokens elsewhere
- Do not commit unless the user asks

---

### Task 1: Detailed mark SVG + BrainMark component

**Files:**
- Modify: `public/brain-mark.svg`
- Modify: `components/brain-mark.tsx`
- Existing consumer: `app/_components/brain-chat-shell.tsx` (no change required if API stays)
- Existing consumer: `app/_components/ephemeral-agent-chat.tsx` (size-10 empty state; emoji font-size class becomes unused)

**Interfaces:**
- Produces: `BrainMark({ className?: string })` — same signature; renders detailed SVG

- [x] **Step 1: Write `public/brain-mark.svg`**

Geometric hex-lobed brain, center hex cutout, white circuit traces + nodes, linear gradient `#4C1D95` → `#DB2777`. viewBox `0 0 64 64`.

- [x] **Step 2: Update `components/brain-mark.tsx`**

Inline SVG (avoids `nextjs/no-img-element`); same artwork as `public/brain-mark.svg`.

- [x] **Step 3: Spot-check empty-state usage**

Stripped unused `text-[2.5rem]` from empty-state `BrainMark`.

- [x] **Step 4: Visual check**

Raster preview confirms gradient, center hex, circuit traces.

---

### Task 2: Simplified favicon

**Files:**
- Modify: `app/icon.svg`

**Interfaces:**
- Consumes: same gradient and overall silhouette language as Task 1
- Produces: readable 16–32px favicon without circuit detail

- [x] **Step 1: Write `app/icon.svg`**

Same viewBox and gradient; solid hex-brain silhouette with center cutout; no circuit traces.

- [x] **Step 2: Confirm metadata**

`app/layout.tsx` already references `/icon.svg` — unchanged.

---

### Task 3: Verify

- [x] **Step 1: Run `npm run verify`**

Passed: format, lint, typecheck, 54 tests.

- [x] **Step 2: Done**

No commit unless user requests.
