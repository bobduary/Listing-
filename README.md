# SlideRepairFL: Florida sliding door repair directory

The directory designed in the "Florida Sliding Door Directory" canvas, built as a real website.

## How it works

- `src/pages/Directory.dc.html`: the whole directory (template + logic), exported from the canvas and redesigned. It walks homeowners through ① what's wrong (8 problems) → ② fair Florida price → ③ checked pros who fix it.
- **Pages (SEO):** the component's `static routes()` lists every public URL with its starting screen, title, description and JSON-LD. The build renders each one to its own static HTML file, and in the browser the app switches screens without reloading while keeping the address bar in sync.
  - `/`: home
  - `/problems/<slug>`: 8 problem guides with FAQ markup (e.g. `/problems/sliding-door-leaking`)
  - `/cost`: Florida repair price guide with FAQ markup
  - `/pros` and `/sliding-glass-door-repair/<city>`: 12 city pages
  - `/pros/<company>`: company pages
  - `/compare` (noindex) and `/list-your-business`
- `src/runtime/`: renders canvas templates with React (`{{holes}}`, `sc-for`, `sc-if`, `style-hover`).
- `scripts/build.mjs`: server-renders every route, bundles the JavaScript, and writes `robots.txt` (plus `sitemap.xml` once `src/site.js` has a domain).
- `public/css/site.css`: the design (deep blue on white, Public Sans, phone-first, 18px base text).
- `public/map-view.html`: the Leaflet map for the map view. Leaflet is in `public/vendor/`.

## Commands

```sh
npm install
npm run build     # writes dist/
npm run preview   # serves dist/ locally
```

## Deploying

`vercel.json` is set up for Vercel: import the repo and it runs `npm run build` and serves `dist/`. Set `url` in `src/site.js` to the live domain (e.g. the `….vercel.app` address) so canonical links and `sitemap.xml` are written, then submit the sitemap in Google Search Console.

## Status

The 14 companies, reviews and price reports in the page script are sample data. Replace them with real, checked companies before launch. The forms (quote request, price report, list your business) only show a confirmation and don't send anything yet.
