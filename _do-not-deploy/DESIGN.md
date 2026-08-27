---
name: Scanity
description: Turn anything into a living 3D model — full-service photorealistic digital twins from ordinary camera footage.
colors:
  deep-ink: "#101112"
  ink-soft: "#4f555a"
  scan-blue: "#246bfd"
  white: "#ffffff"
  cloud: "#f5f6f7"
  muted: "#676d72"
  line: "#1011121f"
  positive: "#259664"
  negative: "#d64545"
typography:
  display:
    fontFamily: "Manrope, sans-serif"
    fontSize: "clamp(4rem, 7.5vw, 7.4rem)"
    fontWeight: 500
    lineHeight: 1.1
    letterSpacing: "-0.06em"
  headline:
    fontFamily: "Manrope, sans-serif"
    fontSize: "clamp(3rem, 5.5vw, 5.8rem)"
    fontWeight: 500
    lineHeight: 1
    letterSpacing: "-0.06em"
  title:
    fontFamily: "Manrope, sans-serif"
    fontSize: "1.3rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.04em"
  body:
    fontFamily: "Manrope, sans-serif"
    fontSize: "0.98rem"
    fontWeight: 400
    lineHeight: 1.75
    letterSpacing: "normal"
  label:
    fontFamily: "Manrope, sans-serif"
    fontSize: "0.62rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "0.11em"
rounded:
  pill: "100px"
  lg: "24px"
  md: "16px"
  sm: "14px"
spacing:
  xs: "8px"
  sm: "16px"
  md: "28px"
  lg: "50px"
  xl: "100px"
components:
  button-primary:
    backgroundColor: "{colors.deep-ink}"
    textColor: "{colors.white}"
    rounded: "{rounded.pill}"
    padding: "15px 21px"
  button-primary-hover:
    backgroundColor: "{colors.scan-blue}"
    textColor: "{colors.white}"
    rounded: "{rounded.pill}"
    padding: "15px 21px"
  button-ghost:
    backgroundColor: "color-mix(in srgb, white 50%, transparent)"
    textColor: "{colors.deep-ink}"
    rounded: "{rounded.pill}"
    padding: "15px 21px"
  button-ghost-hover:
    backgroundColor: "{colors.white}"
    textColor: "{colors.deep-ink}"
    rounded: "{rounded.pill}"
    padding: "15px 21px"
---

# Design System: Scanity

## Overview

**Creative North Star: "The Reconstructed Room"**

Scanity's interface reads like its own product output: solid, near-black forms standing in for structure, and soft translucent glass standing in for the reconstructed space around them. The mood is precise and understated — the interface stays quiet so the 3D capture itself is always the most interesting thing on the page. Deep Ink carries almost all of the weight (text, fills, icon badges); Scan Blue appears rarely and only where something is happening or actionable (a hover, a link, the demo viewer's scan-beam loading sweep). Nothing shouts; hierarchy is built with scale and generous whitespace, not color or noise.

A barely-perceptible film-grain texture (1.8% opacity fractal noise) sits fixed over the entire page, keeping the large flat cloud-grey and white surfaces from feeling sterile or purely digital. Type is set entirely in Manrope, one family carrying every role from the 7rem hero display down to 0.5rem uppercase labels, differentiated by weight and tracking rather than by font-pairing.

**Key Characteristics:**
- One typeface (Manrope), one accent color (Scan Blue), used sparingly against a dominant Deep Ink / white / cloud-grey neutral field.
- A promo-video teaser as the hero's signature visual: an honest "coming soon" placeholder, not a fake live demo or a generic stock photo.
- Pill-shaped buttons and navigation throughout, contrasted with completely boxless, underline-only form fields.
- Large asymmetric section headers (a narrow kicker column beside a wide heading) opening most major sections.
- A subtle full-page grain overlay as the only textural decoration.

## Colors

The palette is almost monochrome by design: one deep neutral, one accent, and a narrow band of grays — plus two small semantic colors for form feedback.

### Primary
- **Scan Blue** (#246bfd): The system's single accent. Used only for meaningful state or motion — link/button hover fills, the focus-visible outline, the hero's animated scan beam, the workflow's connecting orb, and small process-step labels. Never used as a large fill or background.

### Neutral
- **Deep Ink** (#101112): The dominant color of the system — primary text, default button fill, all circular icon badges, headings. Functions as the de-facto "brand" color even though it's neutral in hue.
- **White** (#ffffff): Base surface color for elevated sections (solutions, footer) and the fill inside translucent glass panels.
- **Cloud** (#f5f6f7): The page's resting background color; also the hover background for list rows and the active-state background in the language dropdown.
- **Muted** (#676d72): Secondary/body text color — every paragraph of supporting copy, captions, and placeholders uses this rather than full-strength ink. Tuned to clear 4.5:1 contrast against Cloud (was #6e7479, which fell to ~4.37:1 on Cloud — an AA failure caught by audit).
- **Line** (rgba equivalent of Deep Ink at 12% — `#1011121f`): The system's only border/divider color, used as thin hairlines (section dividers, form underlines, ghost-button borders) rather than a separate gray.
- **Ink Soft** (#4f555a): A lighter neutral used specifically for resting-state nav text (desktop nav links, language dropdown items) — distinct from both full-strength Deep Ink and the lighter Muted body-copy gray.

### Named Rules
**The One Accent Rule.** Scan Blue is reserved for hover states, the focus ring, and the few live/animated elements (the demo viewer's scan-beam loading sweep, the workflow orb, the hero teaser's ambient glow). It never fills a large surface or competes with Deep Ink for dominance.

### Semantic (form feedback)
- **Positive** (#259664): Success text in the contact form.
- **Negative** (#d64545): Form-submission error text.

## Typography

**Display / Body Font:** Manrope (with a generic sans-serif fallback) — the only typeface in the system, loaded at weights 400/500/600/700.

**Character:** A single geometric grotesque carrying the entire hierarchy. Large text is set at medium weight (500) with tight negative tracking for a confident, engineered feel; small labels go the opposite direction — bold weight with wide positive tracking and uppercase case — for a technical, instrument-panel feel.

### Hierarchy
- **Display** (500, `clamp(4rem, 7.5vw, 7.4rem)`, line-height 1.1, tracking -0.06em): The hero headline only.
- **Headline** (500, sizes from `clamp(3rem, 4.4vw, 4.8rem)` up to `clamp(4rem, 7vw, 7rem)` depending on section, tracking -0.06em): Every major section's `h2` (platform, solutions, demo, contact). Line-height tightens toward 0.92 in the largest instance (contact) and sits at 1 elsewhere.
- **Title** (600, ~1.22–1.3rem, tracking -0.04em): Sub-headings inside cards and list rows (process steps, use cases).
- **Body** (400, 0.72–0.98rem, line-height 1.65–1.75, color Muted): Supporting paragraphs throughout; the hero description is the largest (0.98rem) and sets the upper bound, denser sections run closer to 0.72–0.86rem.
- **Label** (600–700, 0.58–0.65rem, tracking 0.1–0.13em, uppercase, color Muted or Scan Blue): Eyebrows, section kickers, form-field labels, and step numbers ("01 / CAPTURE"). Floor raised from an earlier 0.48rem (~7.7px) after an audit flagged several label instances as too small to read comfortably at default zoom.

### Named Rules
**The One Family Rule.** Every text role — from the 7.4rem hero headline to a 0.5rem form caption — is Manrope. Hierarchy is built entirely through size, weight, tracking, and color, never a second typeface.

## Layout

The page is built on a single centered container (`.shell`, `min(1320px, 100% - 56px)`, narrowing to `100% - 30px` under 760px) with no visible column grid outside it — sections instead compose their own local grids.

The recurring section-opener pattern is an asymmetric two-column header: a narrow kicker column (`0.7fr`, numbered "01", "02"...) beside a wide heading column (`2.3fr`), gapped 50px. Below that, layouts vary by content: a 3-column grid for the capture/process/explore workflow, a 5-column row grid for the use-case list (number / icon / title / description / arrow), and a two-column split for the contact panel. The hero is not a column split — it's a centered text block (copy, actions) stacked above a full-width 16:9 visual panel below it.

Section vertical rhythm is generous on desktop — roughly 100–145px of padding above and below each major section, including Contact (130px, matching Demo's wrapped-panel pattern) — compressing to roughly 70–100px under 760px, where every multi-column section collapses to a single stacked column. Three breakpoints govern the responsive behavior: 1000px (desktop nav *and* the header's contact/language/demo controls collapse together into a single hamburger + dropdown, avoiding a window where both are visible at once), 760px (grids stack, hero and headline type sizes shrink, the hero visual's caption hides), and 480px (further fine-tuning of the hero visual and headline sizes).

`html` carries `scroll-padding-top: calc(80px + env(safe-area-inset-top))` so the in-page nav anchors (`#platform`, `#solutions`, `#demo`, `#contact`) never land tucked under the sticky, blurred header — an invariant worth preserving even as section padding changes, since the anchor targets no longer depend on incidentally-large section padding to stay clear.

The page opts into `viewport-fit=cover` (both language versions) so it can draw edge-to-edge on notched phones, which makes it responsible for its own safe-area padding: `body` pads its left/right edges, `.site-header` pads its top (the full-bleed blurred backdrop still extends under the notch; only the actual nav content shifts clear of it), and `.site-footer` takes the larger of its normal 28px bottom padding or the safe-area inset. All three resolve to their plain values on non-notched devices.

Interaction affordances are gated by actual input capability, not viewport width — a touchscreen laptop at desktop width has a coarse pointer despite the wide viewport, and a tablet with a mouse has a fine one despite the narrow one. Every decorative `:hover` rule in the system lives inside `@media (hover: hover) and (pointer: fine)`; `@media (pointer: coarse)` separately enlarges a handful of desktop-only targets (the language toggle, header nav links, the header's small CTA, footer links) that would otherwise be sized for cursor precision.

## Elevation & Depth

The current build layers translucent white surfaces (background alpha, roughly 70–90% white) over blurred backdrops (`backdrop-filter: blur(10–18px)`) for its floating chrome — the header, dropdowns, the hero teaser badge, and section cards. These are edged with a thin near-white border and lifted with large, low-opacity, soft-edged shadows rather than tight or hard-edged ones; nothing in the system uses a sharp drop shadow. This is presented as an observation of the current implementation rather than a fixed rule — it can evolve without violating a stated invariant.

The desktop nav pill deliberately does **not** blur independently — it sits directly inside the sticky header's own full-bleed blurred backdrop, so a second nested blur layer was redundant compositing cost during scroll (caught by audit as a performance finding). Its opacity was raised slightly (72% → 80% white) to stay legible without its own blur.

### Shadow Vocabulary
- **Ambient panel** (`box-shadow: 0 20px 50px #2731391f`): Process-step cards, the hero teaser's play button, the demo viewer's launch icon.
- **Hero lift** (`box-shadow: 0 35px 100px #343d4521`): The hero visual panel, the deepest shadow in the system.
- **Chrome lift** (`box-shadow: 0 8px 30px #272f3612` for the desktop nav; `0 20px 40px #1e252b1f` for dropdown menus; `0 25px 60px #1e252b24` for the mobile nav panel): Floating glass chrome at various scales.
- **Accent glow** (`box-shadow: 0 24px 60px #246bfd4d`): The single case of a colored shadow — under the blue-filled workflow orb.

## Shapes

Two form languages coexist deliberately: fully rounded pills (`border-radius: 100px` / `999px`) for every interactive control — buttons, the desktop nav bar, the language toggle, the demo viewer's tab switcher — and large soft rounded rectangles (14–28px radius) for content panels and cards. Icon badges are always full circles. The one deliberate exception is the contact form: inputs and the textarea carry no radius and no box at all, just a bottom hairline — a boxless, underline-only field style that contrasts with the rounded system everywhere else.

## Components

### Buttons
- **Shape:** Full pill (100px radius).
- **Primary (`button-dark`):** Deep Ink fill, white text, 0.72rem bold (700) label, 15px/21px padding. Hover swaps the fill to Scan Blue and lifts the button 2px (`translateY(-2px)`).
- **Ghost (`button-ghost`):** Translucent white fill (50% White) with a Line-colored border; hover brings the fill to full opaque white. Used for lower-emphasis actions ("Contact us") beside a primary button.
- **Small variant:** Tighter padding (11px/17px, or 8px/13px in the header) for secondary placements like the header's "Try demo" button.

### Cards / Containers
- **Corner style:** 100px (pill) for the small floating hero teaser badge, 16px for content cards (process steps), 20–28px for full section panels (hero visual, workflow stage, demo viewer, contact panel).
- **Background:** Translucent white over a soft gradient backdrop; see Elevation & Depth.
- **Shadow strategy:** Ambient panel or hero-lift shadows per the vocabulary above; never a hard shadow.
- **Border:** Thin near-white rim (90% White) rather than a structural border.
- **Leading icon badge:** A recurring pattern — a small filled circle (Deep Ink background, white icon) leads process-step cards, the hero teaser's play button, and section list rows.

### Inputs / Fields
- **Style:** No box, no radius — a single bottom hairline (Line color) is the only boundary; label sits above as a small uppercase Muted caption.
- **Focus:** The hairline darkens to Deep Ink; no glow, no outline.
- **Feedback:** Success/error text below the form uses Positive/Negative respectively (see Colors → Semantic).

### Navigation
- **Desktop:** A floating pill-shaped glass bar centered in the sticky header; links are small (0.6rem), bold, Muted-to-Ink on hover.
- **Mobile (<1000px):** The desktop bar is replaced by a hamburger button that opens a glass dropdown panel below the header, with divided list rows and a two-button language switch (active language filled Deep Ink).
- **Language switch (desktop):** A bordered pill toggle that opens a small glass dropdown list; the selected language row is Cloud-filled.

### Video Teaser (signature component)
The hero's centerpiece: an honest "coming soon" placeholder for a promo video that's still in production, replacing an earlier simulated point-cloud scan illustration that carried a full fake toolbar (fabricated project name, "processing" percentage), two floating stat chips, and a "Sample data" disclosure pill. That mockup was retired for two reasons: it read as a busy, five-widget scene competing with the page's own real interactive demo further down (`#demo`), and it invited exactly the kind of unearned-authority problem PRODUCT.md warns against — illustrative numbers that could be mistaken for real captured data. The teaser is deliberately calmer: a faint measurement grid (masked to a soft vignette), a small ambient Scan-Blue glow, a Deep-Ink play-button badge (same icon and shadow token as the demo viewer's launch button, for visual continuity), a small pill disclosing "Video coming soon," and a one-line caption naming what the video will show.

The panel is **not** a clickable control — there's no video to launch yet, so it carries no button semantics and does nothing on click. Treating it as inert is the deliberate choice: a dead button that looks interactive is a worse experience than an honest static teaser. Swap it for a real `<video>` or embed once the asset exists, at which point it should likely regain proper button/play semantics.

The demo section's viewer (`.viewer-loading`) has its own, unrelated scan-beam loading state: a short Scan-Blue beam sweeps a fixed track while the real superspl.at embed loads, replacing what was previously a silent gap between clicking "Load 3D viewer" and the third-party content appearing. It's driven by the iframe's actual `load` event, not a timer, so the wait is truthful; the same treatment reappears briefly when switching between sample captures.

## Do's and Don'ts

### Do:
- **Do** keep Scan Blue rare — hover states, the focus ring, and live/animated elements only (see The One Accent Rule).
- **Do** pair every icon with a full-circle Deep Ink badge when introducing a card, step, or list row.
- **Do** keep buttons pill-shaped and compact; there is no large, heavy CTA anywhere in the system.
- **Do** open major sections with the asymmetric kicker + heading header pattern.
- **Do** keep form fields boxless and underline-only; this is the deliberate exception to the system's rounded shape language, not an oversight.

### Don't:
- **Don't** add customer logos or named case studies to the trust strip. Per PRODUCT.md, Scanity is pre-launch with no real clients yet — the strip must stay industry-label-only until real evidence exists. The strip is a continuous left-to-right marquee (two duplicated `.trust-row` copies inside `.trust-track`, animated by `translateX`, paused on hover for fine pointers, collapsed to a single static frame by the global `prefers-reduced-motion` rule) — any future edit to its item list must update both duplicated rows identically or the loop will visibly jump.
- **Don't** introduce a second typeface. Every role, from the largest display heading to the smallest label, stays in Manrope.
- **Don't** give the hero teaser fake interactivity or fabricated stats. It stays a static, honestly-labeled "coming soon" panel — no dead click handler, no illustrative numbers standing in for real captured data (see PRODUCT.md → Evidence on Hand) — until the real video exists to replace it.
- **Don't** add hard-edged or sharply-defined shadows; every elevated surface in the current system uses a large, soft, low-opacity shadow.
