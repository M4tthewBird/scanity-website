# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary: real estate and property professionals (agents, developers, property managers) who need listings and spaces to feel present online. Other industries referenced on the site — construction/AEC, retail, cultural heritage — are directional target markets, not yet proven primary segments.

## Product Purpose

Scanity turns ordinary camera footage of a physical subject — anything from a small object to a large area — into an accurate, photorealistic 3D digital twin that people can explore, measure, share, and build on directly in a browser. Success means the subject becomes a spatial record that "feels like being there" without the visitor needing any special software or hardware.

## Positioning

Full-service reconstruction is the core mechanism: a neighboring product that only ships a scanning app or sells hardware could not truthfully claim the same thing. Two capture paths exist today: (1) Scanity's own team visits the site and captures it, or (2) a trained real estate videographer/photographer captures the footage themselves following Scanity's capture guidance. Either way, Scanity always owns the in-house processing and 3D reconstruction step — customers or capture partners never need to learn reconstruction software. Interactive viewing uses a splat/point-cloud style 3D viewer (see demo embeds), not photo galleries or static renders.

## Operating Context

- On-site capture, either by Scanity's team or a guided real estate capture partner.
- In-house processing pipeline reconstructs footage into a lightweight, explorable 3D model.
- Delivery is a browser-based interactive viewer: drag to orbit, scroll to zoom, pinch to move closer, on any modern device — no plugin or app install.
- Site is bilingual: Czech (default, scanity.cz) and English (scanity.cz/en/).

## Capabilities and Constraints

- Capture scale spans from small objects (e.g. a single piece of jewelry) up to large areas (e.g. an entire building) — the product is not limited to room- or apartment-sized spaces, even though real estate is the current beachhead market.
- Full-service capture (Scanity's own team) is the current default model.
- Teaching/enabling real estate videographers or photographers to capture footage themselves, with Scanity handling all processing and reconstruction, is a live secondary path today — not just a hypothetical future direction.
- Whether Scanity will ever sell self-serve scanning hardware/apps beyond this guided-capture-partner model is explicitly undecided; do not assume or design for it.
- Contact form submits client-side via EmailJS, with a hidden honeypot field for spam protection.
- The interactive demo embeds Scanity's own viewer (`viewer.scanity.cz/?id=…`, the `scanity-viewer` repo; its product record is `scanity-viewer/PRODUCT.md`), lazy-loaded only once the visitor clicks to load it, and is switchable between sample captures (currently "Private Gym", shown first, "Cathedral, aerial view" and "Face shield").
- Resolved: the Czech (CS) homepage (`index.html`) now carries real Czech copy and `lang="cs"`, distinct from the English twin at `en/index.html`. The translation was written to fix an audit-flagged defect (CS default page was English content mislabeled as Czech) and should get a native-speaker review pass before the site goes live.

## Brand Commitments

- Name: Scanity. Domain: scanity.cz (Czech-based company).
- Contact: matyas.ptacek@scanity.cz (Matyáš Ptáček, operator as a private individual until a business ID exists).
- Logo asset: `assets/scanity_logo.svg`.
- Current typeface in use: Manrope.

## Evidence on Hand

- Pre-launch stage: Scanity has no real, nameable customers or case studies yet.
- The trust-strip industry labels (Architecture, Construction, Real Estate, Retail, Cultural Heritage, Jewelry, Golf Courses, Manufacturing, E-commerce, Infrastructure) are target markets the company is pursuing, not current clients — future work must not present them as customer proof or add logos implying real customers. The strip scrolls continuously (a duplicated-content marquee) rather than sitting static, which is why the list can hold more items than would fit in one static row.
- A promo video demonstrating the product is in production but not yet available; the hero shows an honest "coming soon" teaser (see DESIGN.md → Video Teaser) rather than fabricated UI stats. An earlier version of the hero showed illustrative mockup values ("12.4M points", "98.6% processed", "Apartment 05") — these were removed and must not be reintroduced as if they were real performance data.
- The demo viewer's captures ("Private Gym", "Cathedral, aerial view", "Face shield") are real scans served from Scanity's own viewer and can be treated as genuine product demonstration. "Private Gym" is Scanity's own demo capture, not a client project, and must not be presented as a customer or reference.

## Product Principles

1. Remove friction from getting a digital twin: customers should never need to buy scanning equipment or learn reconstruction software.
2. In-house processing is the value, not the capture device: capture may happen via Scanity's team or a guided partner, but Scanity always owns reconstruction quality.
3. Real estate is the current beachhead; other verticals shown on the site are directional targets, not proven segments — don't design as if they're equally validated.
4. Don't overstate maturity: this is a pre-launch product, so future work must not fabricate customers, logos, testimonials, or performance numbers.
5. Delivery must stay ordinary-browser-first: exploring, measuring, and sharing a captured space should never require a special app or hardware on the viewer's end.
