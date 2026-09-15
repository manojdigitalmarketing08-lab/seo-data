---
# gstack: design-md-format=spec
name: SEO Keyword API
description: A dark, sidebar-nav customer dashboard for an SEO/keyword data API — glass-blur cards, one amber accent, humanist grotesk type, precise tabular numbers.
colors:
  primary: "#F5A623"          # amber — the one accent
  on-primary: "#14151A"
  surface: "rgba(255,255,255,0.045)"
  text: "#F2F1EE"
  text-muted: "#9C9CA3"
  accent: "#F5A623"
  success: "#F5A623"
  warning: "#F5A623"
  error: "#FF6B6B"
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
    backgroundColor: "#FFBB47"
  input:
    borderColor: "rgba(255,255,255,0.10)"
    rounded: "{rounded.sm}"
  card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.md}"
  nav-link:
    textColor: "{colors.text}"
---

# SEO Keyword API

## Overview

**Creative North Star:** A dark, glass-panel data console with a sidebar nav — precise where it counts (numbers, alignment), warm where it doesn't (amber accent, generous card padding). Reads as a serious analytics tool, not a stark enterprise SaaS template.

**Product context:** Customer dashboard for a subscription-gated SEO Keyword API SaaS (Google Ads Keyword Planner + PageSpeed Insights + content briefs, sold via API key, paid via Paddle). Real paying customers — SEO marketers and developers — check quota, run keyword searches, and read content briefs here. Category peers: Ahrefs, Semrush, Moz.

**Mode per surface:** Dashboard/keyword tables = Operate. Settings/API key panel = Operate. Signup/upgrade pages = Persuade (out of scope for this pass — this file governs the logged-in dashboard).

**Reference:** A dark creator-analytics dashboard screenshot the user supplied directly (sidebar icon nav, glass-blur stat cards, gradient accent, hero photo). Adopted: dark ground, sidebar nav, glass-blur cards, warm single-accent color. Deliberately dropped: the hero/model photo (no talent photo makes sense for a B2B API tool) and any fabricated chart/graph (the reference's "Active Users" line chart has no corresponding real timeseries data in this product — inventing one would be dishonest UI). This is the third color/direction pivot on this project; see Decisions Log.

**Key characteristics:**
- Dark ground (`#0E0F12`) with translucent glass-blur cards (`backdrop-filter: blur(24px)`), not a flat solid dark
- Left icon sidebar for primary navigation (Keyword Explorer, Content Brief) — replaces the old horizontal tab bar
- One accent color only (amber `#F5A623`) — never a second competing hue, no gradients standing in for it
- Every number in every table/card/tile is monospace with tabular alignment
- No hero photography, no fabricated charts — every visual element maps to real product data

## Colors

**Strategy:** Restrained — one accent (amber), everything else is neutral dark grays built from translucency (surfaces are `rgba(255,255,255,alpha)` over the dark ground, not separate flat hex values), so elevation reads as "more layers of glass," not a different hue.
**Light or dark:** Dark-mode primary, reversing the project's earlier light-mode-first decision. This was an explicit user request to match a supplied reference image (a dark analytics dashboard) rather than a usage-pattern argument — noted here so a future session doesn't "fix" it back to light without asking. If usage data later shows customers screenshotting this dashboard into light-background client reports, that's a reason to revisit.

Amber signals "verified/good" (used for success alerts, high-opportunity badges, the primary CTA, active nav state) — the same hue also covers "warning," differentiated by context/copy rather than a second color, keeping the one-accent rule intact. Error is the only other hue in the system (`#FF6B6B`, semantic-only). Popovers (the Developer dropdown) use a more opaque near-solid background (`#1C1D22`) rather than the thin card glass — floating over arbitrary page content needs more contrast than a resting card does.

## Typography

General Sans (Fontshare, humanist grotesk, not on the overused-display list) carries every role — display, body, and UI — differentiated by weight (700 for headings, 400/500 for body/UI) and size, not by mixing typefaces. JetBrains Mono with tabular-nums is reserved exclusively for numeric data: table columns, stat tile values, quota counters, prices. If a number appears anywhere in the UI, it's in mono.

Loading: General Sans via Fontshare's CSS API (`https://api.fontshare.com/v2/css?f[]=general-sans@400,500,600,700`), JetBrains Mono via Google Fonts.

## Layout

**Sidebar + main content shell** (`.app-shell`): a fixed-width (76px) icon sidebar on the left holding only real, functional navigation (the two actual tool tabs — Keyword Explorer, Content Brief) — no decorative/non-functional nav items. Account-level actions (API key/MCP/Search Console, Upgrade, Switch key) stay in the top bar, unchanged from before, rather than duplicated into the sidebar. Below 720px the sidebar collapses to a horizontal pill row above the content instead of disappearing.

Overview stats moved from a single quota row into a 4-tile grid (Plan, Requests used, Remaining, Resets) — closer to the reference's stat-tile row, still built entirely from real account data (no invented metrics). Grid-disciplined data tables remain unchanged: strict column alignment, no exceptions.

**Grid/flex min-width gotcha (learned the hard way this session):** both `1fr` grid tracks and flex children default their minimum size to their content's min-content width, not `0`. Any grid using `1fr` columns or flex item that should be allowed to shrink below its content's natural width needs `minmax(0, 1fr)` (grid) or explicit `min-width: 0` (flex) — otherwise unwrappable content (long mono numbers, side-by-side badges) silently pushes the whole layout wider than the viewport on mobile. Applied to `.stat-tiles`, `.dash-grid`, `.main-content`.

## Elevation & Depth

Two elevation levels: resting cards use thin glass (`rgba(255,255,255,.045)` + `blur(24px)` + hairline border), popovers use near-solid dark (`#1C1D22` + blur) for legibility over arbitrary content. No glow, no colored shadow, no zero-offset halo — shadows are neutral black at low opacity, offset only.

## Shapes

Radius hierarchy: sm (6px) for buttons/inputs/badges/sidebar icon-tile, md (10px) for cards/tiles, lg (14px) for the sidebar rail and outer dashboard frame. Never mix radii within the same component family. No fully-rounded ("pill") elements except the quota progress bar track/fill and status badges.

## Components

- **Buttons:** primary = solid amber, near-black text (for contrast on a bright fill); outline = glass surface + border; ghost = text-only, muted color, no border. Hover on primary brightens to `#FFBB47`. Disabled = 50% opacity, no shadow.
- **Sidebar nav buttons:** icon + micro-label, muted by default, amber text + amber-tinted background when active (`is-active`, JS-driven) — no separate hover-vs-active color confusion.
- **Cards/stat tiles:** thin glass, border + soft shadow, rounded-md. Hover on interactive rows tints background to `accent-bg`, never changes border color.
- **Popovers (Developer dropdown):** near-solid dark background, not thin glass — must stay legible over whatever content is behind it.
- **Data tables:** header row uppercase/tracked/muted, numeric columns right-aligned in mono, row hover = accent-tinted background, no zebra striping.
- **Alerts:** tinted background at ~12% of the semantic color, border at ~30%, text in a bright tint of the same hue (light-on-dark, not dark-on-light) — success/warning/error only, never decorative.
- **Inputs:** glass surface, 1px border, sm radius, no inner shadow.

## Do's and Don'ts

- Do: keep every number in JetBrains Mono with tabular-nums, no exceptions.
- Do: use amber as the only accent — resist adding a second "highlight" color later.
- Do: give popovers a more opaque background than resting cards — thin glass over arbitrary content is unreadable.
- Do: add `minmax(0, 1fr)` / `min-width: 0` to any grid/flex container whose children might not wrap.
- Don't: reach for a serif or a second display typeface — General Sans carries every role via weight.
- Don't: add a hero photo or any fabricated chart/graph not backed by real product data.
- Don't: add gradients as a stand-in for the accent color — solid amber only.

## Motion

- **Approach:** minimal-functional
- **Easing:** enter(ease-out) exit(ease-in) move(ease-in-out)
- **Duration:** micro(50-100ms) short(150-250ms) medium(250-400ms) long(400-700ms)
- **The one authored moment:** stat tile values count up from 0 on first load of the dashboard (numeric only, ~400ms, ease-out) — reinforces "these are real, computed numbers," nothing else on the page animates on load. (Not yet wired into dashboard.js — currently just a static render; tracked as a follow-up, not implemented this pass.)

## Decisions Log
| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-09-15 | Rejected first proposal: Instrument Serif + emerald + hairline-grid "precision instrument" direction | User rejected color, layout, and overall feel after seeing the HTML preview |
| 2026-09-15 | Adopted warm neutral / muted teal / General Sans / rounded-card system | User selected this direction from 3 alternatives, approved after seeing the revised HTML preview |
| 2026-09-15 | Replaced warm ivory/cream background (#F5F4F1) with near-white (#FFFFFF page, #F7F7F5 cards) | User asked to change the cream color after implementation |
| 2026-09-15 | Replaced muted teal accent (#2F7D6B) with confident blue (#3B6EE0) | User asked to change the green color after implementation |
| 2026-09-16 | Full pivot: light/blue system → dark, sidebar-nav, glass-blur, amber-accent system | User supplied a reference screenshot of a dark creator-analytics dashboard and asked to match it; explicitly declined the hero-photo element as not fitting a B2B API tool |
