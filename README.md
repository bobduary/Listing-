# FixMySlide: Florida sliding door repair directory

The directory designed in the "Florida Sliding Door Directory" canvas, built as a real website.

## How it works

- `src/pages/Directory.dc.html`: the whole directory (template + logic), exported from the canvas and redesigned. It walks homeowners through ① what's wrong (8 problems) → ② fair Florida price → ③ checked pros who fix it.
- **Pages (SEO):** the component's `static routes()` lists every public URL with its starting screen, title, description and JSON-LD. The build renders each one to its own static HTML file, and in the browser the app switches screens without reloading while keeping the address bar in sync.
  - `/`: home
  - `/how-it-works`: how it works for homeowners and pros
  - `/problems/<slug>`: 8 problem guides with FAQ markup (e.g. `/problems/sliding-door-leaking`)
  - `/cost`: Florida repair price guide, price calculator and "Is my quote fair?" checker, with FAQ markup
  - `/pros` and `/sliding-glass-door-repair/<city>`: 12 city pages
  - `/pros/<company>`: company pages
  - `/repair-or-replace`: the repair-or-replace helper
  - `/blog` and `/blog/<slug>`: help articles (from `data/blog.csv`), linked from the matching problem guide
  - `/diy` and `/diy/<fix>`: 6 step-by-step DIY fixes (difficulty, time, tools, steps, parts to buy, and a link to local pros for that problem). The fixes live in `DIY_FIXES` in the page logic.
  - `/shop` and `/shop/<product>`: parts from `data/products.csv` (Gators Sliding Doors' store). "Buy" opens that product on gatorsslidingdoors.com for checkout; every page says the seller has the same owner as FixMySlide.
  - `/compare` (noindex) and `/list-your-business`
- `/how-we-rank` and `/verification`: how Best match works and what each badge means (only what's actually checked).
- `src/runtime/`: renders canvas templates with React (`{{holes}}`, `sc-for`, `sc-if`, `style-hover`).
- `scripts/build.mjs`: server-renders every route, bundles the JavaScript, and writes `robots.txt` (plus `sitemap.xml` once `src/site.js` has a domain).
- `public/css/site.css`: the "Coastal Professional" design system (Trust Blue + Emerald, Plus Jakarta Sans + Inter, tonal layers instead of borders, Material Symbols icons).
- `public/map-view.html`: the Leaflet map for the map view. Leaflet is in `public/vendor/`.

## Adding companies (data/companies.csv)

The directory is built from `data/companies.csv`: one row per company. Edit it in Excel or Google Sheets (File → Download → CSV) and keep the header row as is.

| Column | What to put |
|---|---|
| `name`, `phone`, `city`, `county`, `zip` | Basics. `name` and `phone` are required. |
| `service_area` | Cities they serve, separated by `;` (e.g. `Tampa; Brandon; Riverview`) |
| `rollers`, `tracks`, `glass`, `locks`, `screens`, `impact`, `leaks` | Their price range for that repair, like `150-250`; `yes` if they do it but haven't posted a price; blank if they don't do it. |
| `specialties` | Repairs they specialize in, using the column names above, `;`-separated (e.g. `impact; glass`) |
| `emergency_24_7`, `same_day` | `yes` if they take 24/7 storm calls / same-day jobs ("Today" on the results puts these first) |
| `free_estimate`, `callout_waived`, `written_warranty` | `yes` / blank. Shown as company-reported facts and quick chips on cards. |
| `languages` | Languages spoken, `;`-separated (e.g. `English; Spanish`). The "Habla español" filter appears once any company lists Spanish. |
| `shares_owner` | `yes` for a company with the same owner as FixMySlide (Gators Sliding Doors). It gets a "Same owner as FixMySlide" label everywhere and is covered by `/ownership`; it gets no ranking advantage. |
| `hours`, `response_hours` | Opening hours (text) and how fast they usually answer, in hours (e.g. `1`, `4`, `24`) |
| `warranty`, `callout_fee`, `years_in_business` | Text, text, number |
| `verified`, `verified_on` | `yes` once they pass the business checks (Sunbiz registration, phone and Florida address, Google Business Profile and social pages), and the date of that check (`YYYY-MM-DD`, shown as "Last checked"). Shown as **Business verified**; without it the company is **Listed**. |
| `does_installation`, `license_number`, `license_verified` | For companies that do installation themselves (no subcontractor): `does_installation` = `yes`, their Florida license number, and `license_verified` = `yes` once you've looked it up on DBPR. All three give the **Licensed installer** badge. |
| `website`, `google_business_url`, `social_urls` | Links shown under "What we checked" (`social_urls` is `;`-separated) |
| `featured`, `premium` | `featured` = `yes` makes them a Promoted pro: when a homeowner uses their location (home page "Find pros near me", or the repair plan), up to 2 promoted pros that serve that area show first, labeled "Promoted", above the top 3 ranked pros. `premium` = `yes` for a premium profile (photos and videos) |
| `rating`, `review_count` | From FixMySlide's own reviews only. With no reviews the company shows "New on FixMySlide" instead of stars. |
| `about`, `logo_url`, `photo_urls`, `video_urls` | Description; image/video links (`;`-separated). Photos and videos show on premium profiles. |
| `lat`, `lng` | Optional. Without them, the city's location is used for distance. |
| `sample` | `yes` marks demo companies (none now). |

City pages are created automatically for every city a company is based in.

`data/images.csv` holds the site photos (hero, problem cards, How it Works) by key; swap a `url` to change a photo. They currently point to the images from the Stitch design; download them into `public/` and use local paths before launch, since those links may expire.

`data/blog.csv` holds the blog posts: `slug`, `title`, `description`, `date` (YYYY-MM-DD), `problem` (e.g. `leaking`; ties the post to that problem's price and guide) and `body`. In the body, a blank line starts a new paragraph, `## ` starts a heading, lines starting `- ` make a list, `1. ` lines make numbered steps, and `**Words**` at the start of a paragraph or list item makes them bold.

`data/products.csv` holds the shop: `slug`, `name`, `price`, `category` (`Rollers` or `Tracks`), `fixes` (which DIY fix uses it: `replace-rollers` or `cover-track`), `problems`, `description`, `buy_url` (the product page on Gator's store), `image_url` (optional; a drawing is shown without one). Prices were copied from gatorsslidingdoors.com in October 2026; update them here when the store changes.

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

`data/companies.csv` holds 16 real Orlando and Daytona-area companies, researched from their own websites and public listings, all **Listed** (not yet checked). Phone numbers, services and claims (same-day, 24/7, warranty) come from their sites; check each one before marking it `verified`. Fair prices use only `data/price_reports.csv`: with fewer than 5 reports for a repair, the site shows the typical Florida range and labels it an estimate. Replace them with real companies before launch. **Report a job (`/report`):** the "Report a job" button (header, menu, footer, pro pages, blog posts) opens a one-page form: who did the job (type any name; listed companies are suggested as you type), what they did, the price paid and city, at least one proof photo (receipt, texts with the company, business card or the finished door; up to 3, or a PDF), and an optional star rating and email. Photos are shrunk in the browser before upload. The form posts to `api/report.js`, a Vercel function that checks the fields, saves the photos to the private Vercel Blob store `fixmyslide-job-proof` (Vercel → Storage, under `job-reports/<report id>/`), writes the report to the function log, and forwards it as JSON to the webhook in the `REPORT_WEBHOOK_URL` environment variable if one is set (for example a Make or Zapier webhook that adds a row to a Google Sheet or emails you). Approved reports go into `data/price_reports.csv` to feed the fair prices.

**Where submissions go:** every form (report a job, list your business, report a problem, review) goes through `api/report.js` or `api/submit.js` to the Make webhook in `SUBMIT_WEBHOOK_URL`. The Make scenario "FixMySlide → Google Sheet (form submissions)" adds a row to the matching tab of the **FixMySlide submissions** Google Sheet (in the office@gatorslidingdoors.com Drive) with Status `New`. Values are stored as plain text, so form input can't become a spreadsheet formula.

**Home page design:** the home page is the directory-style design (`public/css/fresh.css`): search, then the company list, then browse by city and problem. Set `FRESH_HOME` to `false` in the page logic to bring back the classic home page.
