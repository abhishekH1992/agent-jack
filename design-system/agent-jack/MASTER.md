# Design System Master File

> **LOGIC:** When building a specific page, first check `design-system/pages/[page-name].md`.
> If that file exists, its rules **override** this Master file.
> If not, strictly follow the rules below.

---

**Project:** Agent Jack  
**Generated:** 2026-08-12  
**Category:** Restaurant / QR table ordering  
**Source:** [ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill)  
**Platform priority:** Mobile-first (375 → 640 → 1024 → 1440)

---

## Global Rules

### Color Palette

| Role | Hex | CSS Variable |
|------|-----|--------------|
| Primary | `#EA580C` | `--color-primary` / `--brand` |
| On Primary | `#FFFFFF` | `--color-on-primary` |
| Secondary | `#F97316` | `--color-secondary` |
| Accent/CTA | `#2563EB` | `--color-accent` / `--cta` |
| Background | `#FFF7ED` | `--color-background` / `--page` |
| Foreground | `#0F172A` | `--color-foreground` / `--ink` |
| Muted bg | `#FDF4F0` | `--color-muted-bg` / `--brand-soft` |
| Muted text | `#64748B` | `--color-muted-fg` / `--muted` |
| Border | `#FCEAE1` | `--color-border` / `--line` |
| Destructive | `#DC2626` | `--color-destructive` / `--danger` |
| Surface | `#FFFFFF` | `--color-surface` / `--surface` |

**Notes:** Appetizing orange + trust blue. Live-bid accents use primary orange; primary actions use CTA blue.

### Typography

- **Heading:** Playfair Display SC (`--font-display`, class `.font-display`)
- **Body:** Karla (`--font-body`)
- **Base size:** 16px (prevents iOS input zoom)
- **Mood:** restaurant, menu, culinary, energetic hospitality

### Spacing

| Token | Value |
|-------|-------|
| `--space-xs` | `4px` |
| `--space-sm` | `8px` |
| `--space-md` | `16px` |
| `--space-lg` | `24px` |
| `--space-xl` | `32px` |
| `--space-2xl` | `48px` |
| `--space-3xl` | `64px` |
| `--touch` | `44px` minimum tap target |

### Style

**Vibrant & Block-based** — bold color blocks, high contrast, large type, 200ms transitions, geometric accents (`.block-accent`).

### Page pattern (guest app)

1. Brand hero (name + one line + CTAs)  
2. Search (primary discovery)  
3. Food categories (block tiles)  
4. Combos  
5. Live liquor bidding  
6. Sticky cart bar (safe-area aware)

---

## Mobile-first rules (strict)

1. **Base styles target 375px** — enhance with `sm:` / `lg:`, never the reverse  
2. **Touch targets ≥ 44×44px** — buttons, nav, remove links, stepper controls  
3. **≥ 8px gap** between adjacent tappable controls  
4. **Inputs at 16px** — use `.input`  
5. **Bottom sheets on mobile** — modals `placement="bottom"` ≤768px  
6. **Safe areas** — `env(safe-area-inset-*)` on sticky header/cart/modals (`.safe-bottom`)  
7. **Single-column grids** by default; `sm:grid-cols-2`, `lg:grid-cols-3`  
8. **Full-width primary CTAs** on mobile where natural  
9. **`touch-action: manipulation`** — reduce tap delay  
10. **Hover only under `@media (hover: hover)`** — prefer `:active` press feedback on touch  
11. **`prefers-reduced-motion`** respected globally  
12. **No horizontal overflow** — test at 375px  
13. **Sticky cart clearance** — page content `pb-32` when cart bar may show  

---

## Component specs

### Buttons

- Primary CTA: `--cta` blue, white text, pill, `min-h-12`  
- Brand / bid: `--brand` orange, white text  
- Secondary: white + 2px `--brand` border  
- Transitions: 150–300ms, `cursor-pointer`

### Cards

- White surface, soft border, `--shadow-md`  
- Active: `scale-[0.99]` on press  
- Desktop hover lift only with fine pointer

### Search

- High-contrast field is the discovery CTA  
- Result rows `min-h-14`

### Modals

- Mobile: bottom sheet, rounded top  
- Footer CTAs full-width + safe-area padding

---

## Anti-patterns

- ❌ Tiny desktop-sized buttons on phones  
- ❌ Hover-only feedback with no active/focus state  
- ❌ Emojis as icons  
- ❌ Layout-shifting scale on hover  
- ❌ Content under sticky bars / home indicator  
- ❌ Purple/AI gradient aesthetic  
- ❌ Instant state changes without transition  

---

## Pre-delivery checklist

- [ ] Touch targets ≥ 44px  
- [ ] Works at 375 / 768 / 1024 / 1440  
- [ ] No horizontal scroll on mobile  
- [ ] Focus states visible  
- [ ] Contrast ≥ 4.5:1 for text  
- [ ] `prefers-reduced-motion` ok  
- [ ] Safe-area padding on fixed UI  
- [ ] Inputs do not trigger iOS zoom  
