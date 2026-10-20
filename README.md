# SlideRepairFL: Florida sliding door repair directory

The directory designed in the "Florida Sliding Door Directory" canvas, built as a real website.

## How it works

- `src/pages/Directory.dc.html`: the whole directory (template + logic), exported from the canvas and redesigned. It walks homeowners through ① what's wrong (8 problems) → ② fair Florida price → ③ checked pros who fix it.
- **Pages (SEO):** the component's `static routes()` lists every public URL with its starting screen, title, description and JSON-LD. The build renders each one to its own static HTML file, and in the browser the app switches screens without reloading while keeping the address bar in sync.
  - `/`: home
  - `/problems/<slug>`: 8 problem guides with FAQ markup (e.g. `/problems/sliding-door-leaking`)
  - `/cost`: Florida repair price guide, price calculator and "Is my quote fair?" checker, with FAQ markup
  - `/pros` and `/sliding-glass-door-repair/<city>`: 12 city pages
  - `/pros/<company>`: company pages
  - `/repair-or-replace`: the repair-or-replace helper
  - `/compare` (noindex) and `/list-your-business`
- `src/runtime/`: renders canvas templates with React (`{{holes}}`, `sc-for`, `sc-if`, `style-hover`).
- `scripts/build.mjs`: server-renders every route, bundles the JavaScript, and writes `robots.txt` (plus `sitemap.xml` once `src/site.js` has a domain).
- `public/css/site.css`: the design (deep blue on white, Public Sans, phone-first, 18px base text).
- `public/map-view.html`: the Leaflet map for the map view. Leaflet is in `public/vendor/`.

## Adding companies (data/companies.csv)

The directory is built from `data/companies.csv`: one row per company. Edit it in Excel or Google Sheets (File → Download → CSV) and keep the header row as is.

| Column | What to put |
|---|---|
| `name`, `phone`, `city`, `county`, `zip` | Basics. `name` and `phone` are required. |
| `service_area` | Cities they serve, separated by `;` (e.g. `Tampa; Brandon; Riverview`) |
| `rollers`, `tracks`, `glass`, `locks`, `screens`, `impact`, `leaks` | Their price range for that repair, like `150-250`. Leave blank if they don't do it. |
| `specialties` | Repairs they specialize in, using the column names above, `;`-separated (e.g. `impact; glass`) |
| `emergency_24_7` | `yes` if they take 24/7 storm calls |
| `hours`, `response_hours` | Opening hours (text) and how fast they usually answer, in hours (e.g. `1`, `4`, `24`) |
| `warranty`, `callout_fee`, `years_in_business` | Text, text, number |
| `verified`, `license_number` | `yes` once they pass the full checks; license number if they have one |
| `featured`, `premium` | `yes` for paid placement (shown as "Ad") and for a premium profile (photos and videos) |
| `rating`, `review_count` | From SlideRepairFL's own reviews |
| `about`, `logo_url`, `photo_urls`, `video_urls` | Description; image/video links (`;`-separated). Photos and videos show on premium profiles. |
| `lat`, `lng` | Optional. Without them, the city's location is used for distance. |
| `sample` | `yes` marks the demo companies. Delete those rows when real companies are added. |

City pages are created automatically for every city a company is based in.

`data/videos.csv` lists how-to videos for the problem pages: `problem` (e.g. `leaking` or `hard-to-slide`), `title`, `url`.

## Commands

```sh
npm install
npm run build     # writes dist/
npm run preview   # serves dist/ locally
```

## Deploying

`vercel.json` is set up for Vercel: import the repo and it runs `npm run build` and serves `dist/`. Set `url` in `src/site.js` to the live domain (e.g. the `….vercel.app` address) so canonical links and `sitemap.xml` are written, then submit the sitemap in Google Search Console.

## Status

The 14 companies in `data/companies.csv` (marked `sample`), their reviews and price reports are demo data. Replace them with real companies before launch. The forms (list your business, price report, review, report a problem) only show a confirmation and don't send anything yet.
