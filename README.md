# Everything Food

Marketing site for Everything Food, a Nigerian kitchen in Victoria Island, Lagos.
Static HTML, CSS and JavaScript — no build step, no framework, no dependencies.

## Running it

```bash
python3 -m http.server 4173   # or any static server
```

Then open http://localhost:4173.

## Layout

```
index.html              Every section of the page
assets/css/style.css    Design tokens, components, responsive rules, motion
assets/js/main.js       Reveals, hero video, cart, filters, rail, drawer
assets/img/             Dish photography, WebP at 400px and 800px
assets/video/           Hero footage, MP4 + WebM at 1280px and 720px
vercel.json             Cache headers and security headers
```

## Images and video

Source photography arrived as 34 JPEGs and one 1080p MP4 (23 MB in total). Both
were re-encoded before being committed:

- Photos: WebP, quality 78, at two widths. Cards use the 800px file, the hero
  chips use the 400px one.
- Hero video: a 14-second silent loop at 24fps, H.264 and VP9, at 1280px and
  720px. MP4 is listed first because it is the smaller encode; the WebM exists
  for browsers without an H.264 decoder.

The video is `preload="none"` and only starts downloading once the hero scrolls
into view. It is skipped entirely when the visitor prefers reduced motion or the
Network Information API reports `saveData` or a 2G connection — the poster frame
covers both cases.

## Motion

Curves and durations are tokens in `:root`. The rules the code follows:

- `ease-out` for anything entering or leaving, `ease-in-out` for on-screen
  movement, `ease` for hover and colour. Never `ease-in`.
- UI transitions stay under 300ms. Scroll reveals, which are not UI, run at 520ms.
- Transforms and opacity only. No `transition: all`, no animated layout properties.
- Transitions rather than keyframes for anything re-triggerable, so a second
  trigger retargets from the current position instead of restarting. The cart
  toast and the count badge both depend on this.
- Hover motion sits behind `(hover: hover) and (pointer: fine)` so a tap on a
  phone does not fire it.
- Nothing scales from 0. Press feedback is `scale(0.97)`.

`prefers-reduced-motion: reduce` keeps the fades that explain a state change and
drops the movement: no video, no marquee, no float, no reveal translation.

## Accessibility

Skip link, landmark elements, visible focus rings, `aria-pressed` on the filter
and favourite toggles, live regions for the filter count and the cart toast, and
an Escape-to-close drawer that returns focus to its trigger. Every decorative
image is `alt=""`; every content image describes the dish.

## Deploying

The repository is a static site with no build command. `vercel.json` sets
immutable caching on `assets/img` and `assets/video`, short revalidation on CSS
and JS, and the usual content-type and framing headers.
