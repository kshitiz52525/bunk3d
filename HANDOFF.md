# Bunk3d — build handoff for Claude Code

Bunk3d (say it "bunked", always spell it **Bunk3d**) is a campus app for verified college students in India. Tagline: **College happens outside class.** It has two sides on one account:

- **The Vibe**: social and study life. Tea feed, Study, What's Poppin' events, The Crew clubs, Discover (Spark + Radar), DMs.
- **The Hustle**: earning. Gigs, My Work, Swap, My Bag (wallet and payouts). You get there by swiping up on your own profile photo in the header.

Managers use **web consoles**: Crew HQ (club leads), College HQ, Collab HQ (brands), Vendor, Finance, Ops.

This handoff gives you everything you need to build it end to end. The design is final at screen level. Business rules below are decisions, not suggestions. Anything still undecided is listed in [Open decisions](#11-open-decisions--ask-the-owner-before-building). Ask the owner about those; don't guess.

---

## 0. What's in this package

| Path | What it is |
|---|---|
| `HANDOFF.md` | This file. Copy the rules sections into the repo's `CLAUDE.md`. |
| `design/screens/*.dc.html` | The source of every screen (88 artboards) and `canvas.json` (layout, page grouping, titles). |
| `design/screenshots/mobile/*.png` | A 390×844 render of each phone screen. Photos show as broken images because the sample photos aren't included; use placeholders. |
| `design/screenshots/web/*.png` | Full-page renders of the web consoles, the brand board (`Main`), the motion spec (`M3-Motion`) and edge-case states (`S1-States`). |
| `brand/tokens.json` | Design tokens, dark and light. Light is for print only (see §3). |
| `brand/guidelines/*.md` | Logo, colour, type, voice, graphic devices, photography, partners, formats. |
| `brand/Logos/` | Wordmark and app-icon files. |

Live design canvas (owner's link, for reference): https://claude.ai/artifact/XDc2vsMqFv9AbgZa2HCp4h
Brand guide: https://claude.ai/artifact/Etg8XJutBfExZUMxt9CZe7

### How to read a `.dc.html` screen
Each file is one screen: HTML with inline styles, plus a small `class Component extends DCLogic` script at the bottom.

- `renderVals()` holds the screen's states and sample data.
- `<sc-if value="{{x}}">` marks a conditional state.
- `<sc-for list="{{xs}}">` marks a repeated list.
- `<a href="X.dc.html">` is a navigation edge.

Treat these as the **spec for layout, copy, states and flows**, not as code to port. Copy text exactly; the voice is deliberate.

**Prototype-only behaviour you must not reproduce:**

- **Overlays faking back navigation.** Screens with several entry points are mounted with `<dc-import … back="{{ovClose}}">` inside `bk-ov` overlays, so Back returns to the caller. This only exists because the prototype tool has no back history. Use real stack navigation instead; it gives "Back goes to where I came from" for free.
- **Preview and demo controls.** Buttons labelled `Preview: …`, `Simulate …`, or `… (demo)`, the `Verified`/`newAccount`/`returning` props, and all sample numbers. Real data replaces them.
- **Fixed phone sizes.** The `390×844` sizing. Build responsive layouts.

---

## 1. Recommended stack

The owner hasn't fixed a stack. This is the recommendation; confirm it in the first session.

| Layer | Pick | Why |
|---|---|---|
| Mobile | **Expo (React Native) + TypeScript + Expo Router** | Android-heavy Indian student base, one codebase, OTA updates. |
| Web consoles | **Next.js (App Router) + TypeScript** | Six consoles share auth and data with the app. |
| Backend | **Supabase**: Postgres + Row Level Security, Auth, Storage, Realtime, Edge Functions | Matches the waitlist handoff (`claude/bunk3d-waitlist-handoff.md` in the project). Realtime covers chat. |
| Payments in | **Razorpay** (checkout, UPI) | The checkout screen already names Razorpay. Bunk3d never holds money directly. |
| Payouts | **RazorpayX Payouts** (UPI/IMPS) with ₹1 penny-drop verification | B3 sends ₹1 to confirm the UPI ID. |
| OTP | Supabase phone auth via an Indian SMS provider (MSG91 or similar) | Mobile OTP and Google sign-in are both on A2. |
| Maps | Google Maps SDK or Mapbox | For Radar (R1). |
| Push | Expo Notifications | |
| Repo | Monorepo (pnpm + Turborepo): `apps/mobile`, `apps/web`, `packages/ui` (tokens + primitives), `packages/db` (types, generated from Supabase) | |

---

## 2. Navigation map

**Vibe tab bar (5):** Tea · Study · Poppin' · Crew · Discover.

**Header, on every Vibe tab:**
- Your photo: tap opens your profile (P1); swipe up switches to The Hustle. The first time, show MS1.
- DMs (D1), Search (X2), Notices (X1).

**Hustle tab bar (4):** Gigs · My Work · Swap · My Bag. In The Hustle your photo turns violet; in The Vibe it's lime.

**Hustle availability:** The Hustle is **hidden until the campus reaches wave 3**. Before that there's no swipe and no Hustle at all.

**Back behaviour:** Back and Close always return to the previous screen in the stack, never to a hard-coded screen. The owner was explicit about this.

### Screen inventory

The waves come from the design (see §8). "→ web" means the design moved that screen to a web console.

| Group | Screens |
|---|---|
| Onboarding (w1) | A1 Welcome · A2 Sign in + OTP (also the returning-user "Welcome back" mode) · A3 College (+ waitlist) · A4 Verify by college email or student ID · A5 Verification pending · A6 Profile basics (18+ gate) · A7 Interests and goals · A8 Join clubs · A9 Guidelines ("The vibe check") |
| Tea (w1) | T1 Feed (text, photo, carousel, poll, stories row, official urgent notice) · T2 Post detail · T3 Create (text/poll, Post in campus or community, anonymous) · T11 Photo post and story (camera with filters or upload → compose) · T9 Photo viewer · T10 Stories |
| Tea (w2) | T4 Communities · T5 Community feed (cross-college) |
| Study | N1 Notes home · N2 Subject (Notes / PYQs) · N3 Viewer · N4 Upload (w1) · K1 Timetable · K2 Attendance · K3 Deadlines (w2) |
| Poppin' | E1 Events (This week / Upcoming / Past) · E2 Event detail · E3 Ticket (offline QR) · E6 Team registration · E8 Results and certificate (w1) · E7 Paid checkout (w3, decided: in) · E4 Create event → web CH4 · E5 Scanner → CH5, a phone-browser page |
| Crew | C1 Clubs · C2 Club page · C4 My tasks · C5 Task detail · C8 Club chat (w1) · C6 Side Quests · C7 Clout Board (w2) · C3 Club admin → web CH2 |
| DMs | D1 Chats (filters: All / Unread / People / Squads / Clubs; club channels listed as "GDG Atria #general") · D2 Chat · D3 Squad chat |
| Discover | SP1 Spark deck · SP2 Prefs · SP3 Shoot Your Shot · SP4 Invites · R1 Radar map · R2 Spot · R3 Create meetup · R4 Meetup · R5 Location sharing |
| You | P1 My profile (My posts / My notes / Saved / **Tickets**) · P2 Other profile · P3 Settings · X1 Notices · X2 Search · X3 Report sheet |
| Hustle (w3) | MS1 Mode switch · H1 Gigs · H2 Gig detail · H3 Apply · H4 My Work · H5 Workspace · H6 Submit proof (with review handoff) · H7 Dispute · B1 My Bag · B2 Earning detail · B3 Payout setup/KYC · B4 Withdraw · B5 History and tax · B6 Fees + calculator · Q1–Q3 Swap · P4 Portfolio |
| Safety | M1 Mod queue · M2 Mod review (in app, for Campus Mods) · W1 Ops console OP1–OP8 (web) |
| Web | Crew HQ CH1–CH12 · College HQ CO1–CO6 · Collab HQ BR1–BR14 · Vendor VN1–VN2 · Finance FI1–FI8 |
| Reference | `Main` (brand board) · `M3-Motion` (motion spec) · `S1-States` (empty, error, offline and loading states). **Build every state in S1.** |

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

## 5. Data model (starting point)

Build it in Postgres with RLS on every table. Scope rows by `campus_id` unless the table is cross-campus.

- **Identity:**
  - `campuses` (wave, email_domains, status)
  - `users` (dob private, verified_status, karma private, created_at)
  - `verifications` (method, id_image_path with a 30-day delete job)
  - `profiles` (name, username, degree, dept, year, interests, goals)
- **Social:**
  - `posts` (campus_id or community_id, author_id, is_anon, topic, kind = text|photo|carousel|poll, body, safety_status)
  - `post_media` (ratio, alt_text, blur_faces)
  - `polls` / `poll_votes`
  - `votes`, `comments` (is_anon), `saves`
  - `stories` (author_id, never anon, expires_at)
  - `communities` / `community_members`
  - `official_notices` (urgent flag)
- **Safety:**
  - `reports`, `mod_votes`, `strikes` (expires_at = +90d), `blocks`
  - `audit_log` (append-only)
- **Clubs:**
  - `clubs`, `club_members` (role: lead / coordinator / member)
  - `club_channels`, `club_tasks` (paid → links to a gig)
  - `quests`, `club_xp`
- **Chat:** `conversations` (kind = dm|squad|club_channel, request state for strangers), `messages`, `read_receipts` (off ⇒ you can't see theirs either).
- **Events:** `events`, `rsvps`, `teams` / `team_members` (invite code), `tickets` (rotating QR secret), `checkins`, `results`, `certificates`.
- **Discover:**
  - `spark_prefs` (discover_on defaults to false), `spark_invites` (3 a day)
  - `spots`, `meetups` / `meetup_members`
  - `location_shares` (to_user, expires_at, approximate coordinates only)
- **Study:** `subjects`, `notes` (kind = note|pyq, is_anon, rights_confirmed), `timetables`, `attendance_marks`, `deadlines` (confirmations).
- **Hustle:**
  - `brands`, `brand_plans`, `credit_ledger`
  - `gigs` (type, pay, fee_rule, slots, campuses), `applications` (fee_locked_pct, scope_accepted_at)
  - `milestones`, `proofs`, `reviews`, `disputes`
  - `earnings` (state machine as in §4), `payout_methods` (penny_drop_ok), `payouts`
  - `tds_entries`, `listings` (Swap)
- **Money ledger:** double-entry `ledger_entries` (escrow, student_payable, club_balance, fee_revenue, gst_payable, instant_fee, ticket_sales). Finance FI1–FI8 reads from it. **Compute every money figure on the server; never compute fees on the client.**

---

## 6. Server logic (Edge Functions or Postgres functions)

- `price_ticket(event, qty)`: price + 5% platform fee + 18% GST on that fee; Razorpay order; refund rules (48h, host cancel).
- `compute_take_home(gig, student)`: the fee rules in §4, including the first-₹1,000 waiver, the ₹25k tier, club/referral/volunteer rules, the cap, 18% GST on the fee, rounding to paise, and locking at application. Unit-test against the B6 calculator's worked examples.
- `post_safety_check`: classify the post, then publish it or hold it for mods.
- `mod_decide`: two matching votes, escalate when split, issue strikes.
- `rotate_ticket_qr` / `verify_checkin` (works offline on the scanner, syncs later).
- `earnings_tick`: scheduled job for the state changes (7-day hold → Payable, 3-day auto-approve).
- `payout_request` (RazorpayX, idempotent, handles bounced → returned).
- `credits_charge` / `credits_refund_low_response`.
- `campus_wave_gate`: feature flags per campus, waves 1–4, managed from Ops OP4.

---

## 7. Notifications
- A new reply or vote milestone on your post.
- DMs and message requests.
- Event reminders 24h and 1h before.
- Results published.
- Verification approved or rejected.
- Gig selected, changes asked, approved, paid.
- Dispute updates.
- Deadline reminders 1 day and 1 hour before.
- Quiet hours default to 10 PM–8 AM; safety alerts still come through.

---

## 8. Build order (waves)

Each campus moves through waves, gated in Ops. The Ops console shows the wave 3 gate as day-7 retention, weekly actives, plus legal/CA sign-off. Build in this order and ship each wave behind flags.

1. **Wave 1 — Core Vibe.** Monorepo, tokens, UI primitives, auth (OTP + Google), onboarding A1–A9 with verification and the 18+ gate, Tea (T1–T3, T9–T11), Notes (N1–N4), Poppin' (E1–E3, E6, E8 + CH4/CH5 on web), Crew (C1, C2, C4, C5, C8 + Crew HQ CH1–CH7), DMs, Discover (Spark + Radar), profile/settings/notices/search/report, mod queue M1–M2, Ops OP1–OP8, all `S1` states.
2. **Wave 2.** Communities T4–T5, Study K1–K3, Side Quests C6, Clout Board C7, Crew HQ CH8.
3. **Wave 3 — The Hustle and money.** MS1, H1–H7, B1–B6, Swap Q1–Q3, P4, CH9–CH10, Finance FI1–FI8, payouts, TDS, GST invoices, **paid tickets** (E7 + the paid option in CH4).
4. **Wave 4 — Brands and colleges.** Collab HQ BR1–BR14, College HQ CO1–CO5, Vendor VN1–VN2, CH11–CH12, MoUs, sponsored polls.

**Definition of done for each screen:**
- It matches the design's layout and copy.
- Every state in the `.dc.html` (`sc-if` branches) and in S1 exists.
- Back returns to the previous screen.
- It's accessible (labels, 44px targets, contrast).
- Data comes from the API, with RLS tests for who can read and write.

---

## 9. Key flows to test end to end
1. A new student: email verify → profile → interests → clubs → guidelines → feed. The ID path ends on the pending banner.
2. A returning user: "I already have an account" → Welcome back → OTP → feed.
3. Text post → add Photo carries over text, topic and anonymous choice → Feed + Story → it appears in the feed and stories.
4. An anonymous attempt on a new account: locked, with the unlock line, in both T3 and T11.
5. Someone else's photo → Send → DM. There's no "add to story" option.
6. Event RSVP → ticket in Profile › Tickets → check-in on the scanner → results in Poppin' › Past → certificate on profile.
7. Club chat appears in DMs under the Clubs filter.
7b. Paid ticket: Poppin' › Upcoming › Atria Fest → checkout shows ₹199 + ₹10 fee + ₹1.80 GST = ₹210.80 → pay → ticket in Profile › Tickets. A free team registration never reaches checkout.
8. Swipe up → mode switch → payout setup → gig → apply (fee locked) → workspace → submit proof → review handoff → approved → Pending in My Bag → Payable after 7 days → withdraw (standard or instant).
9. Rejection → open dispute → evidence within 48h → escrow → Ops decision.
10. Report a post → mod votes → strike → strike expires after 90 days.

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

---

## 11. Open decisions — ask the owner before building
1. **Fee for clubs paying students.** The revenue doc doesn't say what the club pays when it's the payer.
2. **Swap placement.** It sits in The Hustle, so it's hidden until wave 3. Is that intended, or should it move to The Vibe?
3. **Video and text-only stories.** They were dropped in the redesign; stories are photos only for now. Confirm.
4. **Stack.** Confirm §1.
5. **Legacy naming.** The PRD PDF and an old HTML prototype in the project still say "No Cap". Bunk3d replaces it everywhere.

**Decided (15 Nov 2026):** paid tickets are in, in wave 3. GST at 18% is charged on top of the Bunk3d fee (student, ticket and brand fees), never on the student's pay. Confirm the GST filing details with your CA.

## 12. Other sources in the claude.ai project "Bunk3d"
- `No_Cap_Complete_PRD_The_Vibe_The_Hustle.docx 3.pdf`: the full PRD (old name).
- `No_Cap_End_to_End_User_Flows (1).md`: flowcharts, now renamed to Bunk3d.
- `claude/bunk3d-waitlist-handoff.md`: the separate waitlist site, with the Supabase sign-up schema and brand rules.
- `No_Cap_App (1).html`: an old prototype. Superseded by this design; don't use it as a reference.
