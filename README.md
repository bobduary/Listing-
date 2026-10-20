# SlideRepairFL: Florida sliding door repair directory

The directory designed in the "Florida Sliding Door Directory" canvas, built as a real website.

## How it works

- `src/pages/Directory.dc.html`: the directory, exported from the canvas (home, search results with list and map, company profiles, compare, "How we vet", "List your business").
- `src/runtime/`: renders canvas templates with React, including `{{holes}}`, `sc-for`, `sc-if` and `style-hover`.
- `scripts/build.mjs`: server-renders each page to static HTML (crawlable, with title and description tags), then bundles the JavaScript that makes it interactive. Output goes to `dist/`.
- `public/map-view.html`: the Leaflet map shown in the map views. It talks to the page with `postMessage`. Leaflet is in `public/vendor/`.
- `public/image-slot.js`: the canvas's photo placeholder element.
- `public/_ds/modernist/styles.css`: a stand-in for the canvas's "Modernist" design system stylesheet, which wasn't included in the export. To get the exact original look, replace this file with the real `styles.css` from the canvas's `_ds/` folder.

## Commands

```sh
npm install
npm run build     # writes dist/
npm run preview   # serves dist/ locally
```

## Deploying

`vercel.json` is set up for Vercel: import the repo and it runs `npm run build` and serves `dist/`. Set `url` in `src/site.js` once there's a domain, so canonical links and `sitemap.xml` are written.

## Status

The 14 companies, reviews and price reports in the page script are sample data from the design. The forms (quote request, price report, list your business) only show a confirmation and don't send anything yet.
