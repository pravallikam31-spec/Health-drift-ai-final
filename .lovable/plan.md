# Plan: NEXUS — Predictive Healthcare AI Experience

A single immersive landing experience inspired by FITTR.com, tuned for a luxury biotech / predictive healthcare brand. Dark, cinematic, alive — not a SaaS template.

## Visual System

- **Palette (oklch tokens in `src/styles.css`)**
  - `--background`: near-black with cool blue tint (`oklch(0.12 0.03 260)`)
  - `--primary`: electric cyan (`oklch(0.82 0.16 220)`)
  - `--accent`: biotech violet (`oklch(0.65 0.22 290)`)
  - `--secondary-glow`: medical blue (`oklch(0.70 0.18 245)`)
  - Gradients: `--gradient-aurora`, `--gradient-pulse`, `--gradient-dna`
  - Shadows: `--shadow-glow-cyan`, `--shadow-glow-violet`, `--glass-blur`
- **Typography**: Display = `Space Grotesk` (large, tight tracking, light weight for hero word "Future"). Body = `Inter` with extra letter-spacing on labels. Mono accents = `JetBrains Mono` for biometric readouts.
- **Motion language**: slow parallax (0.3–0.6 ratio), cinematic ease (`cubic-bezier(0.16, 1, 0.3, 1)`), particles reacting to cursor, breathing pulse loops (~1.2s).

## Tech Choices

- **3D**: `@react-three/fiber` + `@react-three/drei` for the rotating DNA double helix and the glowing 3D heart. Both are lightweight procedural geometry (no external models) so build stays fast and edge-safe.
- **Animation**: `framer-motion` for scroll-triggered fades, parallax, and section transitions. `useScroll` + `useTransform` for parallax layers.
- **Particles**: custom canvas component (`BiotechParticles.tsx`) — lightweight, no heavy deps, reacts to mouse via `pointermove`.
- **Glass cards**: Tailwind utility classes built from CSS tokens (`backdrop-blur-xl`, `bg-white/5`, gradient borders via mask).
- **Routing**: single home route at `src/routes/index.tsx` (immersive scroll, sections are anchors within for the cinematic experience). All real meta in `head()`.

## Sections (top → bottom)

1. **Hero** — fullscreen. Background: gradient aurora + animated DNA helix (3D, slow Y-rotation) + particle field. Foreground: tagline "Predict Your Future Health Before Symptoms Begin", subheading, two CTAs ("Begin Diagnostic Scan", "Watch the Science"). Floating heartbeat readout card, floating AI-insight chip ("Cardiac drift detected · 14 days early"), live ECG line SVG animation.
2. **AI Disease Prediction Showcase** — split layout. Left: 3D heart with glowing veins, pulsing emission. Right: stacked glass cards listing predicted conditions with confidence rings (cardiovascular, metabolic, neurodegenerative) — animated counters on scroll.
3. **Interactive Health Analytics** — large bento grid of glass panels: drift chart (animated SVG path), biomarker radar (custom SVG), risk timeline. Cursor-reactive glow on hover.
4. **Chronic Disease Monitoring** — horizontal scroll-snap of condition cards (diabetes, hypertension, cardiac, renal) each with mini-visualizations and live "monitoring" pulse dot.
5. **AI Healthcare Assistant Preview** — mock conversation interface inside a floating glass slab; messages animate in with typing indicator; pinned to a parallax neural-network background (animated SVG nodes/edges).
6. **Wearable Integration** — orbit visualization: central avatar silhouette, devices (watch, ring, patch, CGM) orbiting on elliptical paths, connection beams drawn with gradient strokes.
7. **Health Drift Score** — hero-size circular gauge (SVG, animated stroke-dashoffset). Score, delta, contributing factors as glass chips floating around the ring with stagger entrance.
8. **Premium CTA** — quiet, vast negative space. Large statement, single luminous CTA, faint DNA echo behind.

Subtle sticky top nav with logo mark + 3 anchor links + "Request Access" pill (glass, gradient border).

## Component Architecture

```text
src/
  routes/
    index.tsx                  // composes sections, sets head()
  components/
    nav/TopNav.tsx
    hero/Hero.tsx
    hero/DNAHelix.tsx          // r3f scene
    hero/HeartbeatLine.tsx     // animated SVG ECG
    fx/BiotechParticles.tsx    // canvas, cursor-reactive
    fx/AuroraBackground.tsx    // gradient blobs + parallax
    fx/NeuralNetwork.tsx       // SVG nodes/edges
    sections/PredictionShowcase.tsx
    sections/Heart3D.tsx       // r3f scene
    sections/HealthAnalytics.tsx
    sections/ChronicMonitor.tsx
    sections/AIAssistant.tsx
    sections/WearableOrbit.tsx
    sections/DriftScore.tsx
    sections/FinalCTA.tsx
    ui/GlassCard.tsx
    ui/GlowButton.tsx
    ui/MetricChip.tsx
  hooks/
    useParallax.ts
    useMousePosition.ts
```

## Design Tokens & Styles

- Rewrite `src/styles.css` `:root` to dark-first (no light theme toggle — this is a cinematic experience).
- Add gradient and shadow tokens, plus utility classes `.glass`, `.glow-cyan`, `.glow-violet`, `.text-aurora` (gradient text), `.divider-pulse`.
- Add `@keyframes` for: `pulse-soft`, `dna-rotate`, `ecg`, `aurora-drift`, `float-y`.

## Performance & Quality

- Lazy-mount 3D scenes via `React.lazy` + `Suspense` with skeleton glass placeholders so first paint stays fast.
- `prefers-reduced-motion` respected (DNA slows, particles disabled, parallax flattened).
- Responsive: mobile collapses bento to stacked cards, swaps 3D heart for an animated SVG fallback, hides particle canvas under 640px.
- SEO: index route `head()` with title "NEXUS · Predictive Healthcare AI", description, og tags.

## Dependencies to add

- `three`, `@react-three/fiber`, `@react-three/drei`
- `framer-motion`

## Out of Scope

- Real backend / auth / data — all values are illustrative mock data.
- Multi-page routing — this is a single immersive landing experience as requested.

Press "Implement plan" to build it.
