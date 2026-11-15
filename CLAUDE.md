# Bunk3d — CLAUDE.md

Bunk3d (say it "bunked", always spelled **Bunk3d**) is a campus app for verified college students in India. Tagline: **College happens outside class.** One account, two sides: **The Vibe** (Tea feed, Study, What's Poppin' events, The Crew clubs, Discover, DMs) and **The Hustle** (Gigs, My Work, Swap, My Bag; hidden until a campus reaches wave 3). Managers use web consoles (Crew HQ, College HQ, Collab HQ, Vendor, Finance, Ops).

`HANDOFF.md` is the source of truth. `design/screens/*.dc.html` are the spec for layout, copy, states and flows (not code to port). `design/screenshots/` has renders. `brand/` has tokens, guidelines and logos. Sections 3, 4 and 10 of HANDOFF.md are copied below word for word; if they ever differ, HANDOFF.md wins and this file must be fixed.

## Working rules (apply to every session)
- Copy screen text exactly. Build every state in each screen and in `S1-States`.
- Back always returns to the previous screen through real stack navigation. Never copy the prototype's `dc-import` / `bk-ov` overlays or its Preview/Simulate/(demo) buttons or sample props.
- Dark only, no emoji in the UI, never white text on lime.
- All money is computed on the server: student fee + 18% GST on the fee; ticket price + 5% platform fee + 18% GST on that fee; rounded to paise. Unit-test against the worked examples in §4.
- Row Level Security on every table, with tests for who can read and write.
- Never invent numbers or promise earnings. Use real data or clearly marked seed data.
- Small commits, one milestone at a time. At the end of each milestone, show what works and how to run it.
- Build in wave order (HANDOFF §8). Do not start a later wave without approval.

## Stack (pending owner confirmation, HANDOFF §1)
pnpm + Turborepo monorepo. Expo (React Native) + TypeScript + Expo Router for mobile. Next.js App Router + TypeScript for web consoles. Supabase (Postgres + RLS, Auth, Storage, Realtime, Edge Functions). Razorpay (payments in), RazorpayX (payouts), Expo Notifications.

## Owner decisions (15 Nov 2026, override HANDOFF.md where they differ)
- Stack in §1 confirmed.
- Stories support **video as well as photos** (HANDOFF §11.3 reversed). Stories still can never be anonymous. Video needs the same safety check as photos.
- Story video limits: 15 seconds and 50 MB per story video, auto-advancing like photos.
- **Video posts are allowed** in the feed too (T3/T11 and T1/T2/T9), even though the original screens show only text, photo, carousel and poll. Same topic, anonymity, and safety-check rules as photo posts.
- Ticket total for ₹199 is ₹210.74 (2-decimal rounding), confirmed by the owner.
- Naming is Bunk3d everywhere; "No Cap" in old files is stale.
- Anonymous posting unlocks at 20 karma, a 7-day-old account **and no active strike** (per S1-States). T3 and T11 lock copy must match.
- Money rounding: round to 2 decimal places (paise) at each step. For a ₹199 ticket that gives fee ₹9.95, GST ₹1.79, total ₹210.74, which differs from the ₹210.80 example in §4. The unit tests follow the 2-decimal rule, and the §4 text below is left as written until the owner decides whether to correct the example.

## Repo layout (target)
```
apps/mobile      Expo app (Vibe, and Hustle behind the wave gate)
apps/web         Next.js consoles (Crew HQ, College HQ, Collab HQ, Vendor, Finance, Ops) + phone-browser scanner
packages/ui      Design tokens (generated from brand/tokens.json) + primitives
packages/db      Supabase migrations, generated types, RLS tests
HANDOFF.md       Product spec, source of truth
design/          Screen specs (.dc.html), canvas.json, screenshots
brand/           tokens.json, guidelines, logos
```

---

## 3. Design system

Tokens are in `brand/tokens.json`; generate them into `packages/ui`. **The app is dark only.** The owner decided there's no light theme in the app; the light tokens are for print.

- **Colours:**
  - `bg` #0D0D0F · `surface` #17171B · `surface-raised` #1F1F25 · `line` #26262D · `ink` #F5F5F0 · `ink-muted` #9A9AA5
  - `lime` #D4FF3A is the brand colour. Text on lime is always #0D0D0F, never white.
  - `violet` #B49CFF means three things: The Hustle, anonymous identity, and the hard sticker shadow.
  - `hot` #FF6B9A is for urgent, live or unread; use it at most once per view.
  - `success` #3DDC97, warning #FFB547, pending banner #3D2E0D on #FFD58A.
- **Type:** Unbounded 800 for display, numbers and the wordmark; Inter for everything people read.
- **Signature device:** a hard offset sticker shadow (`4px 4px 0 #B49CFF`), slight rotations on stickers (−6° to 6°), and big rounded cards (16–24px radius).
- **Avoid:** emoji in UI, gradient washes, left-border accent cards.
- **Icons:** inline stroke icons, 2–2.4px.
- **Accessibility:** touch targets ≥44px, text contrast ≥4.5:1, a label on every icon button, and reduced-motion support (the motion spec shows the fallback).
- **Motion:** follow `M3-Motion`.
  - Header hides on scroll down (−86, then −150).
  - The tab bar hides too.
  - The "Spill it" button shrinks.
  - A new-posts pill appears.
  - Double-tap upvote shows a burst.
  - The photo viewer opens with a scale-in.
  - Stories auto-advance.
- **Wordmark:** `bunk3d` in lower case with a lime 3.
- **Voice:** casual Gen Z, short, honest. Never promise earnings. Every number shown must be true.


---

## 4. Core business rules (must not change)

### Identity, age, verification
- **Verified students only.** Verify by college email domain (instant) or student ID photo. ID photos are seen only by Bunk3d staff, reviewed within about 24h, and deleted 30 days after review.
- **18+ only.** If the date of birth is under 18, delete what was entered and show the A6 "18+ for now" screen. The date of birth is never shown.
- **While verification is pending**, the user can finish their profile, read, read notices, browse public events and RSVP. Posting, commenting, voting and DMs unlock after verification. A **yellow banner stays at the top of the Vibe** until they're verified (T1 shows it). The post button reads "Post after verify".
- **The college can't see students.** Bunk3d isn't run by the college, and admins can't see who posted anonymously.
- Phone number and email are never shown to anyone.
- Colleges go live one at a time. A3 has a waitlist; 25 classmates moves a campus up the queue.

### Posting, anonymity, moderation
- **Anonymous posting** unlocks at **20 karma and a 7-day-old account**. Before that, the Anonymous option shows a lock and the line "Anon unlocks at 20 karma and a 7-day-old account" (T3 and T11 must match).
- Anonymous means anonymous to students, **not** to Bunk3d staff.
- Anonymous posts can't name or point at a real student who isn't a public figure. Anonymous photos get a face-blur option. **Stories can never be anonymous.**
- **Karma is private.** Only you see it, and people are never ranked; Clout Board ranks clubs only.
- **Club posts are always named.** Clubs can't post anonymously.
- **Topics:** every feed post needs one.
  - Campus topics: Academics, Placements, Hostel & PG, Canteen, Events, Rant, Random.
  - Community posts use community tags (e.g. Placement Season 2027: Interview exp, OA prep, Offers, Referrals, Rant).
- **Communities (w2):** cross-college. A post there shows the poster's college name, and campus-only posts never appear in communities.
- **Sharing:** someone else's photo can only be **sent in DMs**, never added to your story. Only your own posts can go to your story. A photo post can go to Feed, Story, or both (at least one).
- **Safety check:** every post gets a quick automated check. A flagged post goes to Campus Mods first, and the user is told why.
- **Mod queue:** Campus Mods vote. **Two matching votes decide; a split goes to Bunk3d ops.** Mods never see who posted and never see their own posts in the queue.
- **Strikes:** 1 = warning, 2 = 24h mute, 3 = 7-day ban, 4 = removed. Strikes expire after 90 days.
- **Report reasons (X3):** harassment, hate, naming/doxxing, sexual content, self-harm, spam, misinformation, something else. The person reported is never told who reported, and the reporter can also block.

### Discover
- **Spark is not a dating app.** It's for friends, study partners, sports and squads; romantic or sexual approaches get removed. It's for verified students 18+ only, and **Discover is off by default**.
- **Shoot Your Shot:** 3 invites a day, each a concrete plan. Declines are silent.
- **Radar:** **ghost mode is on by default.** Location sharing is opt-in, per person, time-limited (15/30/60 min) and approximate (about 150m). It switches off by itself and is never visible to people you haven't picked. For meetups, the exact spot is shown only to approved people, 1 hour before.

### Events and tickets
- RSVP and team registration (teams of 2–4, joined by invite or code).
- Tickets work offline, and the QR code rotates about every minute, so screenshots fail.
- The organiser checks people in on the phone-browser scanner (CH5).
- Results and certificates are published by the host and added to the student's profile.
- **Paid tickets are in** (wave 3, alongside payments). The organiser picks Free or Paid and sets a price when creating the event (CH4 / E4).
  - The buyer pays: ticket price + **5% platform fee** + **18% GST on that platform fee**. Example: ₹199 + ₹10 + ₹1.80 = **₹210.80** (E7).
  - Payment goes through Razorpay. Full refund until 48h before the event, none after; automatic refund if the host cancels.
  - Free events skip checkout: RSVP or team registration goes straight to the ticket (E6 → E3).

### Study
- Notes and PYQs are uploaded with a checkbox: "This is my own work or a past paper — not a copyrighted textbook."
- Notes can be named or anonymous. Upvotes rank them. They can be saved for offline reading.
- Attendance (K2) is a personal tracker with a 75% rule, not the college register.
- Deadlines (K3) are added by classmates and confirmed by upvotes.

### Money (The Hustle), exact
**Student fee**, taken from gig pay:

| Case | Fee |
|---|---|
| Paid gig (fixed or day rate) | 5% |
| After ₹25,000 lifetime earnings | 3% |
| Club-published paid gig | 2.5% |
| Referral / commission gig | 0% |
| Your first ₹1,000 ever | 0% |
| Volunteer, certificate or XP task | 0% |
| Cap | ₹1,000 per gig (before GST) |

- **GST: 18% is charged extra on the Bunk3d fee, never on the student's pay.** Take-home = pay − fee − 18% of the fee. Show amounts in paise when they aren't whole rupees.

  | Gig | Fee | GST on fee | Take-home |
  |---|---|---|---|
  | ₹2,500 paid gig (5%) | ₹125 | ₹22.50 | ₹2,352.50 |
  | ₹800 club gig (2.5%) | ₹20 | ₹3.60 | ₹776.40 |
  | ₹1,000 club gig (2.5%) | ₹25 | ₹4.50 | ₹970.50 |
  | ₹1,200, student's first gig (5% on ₹200 after the free first ₹1,000) | ₹10 | ₹1.80 | ₹1,188.20 |

- Issue a GST invoice for every fee. Brand plan prices and brand payout fees are also excluding GST, with GST added on top.
- The fee is **locked when the student applies** and shown on every gig card as take-home pay, with the fee and the GST as separate lines (H1, H2, H3, C5, B2).
- It's taken only from money actually paid. There's no fee on amounts under dispute, and it's refunded if the brand's payment is reversed.

**Payouts:**
- Standard UPI payout is free and takes 2–3 working days. Instant costs ₹15.
- Payout setup is needed once: PAN, then UPI verified by ₹1 penny drop, then consent.

**Earning states:** Estimated → Pending (approved, 7-day hold) → Approved → Payable → Processing → Paid. Every rupee shows its state.

**Review:**
- After proof is submitted (H6), the reviewer has 3 days to approve or ask for changes (2 revisions). No reply means it's auto-approved.
- When a reviewer rejects work, the student can open a dispute and must add evidence within 48h of opening it. The money stays in escrow until Ops decides, and no fee is charged on disputed money.
- **No work before the scope and pay are explicitly accepted.**
- **Never pay to apply.**
- TDS (194-O) is deducted where it applies, and Form 16A is issued.

**Brand plans** (Collab HQ BR13; prices per month excluding GST; "fee" is what the brand pays on top of payouts):

| Plan | Price | Credits | Campuses | Seats | Brand fee |
|---|---|---|---|---|---|
| Starter | Free | 1 free gig post / month | 1 | 1 | 7% |
| Launch | ₹9,999 | 100 | up to 3 | 2 | 6% |
| Growth | ₹34,999 | 400 | up to 15 | 5 | 5% |
| Scale | ₹99,999 | 1,300 | unlimited | 15 | 4% |
| Managed | from ₹2,50,000 / campaign | included | unlimited | unlimited | negotiated |

- Credits roll over one month (up to the plan's allowance). A top-up is 50 credits for ₹6,000 and lasts 6 months. Annual billing: pay 10 months, get 12.
- **Credits buy reach, never access to a student.** Free on every plan: reading applications, messaging selected students, approving work and raising disputes.
- Credit prices:
  - Gig post: 5 credits (10 slots, 30 days, 1 campus).
  - Extra campus: 2 credits each.
  - Bulk gig (up to 50 slots): 15 credits.
  - College request: 20 credits.
  - AI shortlist: 3 credits.
  - Sponsored poll: 12 credits per campus.
- Low-response refund is automatic: a gig with fewer than 3 applicants in 7 days gets its credits back. The same applies to moderation removals that weren't the brand's fault.
- Credits never fund payouts or prizes; those are funded separately into escrow.

**Swap:**
- Bunk3d doesn't handle Swap payments: students meet on campus and pay in person.
- Listings show the seller's real name and are visible only to their own campus.
- Banned: weapons, medicines, notes-for-cash on exams.

---

## 10. Things not to do
- Don't add a light theme.
- Don't use emoji in UI.
- Don't show white text on lime.
- Don't show invented numbers or promise earnings.
- Don't describe Spark as dating.
- Don't rank people.
- Don't let colleges or admins see who posted anonymously.
- Don't expose exact location.
- Don't put fee maths on the client.
- Don't keep ID photos past 30 days.
- Don't hold Swap money.
- Don't let credits buy access to students.
- Don't port the prototype's overlay-back trick or its Preview/Simulate buttons.
