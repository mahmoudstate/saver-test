# Saver — Design System (`DESIGN.md`)

The single source of truth for Saver's visual identity, rules and components.
Built in parts (see `DESIGN_PLAN.md`). Status: **Constitution complete (Parts 1–6).** Next: build styleguide.html + tokens.js (Part 7). Locked: logo A, accent Mint, DM Sans. Pending: Arabic font pick.

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

# 9. Components

The component library is the heart of "one language everywhere". **Global rules — every component:**
1. consumes **tokens only** (no literal hex / magic numbers in screens);
2. has defined **states**: default · pressed · disabled (+ focus on web/keyboard);
3. has a **min 44×44** touch target;
4. carries an **accessible label** (aria/role) and meaningful text;
5. looks correct in **both themes** automatically.

Spec template per component: **Purpose · Anatomy · Variants · States · Tokens · Rules.**

### 9.1 Button
- **Purpose:** commit an action.
- **Anatomy:** [optional leading icon 16–18] + label (body-strong) centered.
- **Variants:** `primary` (accent / hero-gradient fill, on-accent text) · `secondary` (surface-2 + border) · `ghost` (text only, muted) · `danger` (danger fill or danger-dim tint).
- **Sizes:** `lg` 52h full-width · `md` 44h · `sm` 36h inline.
- **States:** pressed = `scale(.97)` + 8% darken · disabled = faint @50%, no press · loading = spinner, hide label.
- **Tokens:** `radius-md` (lg/md), `radius-pill` (FAB), `motion-micro`, `primary`, `on-accent`.
- **Rules:** one `primary` per screen/region; labels are **verbs** ("Save Budget"); never two primaries side by side.

### 9.2 FAB (＋)
Circular `primary` button (`radius-pill`, 64), raised at bottom-center of the nav. Tap = Add; long-press = Quick Actions. Press = scale. Always thumb-reachable.

### 9.3 Card
- **Purpose:** group one idea.
- **Anatomy:** `surface` container, `radius-lg`, padding `space-4`/`space-5`.
- **Elevation:** light = `e1` shadow, **no border**; dark = 1px `border`, **no shadow**.
- **Variants:** static · tappable (adds press scale + pointer) · accent-strip (3px brand color on bottom/left edge, e.g. account cards).
- **Rules:** max 2 type sizes inside; lead with the key number.

### 9.4 Pill / Badge
Status chip: bg = `color`-dim, text = `color`, `radius-pill`, 11–12 / 700, padding `2 / 10`. Functional colors only. ≤ 2 words ("Paid", "Over", "No limit").

### 9.5 Chip (selectable)
Filter/选 chip: border default; active = `primaryDim` bg + `primary` text + `primary` border. `radius-pill`, 13/700. Used for recent-filter, type filters.

### 9.6 Input (text / number)
- **Anatomy:** [optional leading icon] + field; label = `overline` above; error/help = `caption` below.
- **Style:** `surface-2`/`bg` fill, 1px `border`, `radius-md`, padding `12/14`, size 15.
- **States:** focus = `primary` border · error = `danger` border + danger caption · disabled = faint.
- **Rules:** number fields set `inputMode` (decimal for money, numeric for counts) → numeric keypad everywhere.

### 9.7 PickerField (icon dropdown)
Our **custom select** (replaces native `<select>` wherever icons matter — bank / category / goal). Field = Input look + selected option's **icon** + chevron. Tap opens a **Modal list**: each row = icon + label + check on the active one. Keeps the drawn-icon language inside dropdowns.

### 9.8 Toggle / Switch
Pill track 46×27; off = `border`/`faint`, on = `primary`; white knob slides (`motion-micro`). Label + sub-label on the left; whole row tappable.

### 9.9 SegmentedTabs
`surface-2` pill container with a sliding active segment (`primaryDim` bg + `primary` text). 2–3 equal segments. Use for Subscriptions/Installments, Overview/Trends/Details. (Not for >3 items → use scrollable tabs.)

### 9.10 ListRow
- **Anatomy:** leading icon tile (CatIcon/BankIcon 22–34) + title (`body-strong`) + optional subtitle (`caption` muted) + trailing (amount / chevron / toggle). Min height 56.
- **Interactions:** tap = open · swipe-left = Edit / Delete (`SwipeRow`) · long-press = drag-reorder (in sortable lists).
- **Grouped variant:** white rounded group with hairline dividers (Settings style).

### 9.11 SectionHeader (overline)
`overline` token (11/700/UPPERCASE/+1, `muted`), margin-bottom 10. Optional trailing action (MonthSelect, "Customize").

### 9.12 Modal / Sheet
Bottom-anchored sheet (center optional). `surface`, top corners `radius-xl`, `e3`, max-width 520. Title (`title-3`) + close (X) top-right. Scrim `rgba(0,0,0,.6)`. Enter = scale+fade (`motion-enter`). **FullPage** variant = full-screen step flow (Add, detail pages) — slide-X + fade.

### 9.13 EmptyState
Centered: drawn glyph (40, `faint`) + message (`body` muted) + optional CTA button. Padding `space-10`. Copy is friendly and tells the next step ("Create a budget to start tracking").

### 9.14 Toast / Banner
- **Toast (celebration):** centered card — icon tile + message + "Keep Going!"; auto-dismiss ~4s (goal milestones).
- **Banner (reminder):** top inline strip, tinted (`warning`-dim), icon + text + actions + dismiss **X** (e.g., backup reminder; snooze respected).

### 9.15 ProgressBar
Track = `border`; fill = role color; `radius-pill`; height 7–8; animate width (`motion-base`). `allowOver` clamps the fill visually at 100%.

### 9.16 Ring (donut)
SVG circle, stroke 12, track = `border`, value = `primary`/functional, center = main value + sub label. Animate dash-offset (`motion-emphasis`). Used in Budget Report hero.

### 9.17 Sparkbars
Mini bar series, max-normalized; **last bar emphasized** (full color), others at 40% alpha; height 30–48. Used for 6-month trends (overall + per-budget). Month initials under, faint.

### 9.18 SegmentedProgress (status strip)
Row of equal segments (gap 3, height 8): each colored by item status — paid = `success`, unpaid/due = `faint`, overdue = `danger`. Used on Bills & Installments cards.

### 9.19 BottomNav
Floating rounded bar (`surface` + `e2`/border), 4 items (drawn icon + label; active = `primary`) with the raised center **FAB**. Respects bottom safe-area. Home tap restores previous scroll (then top).

### 9.20 Gradient Hero
Top header panel: **hero gradient** (accent, or context-tinted), rounded bottom (`radius-xl`), holding screen title + key stat(s) + (optional) SegmentedTabs. Nested stats sit on a **translucent overlay** panel. All text uses `on-accent` / verified high contrast.

### 9.21 Icon tiles (Avatar)
`CatIcon` (glyph on colored tile) · `BankIcon` (brand monogram / glyph) · `ServiceLogo` (bundled brand). Sizes 22–44 per context. See §7.

### 9.22 Stat / KPI
Label (`overline`/`caption` muted) + value (`title-2`/`display`, tabular) + optional **delta** (`success`/`danger` + up/down arrow + "vs last month"). Used in Overview & Budget Report.

# 10. Patterns

Reusable solutions composed from the components in §9. Patterns guarantee that the *same situation*
looks and behaves the same everywhere.

### 10.1 Full-screen step flows
For focused tasks (Add transaction, add Bill/Installment, detail/ledger). **One screen = one job.**
Anatomy: sticky header (title + close **X**) · scrollable body · sticky **primary** action at the
bottom (thumb zone). Enter = slide-X + fade; dismiss via X or system back.

### 10.2 Money display
- Always **tabular figures** + `Intl` currency (locale-aware; symbol only, values never converted).
- Color: income/positive = `success`; expense = `text` (or `danger` when it's a loss/over); over-limit / overdrawn = `danger`.
- Privacy: the balance **monkey** toggles all amounts to `••••`.
- Sign: expenses may show `−`, income `+`. Hero amounts use `display`/`title` weights.

### 10.3 Dates & time
Relative when it aids action ("Due today / Tomorrow / In 3 days / Overdue 2d"), else short absolute
("Jun 7"). Month names from a single source. Locale formatting added in §12.

### 10.4 Status indicators (defined once, reused everywhere)
| Status | Icon | Color |
|---|---|---|
| Low balance | down arrow | `warning` |
| Overdrawn | dot | `danger` |
| Frozen (goal) | lock | `warning` |
| Paid / on-track / income | check | `success` |
| Overdue / over budget | bell / segment | `danger` |
| Due soon | clock | `warning` |

### 10.5 Empty & first-run
Every list has an **EmptyState** (glyph + friendly line + CTA) — never a blank screen. First launch:
Welcome → optional Tour / Getting-started checklist.

### 10.6 Confirmation & destructive actions
Destructive = **ConfirmModal** with a `danger` button that **states the consequence**
("Removes the budget tracking — your transactions are kept"). Non-destructive edits **save immediately**.

### 10.7 Selection
Entities (bank / category / goal) → **PickerField** (icon list). Months → **MonthSelect**.
2–3 modes → **SegmentedTabs**.

### 10.8 Onboarding & help (all skippable / dismissible)
Welcome (first run) · **60-second Story tour** · live **Coach-marks** · **Getting-started checklist**
(dismissible, off forever) · **Help hub** (searchable FAQ) · **What's New** (once per version).

### 10.9 Feedback & celebration
Milestones → **Toast** (encouraging, drawn icon). Reminders → top **Banner** (dismiss + snooze).
Errors → **AlertModal** (cause + fix). Haptics on key actions (add, pay, reorder, success).

### 10.10 Lists & reorder
Long-press **drag-reorder** where order has meaning (accounts, budgets, dashboard sections).
Swipe-left row → Edit / Delete. Tap → open.

### 10.11 Charts & reports
**Ring** = usage/share · **Sparkbars** = trend · **ProgressBar** = limit · **SegmentedProgress** =
paid/unpaid. One insight per card; summarize many stats with a **single smart insight banner**.

# 11. Content & Voice

### 11.1 Voice
Warm, plain, encouraging, concise — a helpful friend, not a bank. Active voice, no jargon.

### 11.2 Microcopy rules
- Labels = plain nouns/verbs ("Add", "Save Budget", "All bills paid").
- **Numbers first**, words support.
- Buttons = verbs · titles = nouns · empty states = the next step.
- Never blame ("You overspent" → "£X over budget").
- **Sentence case** everywhere, except OVERLINE eyebrows (UPPERCASE) and currency codes.
- Keep short; truncate gracefully; design for **+30% length** (DE/FR) and **RTL** (AR).

### 11.3 Canonical terminology (don't synonym-swap)
"Available" (safe-to-spend) · "Frozen" (money inside goals) · "Net / Saved this month" ·
"Budget" (limit optional) · "Bill" (recurring) · "Installment" (plan) · "Goal" (savings) ·
"Account" (bank/cash/wallet).

### 11.4 Numbers, currency, dates
Currency via `Intl` + user currency (symbol only). Tabular figures. Percentages = whole numbers.
Dates short & relative (§10.3).

### 11.5 Errors & confirmations
State **cause + fix**: "Not enough balance — Available: £20." Confirmations name the effect.

# 12. Internationalization (i18n) & RTL

- **Strings as keys.** All UI text lives in a dictionary (`en` now; `ar` / `fr` / `de` later) via a
  `t("key")` lookup — **no hardcoded strings** in components.
- **Locale formatting** for numbers, currency and dates via `Intl` with the active locale.
- **RTL (Arabic):** set `dir` from the locale; build with **CSS logical properties**
  (`margin-inline`, `padding-inline`, `inset-inline`, `text-align:start`) instead of left/right.
  **Mirror** directional icons (chevrons, arrows) — **don't** mirror logos, brand marks or charts.
- **Fonts per locale token:** Latin = DM Sans; Arabic = the chosen option (Tajawal / IBM Plex Sans
  Arabic / Cairo) with slightly larger line-height.
- **Text expansion:** design for **+30%** (DE/FR) — no fixed widths; allow wrap / graceful truncate.
- Architect this **now** even though English ships first — it makes adding a language a content task,
  not a rebuild.

# 13. Accessibility (A11y)

- **Contrast:** AA — body ≥ 4.5:1, large text & icons ≥ 3:1, verified in **both** themes.
- **Dynamic Type:** respect OS text scaling; layouts flex (no clipping / overlap).
- **Touch targets ≥ 44×44** with spacing that prevents mis-taps.
- **Labels:** every icon-only control has an `aria-label`; decorative icons are hidden from AT.
- **Focus:** visible focus states for keyboard/switch control (web).
- **Reduced motion:** honor `prefers-reduced-motion` (opacity only).
- **Never color-only:** pair color with icon/text (e.g. over-budget = `danger` color **and** "over").
- Privacy (hide-balance) state is fully usable.

# 14. Platform & Native (App Store readiness)

- **Architecture:** PWA core → wrapped with **Capacitor** for iOS / Android. Storage stays behind the
  existing `load`/`save` abstraction (can map to a native store later). **Zero network** keeps the
  privacy story and App Store labels clean ("Data Not Collected").
- **Safe areas:** `env(safe-area-inset-*)` for header, bottom nav and FAB.
- **Status bar:** themed per light/dark. **Splash + app icon** from the brand mark (light & dark tiles).
- **Haptics:** native feedback on key actions (already abstracted as `HAPTICS`).
- **Gestures:** swipe / long-press must not conflict with the native back-swipe.
- **Performance:** fast cold start, 60fps interactions, lightweight bundle.
- **Offline guarantee:** fully functional with no connection.
- **Store assets:** icon set + screenshots (6.7" / 6.5" / 5.5" / iPad) — produced via Demo-Data mode.

# 15. Theming & Customization

- **Two tuned token sets** (Light / Dark) + a **System (auto)** option.
- **Switching** is instant and persisted; every component reads tokens, so nothing is missed.
- **User accent:** chosen from the presets (§3.3) → updates `primary` + derived states + gradients
  **live**, and persists.
- *(Optional, later)* **AMOLED** pure-black dark variant.
- **Single source of truth:** one `tokens` object per theme + the accent overlay feeds **the app, the
  styleguide, and the website** — change once, propagate everywhere.
- **Demo-Data mode:** a toggle that loads realistic fake data for clean marketing / store screenshots,
  with **no effect** on the user's real data.

# 16. Brand Kit & Marketing

One identity feeds the **app, the styleguide and the website**.

- **Logo:** the "Growth S" mark as SVG — full-color, mono-light, mono-dark; the **wordmark** "Saver"
  (DM Sans 800); horizontal & stacked lockups; clear space = one icon-height; min size 16px; misuse list.
- **App icon:** mark centered on an accent tile with a subtle top-down gradient; iOS squircle;
  light & dark tiles.
- **Palette:** brand **Mint** + neutrals + functional — swatches pulled from §17 tokens.
- **Type:** DM Sans (+ chosen Arabic face).
- **Imagery:** iPhone device mockups with in-app screenshots; consistent frame, angle and shadow.
- **Screenshots:** generated via **Demo-Data mode** in **both themes** with clean realistic numbers —
  cover Home, Budget Report, Bills, Add. Reused for store + site + portfolio.
- **App Store listing:** icon set, screenshots (6.7"/6.5"/5.5"/iPad), subtitle, keywords, privacy
  labels = **"Data Not Collected"**, "What's New" text (from changelog).
- **Landing page:** same tokens → exact identity match. Sections: hero (mark + tagline + device),
  features, privacy/offline, **the journey/story timeline**, screenshots, CTA (install / PWA), footer.
  The standalone styleguide HTML doubles as the living identity reference.
- **Tagline options:** "Your money, clear." · "Simple money. Fully private." · "Track. Save. Relax."

# 17. Tokens — master reference (source of truth)

> This block is the **single source of truth**. It will live as `tokens.js` and be consumed by the
> app, the styleguide, and the website. Values below are final and match Parts 1–5.

```json
{
  "defaultAccent": "mint",
  "dimAlpha": { "dark": 0.16, "light": 0.12 },
  "color": {
    "dark": {
      "bg": "#0F0F13", "surface": "#16161E", "surface2": "#1E1E28", "border": "#2A2A38",
      "text": "#E8E8F0", "muted": "#8A8AA6", "faint": "#54546A",
      "success": "#34D399", "warning": "#FBBF24", "danger": "#F87171", "info": "#60A5FA"
    },
    "light": {
      "bg": "#F4F5F8", "surface": "#FFFFFF", "surface2": "#FBFBFD", "border": "#E6E7EE",
      "text": "#16161D", "muted": "#6B6F7E", "faint": "#A2A6B4",
      "success": "#0F9D6A", "warning": "#D98A00", "danger": "#E5484D", "info": "#2563EB"
    }
  },
  "accentPresets": {
    "mint":    { "dark": "#5FE3C0", "light": "#0D9488", "onDark": "#06251F", "onLight": "#FFFFFF" },
    "emerald": { "dark": "#34D399", "light": "#059669", "onDark": "#04231A", "onLight": "#FFFFFF" },
    "blue":    { "dark": "#60A5FA", "light": "#2563EB", "onDark": "#04183A", "onLight": "#FFFFFF" },
    "violet":  { "dark": "#A78BFA", "light": "#7C3AED", "onDark": "#1A1040", "onLight": "#FFFFFF" },
    "coral":   { "dark": "#FB7185", "light": "#E11D57", "onDark": "#3A0512", "onLight": "#FFFFFF" },
    "amber":   { "dark": "#FBBF24", "light": "#D97706", "onDark": "#2A1A00", "onLight": "#FFFFFF" }
  },
  "space": { "1": 4, "2": 8, "3": 12, "4": 16, "5": 20, "6": 24, "8": 32, "10": 40, "12": 48 },
  "radius": { "sm": 10, "md": 14, "lg": 16, "xl": 20, "pill": 999 },
  "elevation": {
    "light": {
      "e1": "0 1px 2px rgba(20,22,40,.06)",
      "e2": "0 6px 18px rgba(20,22,40,.08)",
      "e3": "0 14px 34px rgba(20,22,40,.14)"
    },
    "dark": {
      "card": "1px solid border (no shadow)",
      "overlay": "0 10px 30px rgba(0,0,0,.5)"
    }
  },
  "font": {
    "latin": "DM Sans",
    "arabic": "TBD (Tajawal | IBM Plex Sans Arabic | Cairo)",
    "numerals": "tabular"
  },
  "type": {
    "display":   { "size": 34, "line": 40, "weight": 800, "track": -1 },
    "title1":    { "size": 28, "line": 34, "weight": 800, "track": -0.5 },
    "title2":    { "size": 22, "line": 28, "weight": 800, "track": -0.5 },
    "title3":    { "size": 18, "line": 24, "weight": 700, "track": -0.3 },
    "bodyStrong":{ "size": 15, "line": 22, "weight": 700, "track": 0 },
    "body":      { "size": 15, "line": 22, "weight": 500, "track": 0 },
    "label":     { "size": 13, "line": 18, "weight": 600, "track": 0 },
    "caption":   { "size": 12, "line": 16, "weight": 500, "track": 0 },
    "overline":  { "size": 11, "line": 14, "weight": 700, "track": 1, "case": "upper" }
  },
  "motion": {
    "micro": 140, "base": 220, "enter": 300, "emphasis": 460,
    "easeStd": "cubic-bezier(.2,.8,.2,1)",
    "easeExit": "cubic-bezier(.4,0,1,1)",
    "easePop": "cubic-bezier(.175,.885,.32,1.275)"
  }
}
```

**Derived (computed, not stored):** `primary` = `accentPresets[accent][theme]`; `*Dim` = role color
at `dimAlpha[theme]`; `primaryPressed` = `primary` darkened 8%; hero gradient per §3.4.

# 18. Roadmap & Story (portfolio / site)

The journey, told teli-story style with screenshots + realistic demo numbers:
- **v1** — a simple, fully-offline tracker (accounts, expenses, balances).
- **v2.x** — smarter home, bank logos, a hand-drawn icon identity, and a full Help system.
- **v2.3 — the foundation** (this design system): tokens, components, premium light mode, user accent.
- **Next** — native (App Store), multi-language (AR/FR/DE), and customer-requested features.

The spine of the story = the **What's New / changelog** entries. Each milestone gets a card with a
device mockup and one-line outcome ("clearer in one glance", "your identity, your color", …).

---

*End of written constitution (Parts 1–6). Next: build the living **styleguide.html** (Part 7) and a
`tokens.js` from §17, then begin applying the system to the app (Part 8).*
