# Saver — Design System Rebuild · Plan & Progress

> Continuity doc. **Read this first** at the start of any session, then continue from the first
> unchecked Part below. Do **not** re-derive the decisions already locked here.

Repo: `mahmoudstate/saver-test` · Branch: `claude/severt-test-code-changes-9URWE`

---

## 0) Golden rules (NEVER break)
1. **Preserve the financial CALCULATION logic exactly** — `calcBankBalance`, `safeToSpend`,
   `frozenForBank`, `goalSaved`, budgets/bills/installments math. No behavioral change to numbers.
2. **Preserve the app CONCEPT + DATA MODEL / storage keys** so existing user data and JSON
   backups keep working. Migrations stay **additive only** (never destructive).
3. **Everything else is open to redesign** — layout, placement, order, navigation, screen flows,
   component shapes, visuals — driven by the new Design System.
4. **No feature is dropped.** Features may be re-organized or improved, not removed.
5. **Offline-first, privacy, no network.**

## 1) Locked decisions
- **Foundation-first**: build tokens + component library, *then* re-skin screens.
- **Personality**: Calm · Clear · Consistent · Premium **light mode** · Offline-trust.
- **Density**: comfortable / spacious.
- **Accent color**: **user-selectable** (default chosen in Part 1).
- **Themes**: Light + Dark as **separately tuned token sets** (not inverted). AMOLED maybe later.
- **Future-proofing baked into the foundation**:
  - i18n + **RTL** (Arabic / French / German) — strings as keys, per-locale fonts, logical CSS.
  - **Native / App Store** (Capacitor): safe areas, touch ≥44px, splash, app icon, offline.
  - **Extensibility**: documented component library + versioned data + migrations.
  - **Accessibility**: AA contrast, Dynamic Type, VoiceOver, reduced-motion.
  - **Brand kit / marketing**: logo, palette, Demo-Data mode for screenshots, App Store assets,
    landing page — all fed by one token source.
- **Inspirations distilled** (not copied):
  - *Emma* → calm harmonious palette, friendly icons, comfortable chips.
  - *Revolut* → clear structure, consistent sizing rhythm, smooth motion, polished widgets.
  - *Say* → simplicity, generous whitespace, full-screen step flows, premium light mode with
    context-aware gradients, **one unified language across every screen**.

## 2) Deliverables
- **A) `DESIGN.md`** — the written constitution (18 sections, world-class detail).
- **B) `saver-styleguide.html`** — standalone living styleguide (Dark/Light + accent toggles,
  renders real palette/type/spacing/icons/components). Self-contained; hostable as its own
  GitHub Pages project / identity page.

## 3) Parts (split for multi-session continuity)
- [x] **Part 1 — Foundations** (logo A · accent Mint · DM Sans; Arabic font pick pending) (DRAFTED in DESIGN.md — awaiting logo + accent + font decisions): Philosophy · Brand (logo/name/app-icon directions + options) ·
      Color system (Light/Dark neutrals + functional + gradients + user accent) · Typography.
- [~] **Part 2 — Structure** (DRAFTED in DESIGN.md §5–8): Spacing & Layout (4/8 grid, safe areas) · Shape & Elevation
      (radius, shadows/borders) · Iconography spec · Motion (durations/easings).
- [~] **Part 3 — Components** (DRAFTED in DESIGN.md §9): full library — Button, Card, Pill/Badge, Input, Picker/Select,
      Toggle, SegmentedTabs, ListRow, SectionHeader, Modal/Sheet, EmptyState, Toast,
      ProgressBar, Ring, Sparkbars, BottomNav, Gradient-Hero (anatomy/variants/states/tokens).
- [~] **Part 4 — Patterns + Content/Voice** (DRAFTED in DESIGN.md §10–11): full-screen flows, empty states, confirmations,
      forms, money/date display, status indicators, onboarding/Help/What's New + microcopy guide.
- [~] **Part 5 — i18n/RTL + Accessibility + Native/Platform + Theming/Customization.** (DRAFTED §12–15)
- [~] **Part 6 — Brand Kit/Marketing + master Tokens reference (JSON) + Roadmap/Story.** (DRAFTED §16–18; tokens finalized)
- [x] **Part 7 — Built `tokens.js` + `saver-styleguide.html`** (living styleguide / identity page).
- [ ] **Part 8 (later phase) — Apply the system to the app**, screen-by-screen
      (Dashboard → Add → Bills → Budgets → Savings → History → Settings → Welcome/Help).

## 4) Status log
- **2026-06-09** — Part 7 built: `tokens.js` (canonical) + `saver-styleguide.html` (standalone, self-contained living styleguide & identity page: theme toggle, 6 accent presets, palette/type/spacing/radius/icons/components, device mockup, scroll-reveal + ring/sparkbar/count-up animations, reduced-motion safe). Ready to host as its own GitHub Pages project.
- **2026-06-09** — Part 6 (§16 Brand kit, §17 master Tokens JSON [source of truth], §18 Roadmap/Story) written. Written constitution complete; next = styleguide.html + tokens.js.
- **2026-06-09** — Part 5 (§12 i18n/RTL, §13 A11y, §14 Native, §15 Theming) written.
- **2026-06-09** — Part 4 (§10 Patterns, §11 Content & Voice) written.
- **2026-06-09** — Part 3 (§9 Components library, 22 components) written.
- **2026-06-09** — Plan created; layout fully open, only calc+concept+data preserved.
- **2026-06-09** — Decisions: logo **A (Growth S)**, accent **Mint**, primary **DM Sans**; Arabic = 3 options to pick. Part 2 (§5–8 Spacing/Shape/Icon/Motion) written.
- **2026-06-09** — DESIGN.md created with **Part 1** (Philosophy, Brand/logo directions, Color
  system Light/Dark + user accent, Typography). Awaiting user decisions: logo A/B/C, default
  accent (Mint), primary font (DM Sans) + Arabic font. Then start Part 2.

## 5) Open questions to resolve inside Part 1
- Logo direction (keep "Saver One" wordmark + refine, or explore a new mark?) — propose options.
- Default accent color (current mint `#6ee7b7` vs a refined brand color) — propose options.
- Confirm primary font (Latin) and the Arabic font choice for later.
