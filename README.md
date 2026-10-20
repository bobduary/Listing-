# Gator's Sliding Doors website

The www.gatorsslidingdoors.com redesign, built from the "Gator's Sliding Doors — Website Redesign" design canvas.

## How it works

- `src/pages/*.dc.html`: one file per page, exported from the design canvas. Edit copy and layout here.
- `src/routes.js`: maps each page file to its public URL (for example `Orlando` to `/locations/orlando`). Links between pages stay written as `Orlando.dc.html` in the templates and are rewritten automatically.
- `src/site.js`: domain, favicon and social image used for canonical URLs, Open Graph tags and the sitemap.
- `src/runtime/`: renders the page templates with React.
- `scripts/build.mjs`: renders every page to static HTML (fully crawlable, with title, description, canonical and OG tags), bundles the JavaScript that powers the interactive parts (menus, shop cart, booking form, door finder, door designer), and writes `sitemap.xml` and `robots.txt`.
- `public/assets/`: images from the canvas.

## Commands

```sh
npm install
npm run build     # writes dist/
npm run preview   # serves dist/ locally
```

## Deploying

The repo is set up for Vercel (`vercel.json`): import the repo, and Vercel runs `npm run build` and serves `dist/`.

## Adding a page

1. Add `src/pages/<Name>.dc.html`.
2. Add `<Name>: '/its-url'` to `ROUTES` in `src/routes.js`.
3. Images go in `public/assets/` and are referenced as `/assets/<file>`.
