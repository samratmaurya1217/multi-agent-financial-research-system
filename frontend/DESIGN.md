# DESIGN.md — FinSight Frontend Design System

> **Single source of truth for all UI decisions in this project.**
> Every page, every component, every pixel should be consistent with this document.

---

## Brand Identity

| Attribute | Value |
|---|---|
| **Product Name** | FinSight |
| **Tagline** | Elevate Your Financial Research |
| **Logo Mark** | 6×6 rounded square, gradient `from-indigo-500 to-rose-500` |
| **Personality** | Precise · Professional · Intelligent · Trustworthy |
| **Tone** | Confident, direct, data-first — never casual or playful |

---

## Product Vision

FinSight is a web-based financial research assistant for **finance students, MBA candidates, and early-career analysts**. It automatically extracts metrics, detects red flags, compares companies, and provides citation-backed conversational research. The UI must communicate precision, speed, and trustworthiness without exposing technical implementation details.

---

## Landing Page Philosophy

- The landing page is a **conversion page**, not a documentation page.
- Lead with **value to the user** (what they get), never with technical implementation (how it works internally).
- Every section must answer: *"Why should I trust and use this?"*
- Use **social proof**, **concrete feature benefits**, and **zero-friction CTAs**.
- The hero must be emotionally engaging — geometric shapes, deep dark background, editorial typography.

---

## Overall UI Style

| Dimension | Choice |
|---|---|
| **Theme** | Dark mode only (`bg-[#030303]` base) |
| **Aesthetic** | Glassmorphism · Geometric motion · Editorial minimalism |
| **Inspiration** | Linear, Vercel, Stripe, Perplexity — refined SaaS dark UIs |
| **Density** | Medium — spacious enough to feel premium, dense enough to be productive |
| **Motion** | Purposeful — enters animated, idle elements float subtly |

---

## Color System

### Base Palette

| Token | Hex / Class | Usage |
|---|---|---|
| `bg-base` | `#030303` | Page background |
| `bg-surface` | `bg-white/[0.02]` – `bg-white/[0.05]` | Cards, panels |
| `bg-surface-elevated` | `bg-white/[0.06]` | Hover states, modals |
| `border-subtle` | `border-white/[0.06]` – `border-white/[0.12]` | Section dividers, card borders |
| `text-primary` | `text-white` | Headlines, active labels |
| `text-secondary` | `text-white/60` – `text-white/80` | Body copy |
| `text-muted` | `text-white/30` – `text-white/40` | Hints, placeholders, captions |

### Accent Palette

| Name | Tailwind | Usage |
|---|---|---|
| **Indigo** | `indigo-400` / `indigo-500` | Primary CTA, active states, links |
| **Rose** | `rose-400` / `rose-500` | Secondary accent, risk badges, hero gradient |
| **Violet** | `violet-400` / `violet-500` | Pricing highlight, tags |
| **Amber** | `amber-400` / `amber-500` | Warning states, feature icons |
| **Cyan** | `cyan-400` / `cyan-500` | Success, confirmation |
| **Emerald** | `emerald-400` / `emerald-500` | Positive metrics |

### Gradient Rules

```
Hero gradient:     bg-gradient-to-r from-indigo-300 via-white/90 to-rose-300  (title2)
CTA gradient:      bg-gradient-to-r from-indigo-500 to-rose-500               (primary button)
Pricing highlight: bg-gradient-to-r from-indigo-500 to-violet-500             (plan badge/button)
Background wash:   bg-gradient-to-br from-indigo-500/[0.05] via-transparent to-rose-500/[0.05]
```

---

## Typography

| Role | Font | Weight | Class |
|---|---|---|---|
| **Display / Hero H1** | System / Tailwind default | 700 | `text-4xl sm:text-6xl md:text-8xl font-bold tracking-tight` |
| **Section Heading H2** | System | 700 | `text-3xl md:text-5xl font-bold tracking-tight` |
| **Card Heading H3** | System | 600 | `text-lg font-semibold` |
| **Body** | System | 300–400 | `text-base text-white/40 leading-relaxed font-light tracking-wide` |
| **Caption / Tag** | System | 600 | `text-xs font-semibold tracking-widest uppercase` |
| **Badge / Pill** | System | 400 | `text-sm text-white/60 tracking-wide` |
| **Navbar / UI** | System | 500–600 | `text-sm font-medium` |

> Never use more than 3 font sizes on a single screen at the same hierarchy level.

---

## Spacing Rules

| Scale | Token | px value |
|---|---|---|
| XS | `gap-2 / p-2` | 8px |
| SM | `gap-4 / p-4` | 16px |
| MD | `gap-6 / p-6` | 24px |
| LG | `gap-8 / py-12` | 32–48px |
| XL | `py-24` | 96px |
| 2XL | `py-32` | 128px |

**Section vertical rhythm:** `py-24 md:py-32`  
**Container:** `container mx-auto px-4 md:px-6`  
**Max content width:** `max-w-4xl` (features) · `max-w-5xl` (pricing) · `max-w-2xl` (FAQ)

---

## Border Radius

| Element | Value |
|---|---|
| Cards | `rounded-2xl` (16px) |
| Buttons (pill) | `rounded-full` |
| Badges / Tags | `rounded-full` |
| Inputs | `rounded-xl` |
| Icon wrappers | `rounded-xl` or `rounded-2xl` |
| Modals | `rounded-2xl` |
| Avatars | `rounded-full` |

---

## Shadows

| Usage | Class |
|---|---|
| Primary CTA button | `shadow-xl shadow-indigo-500/20` |
| Elevated card | `shadow-lg shadow-black/30` |
| Floating shape | `shadow-[0_8px_32px_0_rgba(255,255,255,0.1)]` |
| Navbar | `backdrop-blur-xl` + `bg-[#030303]/80` |

---

## Glassmorphism Rules

Use glassmorphism **sparingly** on overlaid elements only (Navbar, modals, floating badges):

```css
background: rgba(255, 255, 255, 0.03)  /* bg-white/[0.03] */
border: 1px solid rgba(255, 255, 255, 0.08)  /* border-white/[0.08] */
backdrop-filter: blur(12px)  /* backdrop-blur-xl */
```

**Do not** apply glassmorphism to full-page backgrounds or card grids — only floating/fixed elements.

---

## Gradients

### Background Ambiance
```
from-indigo-500/[0.05] via-transparent to-rose-500/[0.05] blur-3xl
```
Applied as a full-bleed absolute `div` under content — creates a subtle purple-to-red ambient glow.

### Feature Card Gradients
Each feature card uses a `bg-gradient-to-br` with its accent color at 20% opacity fading to 5%.

### Text Gradients
- `bg-clip-text text-transparent bg-gradient-to-b from-white to-white/80` — primary hero title
- `bg-clip-text text-transparent bg-gradient-to-r from-indigo-300 via-white/90 to-rose-300` — secondary hero title (the wow moment)

---

## Backgrounds

| Context | Strategy |
|---|---|
| Base page | `bg-[#030303]` |
| Section alternate | `bg-white/[0.01]` |
| Card | `bg-white/[0.02]` with border |
| Highlighted card | `bg-gradient-to-b from-indigo-950/50 to-transparent` |
| Modal / Drawer | `bg-[#0a0a0f]` with `backdrop-blur-2xl` |

---

## Motion & Animation

### Principles
- **Purposeful only** — every animation communicates state change or draws attention, never decorates aimlessly.
- **Stagger group reveals** with `delay: i * 0.1` or `i * 0.15` for list items.
- **Scroll-triggered** via `whileInView` + `viewport={{ once: true }}` — fire once, not on every scroll.

### Standard Variants

```ts
// Fade up on scroll
initial={{ opacity: 0, y: 20 }}
whileInView={{ opacity: 1, y: 0 }}
transition={{ duration: 0.8 }}

// Hero element stagger (custom prop)
hidden: { opacity: 0, y: 30 }
visible: (i) => ({ opacity: 1, y: 0, transition: { duration: 1, delay: 0.5 + i * 0.2 } })

// Idle float loop (geometric shapes)
animate={{ y: [0, 15, 0] }}
transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
```

### Hover Effects
- Cards: `hover:scale-[1.02] transition-transform duration-300`
- Buttons: `hover:opacity-90 transition-opacity`
- Nav links: `hover:text-white transition-colors`
- Ghost buttons: `hover:text-white hover:border-white/30 transition-all`

---

## Icons

**Library:** `lucide-react` (only)  
**Size conventions:**

| Context | Size class |
|---|---|
| Inline / body | `h-4 w-4` |
| Feature cards | `h-7 w-7` |
| Step indicators | `h-7 w-7` |
| Social links | `h-4 w-4` |
| Button arrows | `h-5 w-5` |
| Badge dot | `h-2 w-2` (filled) |

Never mix icon libraries.

---

## Buttons

### Primary (Gradient Pill)
```tsx
<button className="px-8 py-3 rounded-full bg-gradient-to-r from-indigo-500 to-rose-500 text-white font-semibold text-base hover:opacity-90 transition-opacity shadow-lg shadow-indigo-500/25">
```

### Secondary (Ghost Pill)
```tsx
<button className="px-8 py-3 rounded-full border border-white/[0.15] text-white/60 font-medium text-base hover:text-white hover:border-white/30 transition-all">
```

### White Fill (Navbar CTA)
```tsx
<button className="px-4 py-2 rounded-full bg-white text-black text-sm font-semibold hover:bg-white/90 transition-colors">
```

### Full-Width Plan Button (Pricing)
```tsx
// Highlighted plan
className="w-full py-2.5 rounded-full font-semibold text-sm bg-gradient-to-r from-indigo-500 to-violet-500 text-white hover:opacity-90"
// Default plan
className="w-full py-2.5 rounded-full font-semibold text-sm border border-white/[0.12] text-white/60 hover:text-white hover:border-white/30"
```

---

## Cards

### Feature Card
```tsx
className="p-6 rounded-2xl border bg-gradient-to-br {colorGradient} {borderColor} hover:scale-[1.02] transition-transform duration-300"
```
Contains: Icon → Title → Description (no other elements)

### Pricing Card
```tsx
className="rounded-2xl p-6 border border-white/[0.08] bg-white/[0.02]"
// Highlighted:
className="border-indigo-500/50 bg-gradient-to-b from-indigo-950/50 to-transparent"
```

### Process Step Card
Flat — centered, icon in a `rounded-2xl` container, step number badge in top-right corner.

---

## Forms & Inputs

```tsx
// Standard input
className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white placeholder:text-white/30 focus:outline-none focus:border-indigo-500/60 focus:bg-white/[0.06] transition-all text-sm"

// Label
className="block text-sm font-medium text-white/60 mb-2"

// Error message
className="text-xs text-rose-400 mt-1"
```

---

## Tables

```tsx
// Table wrapper
className="w-full border border-white/[0.08] rounded-2xl overflow-hidden"
// Thead
className="bg-white/[0.04] text-xs text-white/40 font-semibold uppercase tracking-wider"
// Th / Td padding
className="px-6 py-3" / "px-6 py-4"
// Tr hover
className="hover:bg-white/[0.02] border-t border-white/[0.04] transition-colors"
```

---

## Charts

- Use `recharts` library (preferred) or `chart.js`
- Background: transparent (inherits card bg)
- Grid lines: `stroke="rgba(255,255,255,0.05)"`
- Axis text: `fill="rgba(255,255,255,0.3)"`
- Primary line/bar: `#6366f1` (indigo-500)
- Secondary: `#f43f5e` (rose-500)
- Tooltip: `bg-[#0d0d0d] border border-white/[0.08] rounded-xl shadow-xl text-sm text-white`

---

## Sidebar

```
Width: 240px (expanded) · 56px (collapsed)
Background: bg-[#050505] border-r border-white/[0.06]
Nav item: px-3 py-2 rounded-xl flex items-center gap-3 text-sm text-white/50 hover:text-white hover:bg-white/[0.04]
Active item: bg-white/[0.06] text-white
Section label: text-[10px] font-bold text-white/20 uppercase tracking-widest px-3 mb-1
```

---

## Navbar

```
Height: h-16
Background: bg-[#030303]/80 backdrop-blur-xl border-b border-white/[0.06]
Logo: icon + product name (font-semibold tracking-tight)
Nav links: text-sm text-white/50 hover:text-white transition-colors
Right CTAs: Sign In (ghost text) + Get Started (white pill button)
Mobile: hamburger menu → slide-in drawer
```

---

## Dashboard Layout

```
┌─────────────────────────────────────────┐
│ Navbar (fixed, h-16)                    │
├───────────┬─────────────────────────────┤
│ Sidebar   │ Main Content Area           │
│ (240px)   │ (flex-1, overflow-y-auto)   │
│           │  px-6 py-8                  │
└───────────┴─────────────────────────────┘
```
- Content max-width: `max-w-6xl mx-auto`
- Page title: `text-2xl font-bold text-white mb-1` + subtitle `text-white/40 text-sm`
- Stat cards row: `grid grid-cols-2 md:grid-cols-4 gap-4 mb-8`

---

## Empty States

```tsx
<div className="flex flex-col items-center justify-center py-20 text-center">
  <div className="h-16 w-16 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mb-4">
    <IconPlaceholder className="h-7 w-7 text-white/20" />
  </div>
  <h3 className="text-white/60 font-medium mb-1">No documents yet</h3>
  <p className="text-white/30 text-sm max-w-xs">Upload your first financial document to get started.</p>
  <button className="mt-6 px-5 py-2 rounded-full bg-indigo-500/20 text-indigo-300 text-sm font-medium hover:bg-indigo-500/30 transition-colors">
    Upload Document
  </button>
</div>
```

---

## Loading States

- **Skeleton:** `rounded-xl bg-white/[0.04] animate-pulse` — match exact shape of the content it replaces
- **Spinner:** `h-5 w-5 border-2 border-white/20 border-t-indigo-400 rounded-full animate-spin`
- **Progress bar:** `h-1 bg-indigo-500 rounded-full transition-all duration-300`
- **Page load:** Full-screen skeleton with navbar + sidebar shimmer

---

## Error States

```tsx
// Inline error
<p className="text-sm text-rose-400 flex items-center gap-1.5">
  <AlertCircle className="h-4 w-4" /> {errorMessage}
</p>

// Card/section error
<div className="p-6 rounded-2xl border border-rose-500/20 bg-rose-500/5 text-rose-400 text-sm">
  Something went wrong. <button className="underline">Retry</button>
</div>
```

---

## Mobile Rules (< 768px)

- Sidebar hidden → bottom tab bar (4 icons max) or hamburger drawer
- Hero font: `text-4xl font-bold`
- Feature grid: single column
- Pricing: vertical stack, horizontal scroll optional
- Tables: horizontal scroll wrapper `overflow-x-auto`
- Touch targets: minimum `44×44px` (py-3 px-4 minimum on buttons)
- No hover-only interactions — all hover states must also have focus states

---

## Tablet Rules (768px – 1024px)

- Sidebar: collapsed (icon-only, 56px)
- Hero font: `text-6xl`
- Feature grid: 2 columns
- Pricing: 3 columns (compact)
- Container: `max-w-5xl`

---

## Desktop Rules (> 1024px)

- Sidebar: expanded (240px)
- Hero font: `text-8xl`
- Feature grid: 2 columns (capped at `max-w-4xl`)
- Pricing: 3 columns
- Comfortable spacing: `py-32` section padding

---

## Accessibility

- All interactive elements must have visible `:focus-visible` ring: `focus-visible:ring-2 focus-visible:ring-indigo-500/60 focus-visible:outline-none`
- Color contrast: text on `bg-[#030303]` must meet WCAG AA (4.5:1 for text, 3:1 for UI)
- `text-white/40` on dark base is marginal — use only for decorative text, never for actionable content
- All images must have `alt` text
- Interactive icon buttons must have `aria-label`
- Modals must trap focus and support `Escape` to dismiss
- Use semantic HTML: `<nav>`, `<main>`, `<section>`, `<header>`, `<footer>`, `<button>`, `<a>`

---

## Component Naming

| Convention | Example |
|---|---|
| Page components | `LandingPage.tsx`, `DashboardPage.tsx` |
| Feature components | `features/workspace/WorkspaceCard.tsx` |
| Shadcn / UI primitives | `components/ui/button.tsx` |
| Layout components | `layouts/DashboardLayout.tsx` |
| Custom shared | `components/MetricBadge.tsx`, `components/CitationChip.tsx` |

Use **PascalCase** for component files. Named exports only (`export function Foo`), no default exports for components.

---

## UI Do's ✅

- **Do** use `framer-motion` for all enter animations — never CSS `transition` alone for reveal effects
- **Do** use `whileInView` + `viewport={{ once: true }}` for scroll-triggered animations
- **Do** stagger list items with `delay: i * 0.1`
- **Do** use `cn()` (clsx + tailwind-merge) for conditional class names
- **Do** use semantic section IDs: `id="features"`, `id="pricing"`, `id="faq"`
- **Do** use Lucide icons exclusively — consistently sized
- **Do** apply `hover:scale-[1.02]` to interactive cards
- **Do** use gradient text for hero titles and section highlights
- **Do** keep CTAs to max 2 per section (primary + secondary)

---

## UI Don'ts ❌

- **Don't** use light backgrounds anywhere (this is dark-only)
- **Don't** use colored text at full opacity on dark backgrounds (always use `/60`, `/80` etc.)
- **Don't** use more than 2 accent colors in a single component
- **Don't** animate on every interaction — reserve motion for significant state changes
- **Don't** use placeholder images or lorem ipsum in any shipped view
- **Don't** expose AI agent names, database terms, vector stores, LLM names, or backend implementation on public-facing pages
- **Don't** put more than 4 items in a bottom tab bar
- **Don't** use `default export` for React components
- **Don't** use inline styles — always use Tailwind classes

---

## Landing Page Structure

```
1. Navbar (fixed)
2. Hero Section — HeroGeometric component (full-screen)
3. Features Grid — 4 cards, 2×2
4. How It Works — 3 steps, horizontal on desktop
5. Social Proof Bar — trust signals, icon + text
6. Pricing — 3 tiers (Free / Analyst / Team)
7. FAQ — accordion, max-w-2xl
8. CTA Banner — full-width gradient, single action
9. Footer — logo + copyright + social links
```

---

## Dashboard Structure

```
Fixed Navbar
├── Sidebar (workspaces, nav links)
└── Main Area
    ├── Page Header (title + breadcrumb + actions)
    ├── Stat Cards Row
    ├── Recent Documents Table
    └── Quick Actions
```

---

## Workspace Structure

```
Sidebar (document list for this workspace)
└── Main Content
    ├── Document Viewer / Tabs
    ├── Extracted Metrics Panel
    ├── Red Flags Panel
    └── Actions Bar (Compare, Report, Chat)
```

---

## Chat Structure

```
Two-column layout:
├── Left: Source Document Panel (collapsible)
└── Right: Chat Interface
    ├── Message History (scrollable)
    ├── Citation Chips (clickable → highlights source)
    └── Input Bar (with attach, submit)
```

---

## Reports Structure

```
Full-width preview panel:
├── Report Header (company, date, generated by)
├── Section tabs (Executive Summary / Financials / Red Flags / Comparison / Outlook)
└── Action Bar (Download PDF, Share link, Regenerate)
```

---

## Pricing Section

- 3 tiers: **Student (Free)** · **Analyst ($29/mo)** · **Team ($99/mo)**
- Middle card highlighted with indigo border + gradient bg + "Most Popular" badge
- Feature checklist with `Check` icon in `text-indigo-400`
- Annual toggle optional (show savings %)

---

## FAQ

- Accordion pattern (one item open at a time)
- Animate height with `framer-motion` (not CSS `max-height` hack)
- ChevronDown icon rotates 180° when open
- Border highlights subtly when expanded

---

## Footer

```
3 columns on desktop, stacked on mobile:
Left:  Logo + product name
Center: Copyright + tagline
Right: Social icons (Github, Twitter, LinkedIn)
```

---

## Final Principles

1. **Dark only, always.** There is no light mode. This is a precision tool, not a consumer app.
2. **Every CTA is a gradient pill.** Consistency over creativity on action elements.
3. **Cite everything.** The product's core promise is grounded answers — the UI must reflect that culture: show sources, show confidence scores, show page numbers.
4. **Motion earns its place.** If removing an animation makes no UX difference, remove it.
5. **Accessible or it doesn't ship.** WCAG AA minimum on every visible text element.
6. **No tech exposed to users.** Users see "extracts metrics" — not "runs an LLM extraction agent over embedded vectors."
7. **Components are reusable or they're not components.** Anything rendered in more than one place gets abstracted.
8. **This design system is a living document.** Update it when you introduce a new pattern — don't let the code and this doc diverge.
