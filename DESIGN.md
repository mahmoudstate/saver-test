# Saver — Design System (`DESIGN.md`)

The single source of truth for Saver's visual identity, rules and components.
Built in parts (see `DESIGN_PLAN.md`). Status: **Part 1 drafted — awaiting logo + accent decision.**

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

> **Decision needed (2.2):** pick logo direction **A / B / C** (or mix). I'll then produce the
> final SVG mark + app-icon in the styleguide.

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

> **Decision needed (3.3):** confirm **default accent = Mint** (or pick another), and confirm the
> 6 presets list (add/remove any).

---

# 4. Typography

## 4.1 Families
- **Primary (Latin):** **DM Sans** — geometric, friendly, excellent for numbers. Weights 400 / 500
  / 700 / 800.
- **Numerals:** enable **tabular figures** for all money/amounts so columns align and digits don't
  jitter when values change.
- **Arabic (future):** plan to pair with **IBM Plex Sans Arabic** *or* **Tajawal** (both sit well
  next to DM Sans). Font family becomes a per-locale token; Latin stays DM Sans.

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

> **Decision needed (4.1):** keep **DM Sans** as primary? And pre-pick the Arabic font
> (**IBM Plex Sans Arabic** vs **Tajawal**) for later.

---

## Next
**Part 2** — Spacing & Layout · Shape & Elevation · Iconography · Motion.
(Continue per `DESIGN_PLAN.md`.)
