# Hiep Tran's portfolio

A personal portfolio built with React 19, TanStack Start, TypeScript, and Three.js. The existing multilingual greeting and handwritten signature are retained, with a full portfolio behind the intro.

## Run locally

```sh
bun install
bun --bun run dev
```

Open `http://localhost:3000`.

```sh
bun --bun run build
bun --bun run preview
bun --bun run test
bunx tsc --noEmit
```

## Personalize

- **Profile and featured projects:** `src/lib/profile.ts`. The content is based on the public `kid1z` GitHub profile and repositories. Contact links use the supplied LinkedIn profile; no email, employment history, or client claims are invented.
- **Copy and sections:** `src/components/portfolio.tsx`. The page has work, about, and contact anchors. The existing `/about` route also opens the about section.
- **Colors and layout:** Tailwind utilities in `src/components/portfolio.tsx` and `src/components/sculpture.tsx` control layout, responsive sizing, and interactive states. Shared theme tokens in `src/styles.css` map to utilities such as `text-muted`, `bg-paper`, and `border-line`, supporting system light/dark themes and the in-page theme switch. The stylesheet retains global defaults, intro gating, and animation hooks. Fonts are bundled locally, not fetched from Google.
- **Intro:** `src/components/old-intro.tsx` supplies the original typing/deleting animation and black orb, on a light backdrop in both themes. `src/components/typing.tsx` wraps it with session and accessibility controls. A small first-paint preference script shows the intro before hydration, without flashing the home page; returning sessions and direct anchor visits bypass it. After one complete greeting cycle (or Skip/Escape), a GSAP timeline fades the overlay into a staggered home-page reveal. Replay restarts the original animation from the first greeting.
- **Smooth scrolling:** `src/lib/use-portfolio-scroll.ts` adds GSAP ScrollSmoother after the intro finishes. The intro and fixed skip link stay outside the transformed content. Section links retain URL history and keyboard focus, replay pauses scrolling, and touch scrolling stays native. Reduced-motion preferences bypass the intro, entrance animation, and ScrollSmoother; without JavaScript, the portfolio remains visible with native scrolling.
- **3D:** `src/lib/sculpture-scene.ts`, loaded dynamically by `src/components/sculpture.tsx`. The knot, orbit, and bloom are original procedural geometry, with no external models or texture downloads required. Use the shape buttons, drag to rotate, or the left/right controls. Animation can be paused and the view reset.

## Performance and accessibility

The document and project links render without WebGL. Static sculpture posters remain visible while the engine loads or if WebGL fails; an explicit retry action is available. The engine caps pixel ratio and suspends rendering when offscreen or in a hidden tab. Reduced motion disables automatic animation. The intro releases background inertness, scroll lock, timers, and keyboard listeners when dismissed.

## Image sources

- `public/images/tiptap.jpg`: frame from the original demo linked in [Tiptap Table Free's README](https://github.com/kid1z/tiptap-table-free).
- `public/images/cyberhealth.jpg`: capture of the project's public [CyberHealth site](https://cyberhealth1.vercel.app/), linked from the [HealthScore repository](https://github.com/kid1z/healthscore).
- `public/images/avatar.jpg`: the public [kid1z GitHub avatar](https://github.com/kid1z), displayed as an avatar, not a personal photograph.
- Sculpture posters are local renders of this portfolio's original Three.js scene.

No API keys or environment variables are required.
