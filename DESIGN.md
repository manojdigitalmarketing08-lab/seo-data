---
# gstack: design-md-format=spec
name: SEO Keyword API
description: A calm, approachable customer dashboard for an SEO/keyword data API — near-white surfaces, one confident blue accent, humanist grotesk type, precise tabular numbers.
colors:
  primary: "#3B6EE0"          # confident blue — the one accent
  on-primary: "#FFFFFF"
  surface: "#F7F7F5"
  text: "#2B2E2C"
  text-muted: "#6B7570"
  accent: "#3B6EE0"
  success: "#3B6EE0"
  warning: "#B8842E"
  error: "#C0483A"
typography:
  display:
    fontFamily: General Sans
    fontWeight: 700
    fontSize: clamp(1.5rem, 3vw, 2.25rem)
    letterSpacing: -0.01em
  body:
    fontFamily: General Sans
    fontSize: 1rem
    lineHeight: 1.5
  label:
    fontFamily: General Sans
    fontSize: 0.75rem
    letterSpacing: 0.05em
  mono:
    fontFamily: JetBrains Mono
    fontFeature: tnum
rounded:
  sm: 6px
  md: 10px
  lg: 14px
  full: 9999px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  2xl: 48px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.sm}"
  button-primary-hover:
    backgroundColor: "#256557"
  input:
    borderColor: "#E4E2DC"
    rounded: "{rounded.sm}"
  card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.md}"
  nav-link:
    textColor: "{colors.text}"
---

# SEO Keyword API

## Overview

**Creative North Star:** A calm, approachable data tool — precise where it counts (numbers), warm and unintimidating everywhere else. Not another stark SaaS-template dashboard, not a cold "industrial instrument" either.

**Product context:** Customer dashboard for a subscription-gated SEO Keyword API SaaS (Google Ads Keyword Planner + PageSpeed Insights + content briefs, sold via API key, paid via Paddle). Real paying customers — SEO marketers and developers — check quota, run keyword searches, and read content briefs here. Category peers: Ahrefs, Semrush, Moz.

**Mode per surface:** Dashboard/keyword tables = Operate. Settings/API key panel = Operate. Signup/upgrade pages = Persuade (out of scope for this pass — this file governs the logged-in dashboard).

**Reference sites:** Researched via web search — Ahrefs (clean, SEO-focused, less cluttered than Semrush), Semrush (breadth over simplicity), and current 2026 premium SaaS dashboard trends (Linear, Stripe, Mercury, Attio: restraint, progressive disclosure, dense data with inline clarity). Blue was chosen deliberately (user's explicit choice) over the system's earlier teal — it's the most conventional trust/SaaS signal, at the cost of overlapping with Ahrefs/Moz's brand color. Layout and type stay apart from the stark dark-mode-power-tool look of Linear/Vercel — near-white and less clinical, since customers check this dashboard periodically rather than living in it all day.

**Key characteristics:**
- Near-white page background with light-gray card surfaces (`#F7F7F5`), not cream/beige or dark-mode-first
- One accent color only (confident blue) — never a second competing hue
- Every number in every table/card is monospace with tabular alignment
- Cards get a soft shadow and rounded corners — approachable, not hairline-severe
- No serif display type, no gradients, no decorative elements

## Colors

**Strategy:** Restrained — one accent (blue), everything else is neutral grays (page background pure white, card surfaces a light neutral gray, no warm/cream undertone).
**Light or dark:** Light-mode primary. This is a periodically-checked business dashboard for marketers, often screenshotted into client reports — light mode is what gets shared and what's usable under office lighting. A dark mode variant ships (tokens above swap consistently) for users who prefer it, but light is the default and the one the copy/screenshots are designed around.

Blue signals "verified/good" (used for success alerts, high-opportunity badges, the primary CTA). Warning (amber) and error (red) are semantic-only — never used decoratively. Muted text (`text-muted`) is the same slate hue at reduced weight, not a shift toward blue-gray, so the palette never splits into two temperatures. Cards are distinguished from the page by fill (`#F7F7F5` vs `#FFFFFF`) plus border and soft shadow together — never by warm-vs-cool undertone.

## Typography

General Sans (Fontshare, humanist grotesk, not on the overused-display list) carries every role — display, body, and UI — differentiated by weight (700 for headings, 400/500 for body/UI) and size, not by mixing typefaces. This keeps the system quiet and prevents the "serif-for-trust" cliché. JetBrains Mono with tabular-nums is reserved exclusively for numeric data: table columns, stat card values, quota counters, prices. If a number appears anywhere in the UI, it's in mono.

Loading: General Sans via Fontshare's CSS API (`https://api.fontshare.com/v2/css?f[]=general-sans@400,500,600,700`), JetBrains Mono via Google Fonts — both already verified available, both already used correctly in the preview.

## Layout

Grid-disciplined: strict column alignment in every data table, no exceptions — this is a data product and misaligned numbers cost trust immediately. Max content width ~1180px on the dashboard body. Medium density: comfortable padding inside cards (16-24px) but tables stay tight enough to scan many rows at once. Section rhythm uses the 24-32px spacing scale, not ad hoc values.

## Elevation & Depth

Cards use a soft, low-opacity shadow (`0 1px 2px rgba(slate,0.04), 0 2px 8px rgba(slate,0.06)`) plus a 1px border in the neutral border color — never a shadow alone, never a border alone. No glow, no colored shadow, no zero-offset halo.

## Shapes

Radius hierarchy: sm (6px) for buttons/inputs/badges, md (10px) for cards, lg (14px) for the outer dashboard frame. Never mix radii within the same component family. No fully-rounded ("pill") elements except the quota progress bar track and fill.

## Components

- **Buttons:** primary = solid teal, white text; outline = white surface + border + shadow; ghost = text-only, muted color, no border. Hover on primary darkens to `#256557`. Disabled = 50% opacity, no shadow.
- **Cards (stat cards, mock frames):** white surface, border + soft shadow, rounded-md. Hover on interactive rows tints background to `teal-tint`, never changes border color.
- **Data tables:** header row uppercase/tracked/muted, numeric columns right-aligned in mono, row hover = teal-tint background, no zebra striping.
- **Alerts:** tinted background at ~10% of the semantic color, border in the full semantic color, text in a darker shade of the same hue — success/warning/error only, never decorative.
- **Inputs:** white surface, 1px border, sm radius, no inner shadow.

## Do's and Don'ts

- Do: keep every number in JetBrains Mono with tabular-nums, no exceptions.
- Do: use blue as the only accent — resist adding a second "highlight" color later.
- Do: keep cards bordered AND soft-shadowed together, never one alone.
- Don't: reach for a serif or a second display typeface — General Sans carries every role via weight.
- Don't: add gradients, glows, or decorative blobs anywhere on the dashboard.
- Don't: let dark mode invert lightness naively — surfaces get a genuinely different near-black tone, not just white-on-black text.

## Motion

- **Approach:** minimal-functional
- **Easing:** enter(ease-out) exit(ease-in) move(ease-in-out)
- **Duration:** micro(50-100ms) short(150-250ms) medium(250-400ms) long(400-700ms)
- **The one authored moment:** stat card values count up from 0 on first load of the dashboard (numeric only, ~400ms, ease-out) — reinforces "these are real, computed numbers," nothing else on the page animates on load.

## Decisions Log
| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-09-15 | Rejected first proposal: Instrument Serif + emerald + hairline-grid "precision instrument" direction | User rejected color, layout, and overall feel after seeing the HTML preview |
| 2026-09-15 | Adopted warm neutral / muted teal / General Sans / rounded-card system | User selected this direction from 3 alternatives, approved after seeing the revised HTML preview |
| 2026-09-15 | Replaced warm ivory/cream background (#F5F4F1) with near-white (#FFFFFF page, #F7F7F5 cards) | User asked to change the cream color after implementation; kept teal accent and General Sans, just removed the warm/cream undertone |
| 2026-09-15 | Replaced muted teal accent (#2F7D6B) with confident blue (#3B6EE0) | User asked to change the green color after implementation; accepted overlap with Ahrefs/Moz's brand blue as the tradeoff |
