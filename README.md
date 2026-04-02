# Couple Therapy

First iteration of a web-first self-guided relationship coaching product for couples in conflict. The experience is grounded in Gottman-style coaching principles while staying clearly on the coaching side of the therapy boundary.

## V1 Product Shape

- Guided conflict conversation with one shared guide voice
- Three entry modes: `Together`, `Partner A solo`, `Partner B solo`
- Private solo responses stay private by default
- Shared dashboard exposes only synthesized relationship signals and coaching recommendations
- Responsive interface tuned for phones and laptops

## Local Development

```bash
npm install
npm run dev
```

## Verification

```bash
npm run build
npm run lint
```

## Implementation Notes

- Frontend stack: React 19 + TypeScript + Vite
- The current app is a static product prototype with in-memory state
- Dashboard scores and plan output are synthesized from the structured guided responses
- No backend persistence or model integration is included in this first pass
