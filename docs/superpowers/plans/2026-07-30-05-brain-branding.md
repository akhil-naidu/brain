# Plan 05 — Brain Branding

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the app read as **Brain**: straight-line geometric brain mark, teal/navy palette, product naming in metadata and chrome.

**Architecture:** SVG mark used as favicon + sidebar brand. CSS variables for teal/navy primary. No purple-gradient or cream-serif defaults.

**Tech Stack:** SVG, Tailwind CSS variables in `app/globals.css`, Next metadata

## Global Constraints

- Logo: multiple **straight** line segments, tech/circuit feel — not organic blobs.
- Colors: deep teal / navy primary on neutral surfaces.
- Spec: branding section of `docs/superpowers/specs/2026-07-29-brain-chat-ui-design.md`

---

### Task 1: Geometric brain SVG mark

**Files:**
- Create: `app/icon.svg`
- Create: `public/brain-mark.svg` (same artwork if needed for sidebar)
- Create: `components/brain-mark.tsx`
- Modify: `app/layout.tsx` metadata
- Modify: sidebar brand slot from Plan 04

**Interfaces:**
- Produces: `<BrainMark />` React component + favicon

- [ ] **Step 1: Create SVG**

Design constraints:

- ViewBox ~ `0 0 32 32`
- Stroke-based or polygon edges only (straight segments)
- Suggest a faceted brain silhouette (left/right hemispheres as polylines) + optional “circuit” horizontal connectors
- Use `currentColor` for strokes so theme works

Example skeleton (replace with a polished mark; keep straight segments only):

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none">
  <path
    stroke="currentColor"
    stroke-width="1.5"
    stroke-linecap="square"
    stroke-linejoin="miter"
    d="M16 4 L22 6 L26 12 L26 18 L22 24 L16 28 L10 24 L6 18 L6 12 L10 6 Z"
  />
  <path stroke="currentColor" stroke-width="1.5" d="M16 4 L16 28" />
  <path stroke="currentColor" stroke-width="1.25" d="M8 14 L14 14 M18 14 L24 14 M10 19 L14 19 M18 19 L22 19" />
</svg>
```

- [ ] **Step 2: `components/brain-mark.tsx`**

```tsx
import { cn } from "@/lib/utils";

export function BrainMark({ className }: { readonly className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={cn("size-5", className)}
      fill="none"
      viewBox="0 0 32 32"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* same paths as app/icon.svg */}
    </svg>
  );
}
```

- [ ] **Step 3: Wire sidebar + metadata title “Brain”**

- [ ] **Step 4: Commit**

```bash
git add app/icon.svg public/brain-mark.svg components/brain-mark.tsx app/layout.tsx components/chat/sidebar.tsx
git commit -m "$(cat <<'EOF'
Add geometric Brain mark and product naming in chrome.

EOF
)"
```

---

### Task 2: Teal / navy theme tokens

**Files:**
- Modify: `app/globals.css` (`:root` / `.dark` CSS variables)

**Interfaces:**
- Produces: `--primary` and related tokens in teal/navy family

- [ ] **Step 1: Set tokens** (adjust to look good in light + dark)

Example direction (tune as needed):

```css
:root {
  --primary: oklch(0.42 0.08 230);
  --primary-foreground: oklch(0.98 0.01 230);
  --ring: oklch(0.55 0.09 230);
  /* keep neutrals; avoid purple hues */
}
.dark {
  --primary: oklch(0.72 0.09 230);
  --primary-foreground: oklch(0.18 0.03 230);
  --ring: oklch(0.72 0.09 230);
}
```

- [ ] **Step 2: Visual check** — primary buttons / focus rings read teal-navy; no purple wash.

- [ ] **Step 3: Commit**

```bash
git add app/globals.css
git commit -m "$(cat <<'EOF'
Apply teal-navy Brain theme tokens.

EOF
)"
```

---

## Verifiable conclusion

Pass only if **all** are true:

1. Browser tab / favicon shows the Brain SVG (not eve mark)
2. Sidebar shows Brain mark + “Brain” text
3. Document title is Brain
4. Primary accent is teal/navy (not purple)
5. Logo paths are straight-segment geometry (no soft organic curves as the main silhouette)

**Stop here.** Do not start Plan 06 until this checklist passes.
