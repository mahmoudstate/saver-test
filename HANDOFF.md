# Saver — Session Handoff (read me first)

> Quick context for any new session. **Read this, then `DESIGN_PLAN.md`, then `DESIGN.md`.**

## What Saver is
A **personal finance tracker** that is **100% offline & private** (no account, no network, data in
local storage). It's a React PWA; **almost all app code lives in one file: `src/App.jsx`** (in the
`saver-test` repo). Build: `npm run build`.

## Where we are
Goal 1 (features + drawn-icon identity) is **done**. We are now on **Goal 2: a full design-system
rebuild** of the UI. The **written foundation is complete** (Parts 1–7).

## Golden rules (NEVER break)
1. Preserve the **financial calculations** exactly (balances, safe-to-spend, frozen, goals, budgets).
2. Preserve the **concept + data model / storage keys** (existing users & JSON backups must keep
   working; migrations are **additive only**).
3. **Everything else (layout, order, navigation, visuals) is open to redesign** per the design system.
4. No feature removed. Offline/privacy always.

## Locked design decisions
- Logo: **Direction A — "Growth S"** lettermark.
- Accent: **Mint** default, **user-selectable** (6 presets in `tokens.js`).
- Fonts: **DM Sans** (Latin). Arabic = pick 1 of 3 (Tajawal / IBM Plex Sans Arabic / Cairo) — **pending**.
- Density: comfortable/spacious. Premium light mode (tuned, not inverted). One unified language.

## The artifacts (source of truth)
- `DESIGN.md` — full constitution (philosophy, brand, color, type, spacing, shape, icons, motion,
  components, patterns, voice, i18n/RTL, a11y, native, theming, brand kit, **tokens §17**, roadmap).
- `DESIGN_PLAN.md` — plan, decisions, **8 parts + status**, "how to resume".
- `tokens.js` — canonical tokens (colors Light/Dark, accent presets, space, radius, type, motion).
- `saver-styleguide.html` — standalone living styleguide / identity page (also pushed to the
  `saver-site` repo as `index.html` for GitHub Pages).

## Repos
- **`saver-test`** — the Saver app (this is where the app rebuild happens). Branch:
  `claude/severt-test-code-changes-9URWE`.
- **`saver-site`** — the public landing/identity site (host `index.html` via GitHub Pages).

## Next step
- **Part 8:** apply the design system to the app **screen by screen** in `saver-test/src/App.jsx`
  (Dashboard → Add → Bills → Budgets → Savings → History → Settings → Welcome/Help), using only
  tokens + components, **without touching calculations**. Build after each screen.
- Also: finalize the Arabic font choice.

## How to resume
Open `DESIGN_PLAN.md` → continue from the first unchecked Part. Don't re-derive locked decisions.
