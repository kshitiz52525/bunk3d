# Graphic devices

Bunk3d’s look is built from four things, all taken from the app.

## 1. Stickers

These are rounded pills or tags with `sticker` type, tilted between `tilt-left` (−4°) and `tilt-max` (6°). They read like stickers slapped on a laptop.
- **Fills:** `lime` with `on-lime` text (default), `ink` on a lime slab, a 1.5px `violet` outline on dark, or `hot` (once).
- **One hero sticker per asset** gets `shadow-sticker`, a hard 4px violet offset (8px at poster scale). It is never blurred.
- Two stickers side by side lean opposite ways (−4° and +3°).
- Never put a sticker over a face, over the wordmark, or over legal text.

## 2. The oversized 3

The 3 from the wordmark, cropped huge off an edge in `lime`, or in `ink` on a lime slab. It works as a background shape on posters, slides and story covers. Use one per asset, always cropped and never whole, and never with a drop shadow.

## 3. Hard offsets, not soft shadows

Depth comes from flat offset blocks (`shadow-sticker`), never from blur. Cards in marketing layouts are flat `surface` with a 1px `line` border, or a solid lime slab.

## 4. Rounded geometry

Corners come from the radius scale: `radius-lg` (20) for cards and stickers, `radius-xl` (28) for photo frames, `radius-pill` for tags. Dashed 1.5px outlines mean “add yours” or “empty”, as in the app.

## Icons

Use 2px stroke line icons on a 24px grid with round caps and joins, the same as the app. Icons are `ink` or `on-lime`, never multicolour. Don’t use emoji as icons, and don’t use 3D icons.

## Motion (reels, stories, web)

Keep it snappy and springy, never floaty. Use the easing `cubic-bezier(.2,.8,.2,1)` and durations of 180, 280 or 420ms. Stickers pop in by scaling .6 → 1.08 → 1, one after another, 120ms apart. Photos get a slow 8% push-in over 5 seconds. Reels cut on the beat; they don’t cross-fade. For in-app motion, the design canvas has a motion spec board.

## Never

Gradients (except a dark scrim over photos), glows, glassmorphism, 3D type, confetti bursts, cartoon mascots, or AI-generated people.
