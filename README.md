# Everything Food

Marketing site for Everything Food, a Nigerian kitchen in Wuse 2, Abuja.
Static HTML, CSS and JavaScript — no build step, no framework, no dependencies.

## Running it

```bash
python3 -m http.server 4173   # or any static server
```

Then open http://localhost:4173.

## Layout

```
index.html              Landing page
menu.html               Full price list, served at /menu
about.html              The kitchen's story, served at /about
contact.html            Address, hours, form and delivery areas, at /contact
assets/css/style.css    Design tokens, components, responsive rules, motion
assets/js/main.js       Reveals, hero video, cart, filters, rail, drawer, embers loader
assets/js/menu.js       Menu page: chips, search, tap-a-price ordering, fly-to-cart
assets/js/contact.js    Contact form validation, composes a mailto
assets/js/embers.js     The WebGL spark field (ES module, loaded on demand)
assets/vendor/          three.js, vendored so there is no third-party origin
assets/font/            Plus Jakarta Sans, self-hosted
assets/img/             Dish photography, WebP at 400px and 800px
assets/video/           Hero footage, MP4 + WebM at 1280px and 720px
vercel.json             Cache headers and security headers
```

The four pages share their header, drawer and footer markup. There is no build
step, so that markup is duplicated rather than templated; `menu.html` was
generated from `index.html`'s chrome, and a change to one needs the same change
in all of them. When copying that chrome, note that it ends with the toast and
the back-to-top button — do not add a second copy, or every page gains duplicate
element ids and `getElementById` starts resolving to the wrong one.

The contact form has no backend. Rather than pretend to submit, it validates and
hands the message to the visitor's mail app with every field filled in, so they
keep a copy and replies go to a real address. The page says so above the form.

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

## Caching, and one bug it caused

The stylesheet and scripts are served `no-cache`, so a browser revalidates them
on every load and gets a cheap 304 when nothing changed. They also carry a `?v=`
query in the markup. Bump it when you change `style.css`, `main.js` or `menu.js`.

This is not belt-and-braces for its own sake. The first version of `vercel.json`
cached CSS `max-age=3600`, which let a browser pair an hour-old stylesheet with
freshly fetched HTML. When the hero gained a `<canvas>`, visitors on the stale
CSS had no rule for it — an unstyled canvas is an in-flow block, the hero is a
flex row, so the canvas became a 300px flex item and shoved the hero copy 280px
to the right. Both canvases now carry an inline `position:absolute;inset:0` as a
floor, so no future stylesheet skew can move the layout.

## Fonts

Plus Jakarta Sans is self-hosted from `assets/font/` as a 27 KB variable woff2,
preloaded, `font-display: swap`. It was previously two Google Fonts origins and
48 KB. Self-hosting also means local testing renders with the same metrics
production does, which the Google Fonts version did not when the network was
restricted.

## The ember field

`assets/js/embers.js` draws a rising spark field over the home hero and the menu
masthead: 300 points, one draw call, with the rise, sway and fade done in the
vertex shader so nothing is recomputed on the CPU per frame. The sprite is drawn
to a canvas at runtime, so it costs no request.

three.js is 671 KB on disk and about 145 KB over the wire after Brotli, which is
too much to put on the critical path. So it is not on it. `main.js` loads the
module during idle time, after everything else, and only when all of these hold:

- the visitor has not asked for reduced motion,
- the viewport is at least 720px wide (phones skip it entirely),
- `navigator.deviceMemory` is not below 4 GB,
- the connection is not `saveData` or 2G,
- and a WebGL context can actually be created.

If any check fails, or the import throws, the canvas is removed and the page is
exactly what it would have been. The render loop stops when the canvas scrolls
out of view or the tab goes to the background.

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
- The hero footage parallaxes at 0.14x on scroll, and only while the hero is on
  screen. The spark that flies from a tapped price to the cart is a transform on
  one throwaway element, removed on `transitionend`.

`prefers-reduced-motion: reduce` keeps the fades that explain a state change and
drops the movement: no video, no embers, no marquee, no float, no parallax, no
fly-to-cart, no reveal translation.

## Responsive behaviour

The hero is the part that moves most:

- Two columns (copy beside the service rail) only above 1180px. Below that the
  rail drops under the copy, because 248px of card crowds the headline.
- Landscape under 720px tall gets a shorter hero, a smaller title and service
  cards without their descriptions, so the whole thing fits above the fold.
- Under 620px the play control loses its visible label (it keeps its accessible
  name) so it shares a row with the order button instead of taking its own, and
  the top strip drops the delivery clause rather than wrapping to two lines.
- Under 380px the card price and add button shrink so they stop competing.

## Navigation state

`Menu` and `Contact` are pages, so their nav items carry `aria-current` from the
markup. `Home` and `Services` are anchors on the landing page, so the scroll
observer owns those. The observer therefore skips any link whose href does not
start with `#` — without that guard it wiped the server-rendered state, and the
Menu item never highlighted on the menu page.

The landing page's newsletter block is `#newsletter`. It used to be `#contact`,
which stopped being true once contact became a page of its own.

## Responsive gotchas worth remembering

Two bugs in this layout came from the same place — a box whose size depends on
content that has not arrived yet:

- The story photo is a lit bowl on a dark ground in a 4:5 crop. Stacked on a
  tablet that ran 1100px+ tall and read as a black slab, so the media is capped
  at 420px and centred below 1180px.
- Capping it with `margin-inline: auto` alone made it *worse*: auto margins turn
  a grid item from stretch into fit-content, and fit-content of a lazy image
  that has not decoded is zero. It needs an explicit `width: 100%` alongside the
  `max-width`.

## Accessibility

Skip link, landmark elements, visible focus rings, `aria-pressed` on the filter
and favourite toggles, live regions for the filter count and the cart toast, and
an Escape-to-close drawer that returns focus to its trigger. Every decorative
image is `alt=""`; every content image describes the dish.

## Deploying

The repository is a static site with no build command. `vercel.json` sets
immutable caching on `assets/img` and `assets/video`, short revalidation on CSS
and JS, and the usual content-type and framing headers.
