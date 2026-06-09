# Saver — Design System (`DESIGN.md`)

The single source of truth for Saver's visual identity, rules and components.
Built in parts (see `DESIGN_PLAN.md`). Status: **Parts 1–2 drafted.** Locked: logo A, accent Mint, DM Sans. Pending: Arabic font pick.

> Arabic note (ملاحظة): الوثيقة دي هي الدستور. كل شاشة/مكوّن لازم يتبع القواعد دي. القرارات اللي محتاجة
> اختيارك مكتوبة في آخر كل قسم تحت **"Decision needed"**.

---

## Table of contents
1. Philosophy & Principles  ← *Part 1*
2. Brand Identity (name, logo, app icon, personality)  ← *Part 1*
3. Color System (Light / Dark / accent / gradients)  ← *Part 1*
4. Typography  ← *Part 1*
5. Spacing & Layout — *Part 2*
6. Shape & Elevation — *Part 2*
7. Iconography — *Part 2*
8. Motion — *Part 2*
9. Components — *Part 3*
10. Patterns — *Part 4*
11. Content & Voice — *Part 4*
12. Internationalization & RTL — *Part 5*
13. Accessibility — *Part 5*
14. Platform & Native — *Part 5*
15. Theming & Customization — *Part 5*
16. Brand Kit & Marketing — *Part 6*
17. Tokens master reference — *Part 6*
18. Roadmap & Story — *Part 6*

---

# 1. Philosophy & Principles

**Mission:** a money tracker so clear that anyone understands it in seconds — calm, friendly,
private, and beautiful in both light and dark.

**Five principles** (every decision is checked against these):

1. **Clear over clever** — the user should never need a tutorial. Every number, label, word and
   icon explains itself. Information has a visible "scent".
2. **Calm & spacious** — generous whitespace, one idea per card, quiet color. The data is the hero.
3. **One language everywhere** — the same components, spacing, type and motion on every screen.
   No screen invents its own style. (This is what makes it feel premium.)
4. **Premium in both themes** — light mode is intentionally designed (soft greys, white cards,
   gentle gradients), not an inverted dark theme.
5. **Private & offline by default** — no account, no network, your data stays on device. Trust is
   part of the brand.

**Distilled from references:** Emma (calm harmonious palette, friendly icons) · Revolut (clear
structure, rhythm, motion) · Say (simplicity, generous space, full-screen steps, premium light
mode with gradients, unified language).

---

# 2. Brand Identity

## 2.1 Name & wordmark
- **Product name:** Saver
- **Full label:** Saver One (used in footer / about / store)
- **Wordmark:** "Saver" set in the brand display weight (DM Sans 800), tight tracking (-0.5).
  The mark sits to the left of the wordmark with one icon-height of clear space around it.

## 2.2 Logo — proposed directions
We are in the foundation phase, so the mark is open. Three directions (all render as crisp SVG,
work as a 1-color app icon, and scale to 16px):

- **Direction A — "Growth S" (recommended).** A rounded **S** whose lower curve lifts into a small
  **up-trend tick** (savings growing). Modern, abstract, ownable. Reads as both "Saver" and "rising".
- **Direction B — "Coin + arrow".** A circular coin with an upward arrow cut through it. Friendly,
  literal (money going up). Slightly more common.
- **Direction C — "Shield-S".** An S inside a soft shield — leans on the privacy/safety story.

App icon: mark centered on a brand-color tile (accent) with a subtle top-down gradient; rounded
iOS squircle. Clear-space = 12% of icon size. Provide light-tile and dark-tile variants.

> ✅ **LOCKED (2.2): Direction A — "Growth S".** Final SVG mark + app icon produced in the styleguide (Part 7).

## 2.3 Personality & voice (summary; full guide in Part 4)
Warm, plain-spoken, encouraging, never preachy. Short sentences. Egyptian-friendly clarity in
copy, but UI default language = English (i18n-ready). Examples: "All bills paid" not "0 liabilities
outstanding"; "Saved this month" not "Net surplus".

---

# 3. Color System

**Rule #1 — themes are tuned, not inverted.** Light and Dark are two separate token sets. Accent
colors get a *deeper* value on light (to read on white) and a *brighter* value on dark.

**Rule #2 — semantic roles, never raw hex in screens.** Screens use role tokens
(`bg`, `surface`, `text`, `primary`…), never literal colors.

**Rule #3 — 60 / 30 / 10.** ~60% neutral background, ~30% surfaces/text, ~10% accent.

**Rule #4 — contrast.** Body text ≥ 4.5:1, large text/icons ≥ 3:1 (WCAG AA), verified per theme.

## 3.1 Neutral roles

| Role | Meaning | Dark | Light |
|---|---|---|---|
| `bg` | app background | `#0F0F13` | `#F4F5F8` |
| `surface` | cards / sheets | `#16161E` | `#FFFFFF` |
| `surface-2` | elevated / nested | `#1E1E28` | `#FBFBFD` |
| `border` | hairlines / dividers | `#2A2A38` | `#E6E7EE` |
| `text` | primary text | `#E8E8F0` | `#16161D` |
| `muted` | secondary text | `#8A8AA6` | `#6B6F7E` |
| `faint` | tertiary / disabled | `#54546A` | `#A2A6B4` |

## 3.2 Functional roles (status)

| Role | Dark | Light | Use |
|---|---|---|---|
| `success` | `#34D399` | `#0F9D6A` | income, on-track, paid |
| `warning` | `#FBBF24` | `#D98A00` | low balance, due soon |
| `danger`  | `#F87171` | `#E5484D` | over budget, overdrawn, delete |
| `info`    | `#60A5FA` | `#2563EB` | neutral highlights, transfers |

Each functional color also has a **dim** background (same hue) at **16%** alpha on dark, **12%** on
light — used for tinted pills/banners.

## 3.3 Primary / accent (user-selectable)
The user picks the accent. Each preset ships a tuned **{dark, light}** pair + an **on-accent** text
color. Default = **Mint**.

| Preset | Dark | Light | on-accent |
|---|---|---|---|
| **Mint** (default) | `#5FE3C0` | `#0D9488` | dark→`#06251F`, light→`#FFFFFF` |
| Emerald | `#34D399` | `#059669` | `#04231A` / `#FFFFFF` |
| Blue | `#60A5FA` | `#2563EB` | `#04183A` / `#FFFFFF` |
| Violet | `#A78BFA` | `#7C3AED` | `#1A1040` / `#FFFFFF` |
| Coral | `#FB7185` | `#E11D57` | `#3A0512` / `#FFFFFF` |
| Amber | `#FBBF24` | `#D97706` | `#2A1A00` / `#FFFFFF` |

Derived states (computed, not hand-picked):
- `primaryDim` = accent @ 16% alpha (dark) / 12% (light) — tinted backgrounds.
- `primaryPressed` = accent darkened 8%.
- on dark, large numbers may use the accent directly; on light prefer `text` for big numbers and
  accent for emphasis only (keeps contrast high).

## 3.4 Gradients
- **Hero gradient** (headers, primary button): `linear-gradient(135deg, accent, accentSoft)` where
  `accentSoft` = accent lightened 12% + slight hue shift. On **light**, hero fades toward the page
  (`accent → bg`) for the soft premium look (Say-style). On **dark**, `accent-dim → surface`.
- **Chart fill:** accent → transparent vertical fade.
- Gradients are **decoration only** — never the sole carrier of meaning, and text on gradients must
  still hit AA (use on-accent color).

## 3.5 Examples (do / don't)
- ✅ Income amount uses `success`; over-budget uses `danger`; everything else `text`/`muted`.
- ✅ One accent per screen region; tinted backgrounds use the matching `*Dim`.
- ❌ Don't put two saturated accents side by side. ❌ Don't use pure black `#000` or pure white text
  on colored fills without checking contrast.

> ✅ **LOCKED (3.3): default accent = Mint.** 6 presets confirmed (user-selectable).

---

# 4. Typography

## 4.1 Families
- **Primary (Latin):** **DM Sans** — geometric, friendly, excellent for numbers. Weights 400 / 500
  / 700 / 800.
- **Numerals:** enable **tabular figures** for all money/amounts so columns align and digits don't
  jitter when values change.
- **Arabic (future):** font family becomes a per-locale token; Latin stays DM Sans. Choose one of
  the 3 options below.

## 4.2 Type scale
One modular scale. Hierarchy = **size + weight + color** (never size alone).

| Token | Size / Line | Weight | Tracking | Use |
|---|---|---|---|---|
| `display` | 34 / 40 | 800 | -1 | balance hero, big numbers |
| `title-1` | 28 / 34 | 800 | -0.5 | screen titles |
| `title-2` | 22 / 28 | 800 | -0.5 | section / card titles |
| `title-3` | 18 / 24 | 700 | -0.3 | sub-headers, modal titles |
| `body-strong` | 15 / 22 | 700 | 0 | list item titles, emphasis |
| `body` | 15 / 22 | 500 | 0 | default text |
| `label` | 13 / 18 | 600 | 0 | secondary labels |
| `caption` | 12 / 16 | 500 | 0 | meta, dates |
| `overline` | 11 / 14 | 700 | +1 (UPPERCASE) | section eyebrows ("ACCOUNTS") |

## 4.3 Rules
- Max **2** type sizes per card. Lead with the most important number.
- Money = `display`/`title-2` + tabular figures + currency via `Intl` (locale-aware).
- Long text wraps; single-line labels truncate with ellipsis. Plan for **+30% length** (DE/FR) and
  **RTL** mirroring (Arabic) — handled via logical CSS in Part 5.

> ✅ **LOCKED (4.1): primary = DM Sans** with tabular numerals.
>
> **Arabic font — pick one of these 3 later (هتختار بينهم):**
>
> | Option | Character | Pairs with DM Sans |
> |---|---|---|
> | **A. Tajawal** | geometric, clean, modern | excellent (similar geometry) |
> | **B. IBM Plex Sans Arabic** | humanist, professional, very legible | very good |
> | **C. Cairo** | geometric, friendly, widely used | good |

---

# 5. Spacing & Layout

**Base unit = 4px. Rhythm = 8px.** All padding / margin / gap come from this scale.

| Token | px | Typical use |
|---|---|---|
| `space-1` | 4 | icon↔text gap, hairline spacing |
| `space-2` | 8 | chip padding, small gaps |
| `space-3` | 12 | grid gap, list-row gap |
| `space-4` | 16 | card padding, screen side padding |
| `space-5` | 20 | comfortable card padding |
| `space-6` | 24 | between sections |
| `space-8` | 32 | large section breaks |
| `space-10` | 40 | empty-state spacing |
| `space-12` | 48 | hero spacing |

**Layout rules**
- **Screen side padding:** 16. **Content max-width:** 520, centered (phone-first, scales on tablet).
- **Section rhythm:** 24 between major sections; 10–12 between a section eyebrow (overline) and its content.
- **Grids:** account cards = 2 columns, gap 12. Lists: 8–10 between rows.
- **Safe areas:** respect `env(safe-area-inset-top/bottom)` — required for native (notch + home bar).
- **Touch targets:** min 44×44; primary actions in the thumb zone (bottom third).
- **One screen = one job** for step flows (full-screen Add, etc.).

# 6. Shape & Elevation

**Radius scale**

| Token | px | Use |
|---|---|---|
| `radius-sm` | 10 | chips, small controls, icon tiles |
| `radius-md` | 14 | buttons, inputs, list rows |
| `radius-lg` | 16 | cards |
| `radius-xl` | 20 | modals, sheets, hero |
| `radius-pill` | 999 | pills, toggles, FAB |

**Elevation — theme-specific (key rule):**
- **Light:** depth via **soft shadows**, not borders.
  - `e1` = `0 1 2 rgba(20,22,40,.06)` — resting cards
  - `e2` = `0 6 18 rgba(20,22,40,.08)` — raised cards / hero
  - `e3` = `0 14 34 rgba(20,22,40,.14)` — modals / sheets / popovers
- **Dark:** depth via **1px `border` + surface step**; shadows only for overlays.
  - cards = `surface` + `1px border`, no shadow
  - overlays = `0 10 30 rgba(0,0,0,.5)`
- Never mix: a light card = shadow + no border; a dark card = border + no shadow.

# 7. Iconography

- **Style:** one outline/stroke set on a 24×24 grid, **stroke 2** (2.2 for ≤14px), round caps & joins,
  `currentColor`. (Implemented as `Ico` + `MARKS` / `CAT_GLYPHS`.)
- **Sizes:** 14 inline · 16 default · 18–20 list/tile · 24 headers · 28+ hero.
- **Category & brand marks:** `CatIcon` = glyph on a rounded-square tile (radius ≈ 28% of size,
  colored tile + contrast stroke). `BankIcon` = brand monogram on brand color, else glyph.
  `ServiceLogo` = bundled brand glyph/monogram (offline).
- **Allowed exceptions:** currency **flags** (data) and the balance-privacy **monkey** (mascot).
- **Don'ts:** emoji as UI chrome · mixed fill/outline · inconsistent stroke widths · raster icons.

# 8. Motion

**Durations**

| Token | ms | Use |
|---|---|---|
| `motion-micro` | 140 | taps, toggles, press |
| `motion-base` | 220 | most transitions |
| `motion-enter` | 300 | modals, page-in |
| `motion-emphasis` | 460 | hero, number / ring count-up |

**Easing**
- standard / enter: `cubic-bezier(.2,.8,.2,1)`
- exit: `cubic-bezier(.4,0,1,1)`
- playful pop (toasts, FAB): `cubic-bezier(.175,.885,.32,1.275)`

**Patterns:** page = slide-X + fade · modal / sheet = scale + fade · press = `scale(.97)` ·
list reorder = move · progress bar / ring / sparkbars = animate to value.

**Accessibility:** honor `prefers-reduced-motion` → drop transforms, keep opacity only.

## Next
**Part 3** — Components library (Button, Card, Pill, Input, Picker, Toggle, SegmentedTabs, ListRow,
SectionHeader, Modal/Sheet, EmptyState, Toast, ProgressBar, Ring, Sparkbars, BottomNav, Gradient-Hero).
