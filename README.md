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

## Web console sign-in (mock accounts)

Sign in at `/login` with email + password, then the emailed 6-digit code. These accounts exist only in the mock adapter (`packages/api/src/mock/seed-staff.ts`).
Password for all: `bunk3d-staff-dev`. Code for all: `123456`.

| Console | Email | Role |
|---|---|---|
| Crew HQ | `club.lead@seed.example` | Club lead |
| Crew HQ | `club.coordinator@seed.example` | Club coordinator |
| College HQ | `college.admin@seed.example` | College admin |
| Collab HQ | `brand.owner@seed.example` | Brand owner |
| Collab HQ | `brand.member@seed.example` | Brand member |
| Vendor | `vendor@seed.example` | Vendor |
| Finance | `finance@seed.example` | Finance |
| Finance | `finance.approver@seed.example` | Finance approver |
| Ops | `ops@seed.example` | Operations |
| Ops | `ops.lead@seed.example` | Operations lead |

Each role opens only its own console. Production needs `STAFF_SESSION_SECRET` (32+ characters, see `apps/web/.env.example`).
Auth end-to-end check: start the web app, then `CHROMIUM=<path to Chrome> pnpm --filter @bunk3d/web e2e:auth`.
