# bunk3d
## Run it

```
pnpm install
pnpm --filter @bunk3d/mobile start   # Expo dev server (press i / a, or scan with Expo Go)
pnpm --filter @bunk3d/web dev        # Next.js consoles on http://localhost:3000
pnpm typecheck && pnpm lint && pnpm test
```
`packages/ui` generates dark-only tokens from `brand/tokens.json` (`pnpm --filter @bunk3d/ui tokens`).
