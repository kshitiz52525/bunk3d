# bunk3d
## Run it

```
pnpm install
pnpm --filter @bunk3d/mobile start   # Expo dev server (press i / a, or scan with Expo Go)
pnpm --filter @bunk3d/web dev        # Next.js consoles on http://localhost:3000
pnpm typecheck && pnpm lint && pnpm test
```
`packages/ui` generates dark-only tokens from `brand/tokens.json` (`pnpm --filter @bunk3d/ui tokens`).

## Frontend phase (mock data)

The app currently runs on a mock API (`packages/api/src/mock`), so no backend is needed. Mock-only values (never shown in the UI):
- OTP and college-email code: `123456` (4 wrong codes lock the number for 10 minutes, as in S1).
- "I already have an account" signs into a seeded returning user and goes straight in.
- All seed records are flagged `seed: true`.
