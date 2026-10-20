// Static site build.
//
// Each src/pages/<Name>.dc.html (exported from the design canvas) is
// compiled to a template tree + logic module, rendered to static HTML with
// React (so every page is fully crawlable), and bundled for the browser so
// interactive parts hydrate. Output goes to dist/.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseDocument, DomUtils } from 'htmlparser2';
import React from 'react';
import { renderToString } from 'react-dom/server';
import * as esbuild from 'esbuild';
import { ROUTES, COMPONENTS } from '../src/routes.js';
import { makeComponent, pseudoRules } from '../src/runtime/dc.js';
import { SITE } from '../src/site.js';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const PAGES_DIR = path.join(ROOT, 'src/pages');
const GEN = path.join(ROOT, '.build');
const DIST = path.join(ROOT, 'dist');

const DROP_WS_IN = new Set(['table', 'thead', 'tbody', 'tfoot', 'tr', 'colgroup', 'select', 'optgroup']);

function toTree(nodes, parentTag) {
  const out = [];
  for (const n of nodes) {
    if (n.type === 'text') {
      let t = n.data;
      if (!t.trim()) {
        if (DROP_WS_IN.has(parentTag)) continue;
        t = ' ';
      }
      out.push(t);
    } else if (n.type === 'tag' || n.type === 'script' || n.type === 'style') {
      if (n.name === 'style' || n.name === 'script') {
        out.push([n.name, { ...n.attribs }, [n.children.map((c) => c.data || '').join('')]]);
      } else {
        out.push([n.name, { ...n.attribs }, toTree(n.children, n.name)]);
      }
    }
  }
  return out;
}

function compile(name) {
  const file = path.join(PAGES_DIR, name + '.dc.html');
  const doc = parseDocument(fs.readFileSync(file, 'utf8'), {
    lowerCaseTags: false, lowerCaseAttributeNames: false, recognizeSelfClosing: true,
  });
  const titleEl = DomUtils.findOne((e) => e.name === 'title', doc.children);
  const title = titleEl ? DomUtils.textContent(titleEl).trim() : name;
  const xdc = DomUtils.findOne((e) => e.name === 'x-dc', doc.children);
  if (!xdc) throw new Error(name + ': no <x-dc> root');
  const helmetEl = xdc.children.find((c) => c.name === 'helmet');
  const helmet = helmetEl
    ? helmetEl.children.filter((c) => c.type !== 'text' && c.type !== 'comment')
      .map((c) => DomUtils.getOuterHTML(c, { encodeEntities: 'utf8' }))
    : [];
  const body = xdc.children.filter((c) => c !== helmetEl);
  const script = DomUtils.findOne((e) => e.name === 'script' && 'data-dc-script' in e.attribs, doc.children);
  const logic = script ? DomUtils.textContent(script) : '';
  const tpl = toTree(body, 'x-dc');
  const imports = [...new Set(DomUtils.findAll((e) => e.name === 'dc-import', body).map((e) => e.attribs.name))];
  return { name, title, helmet, logic, tpl, imports };
}

function writeModule(c) {
  const src = `export const tpl = ${JSON.stringify(c.tpl)};\n` +
    `export function logic(DCLogic, React) {\n${c.logic}\n;return typeof Component !== 'undefined' ? Component : null;\n}\n`;
  fs.writeFileSync(path.join(GEN, 'components', c.name + '.js'), src);
}

function writeEntry(c) {
  const imp = c.imports.map((n) => `import * as ${n} from '../components/${n}.js';`).join('\n');
  const src = `import { mount } from '../../src/runtime/client.js';\n` +
    `import * as Page from '../components/${c.name}.js';\n${imp}\n` +
    `mount(Page, { ${c.imports.join(', ')} });\n`;
  const p = path.join(GEN, 'entries', c.name + '.js');
  fs.writeFileSync(p, src);
  return p;
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
const decode = (s) => s.replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'");

// First paragraph after the page's <h1>, as a meta description fallback.
function describe(html) {
  const afterH1 = html.slice(Math.max(0, html.indexOf('<h1')));
  const m = afterH1.match(/<p\b[^>]*>([\s\S]*?)<\/p>/);
  if (!m) return '';
  let t = decode(m[1].replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();
  if (t.length > 160) t = t.slice(0, 157).replace(/\s+\S*$/, '') + '…';
  return t;
}

function outPath(route) {
  return route === '/' ? path.join(DIST, 'index.html') : path.join(DIST, route.slice(1), 'index.html');
}

function page({ c, html, helmet, route, description }) {
  const url = SITE.url ? SITE.url + (route === '/' ? '/' : route) : '';
  const meta = [
    `<title>${esc(c.title)}</title>`,
    description && `<meta name="description" content="${esc(description)}">`,
    url && `<link rel="canonical" href="${url}">`,
    `<meta property="og:type" content="website">`,
    `<meta property="og:site_name" content="${esc(SITE.name)}">`,
    `<meta property="og:title" content="${esc(c.title)}">`,
    description && `<meta property="og:description" content="${esc(description)}">`,
    url && `<meta property="og:url" content="${url}">`,
    SITE.url && SITE.ogImage && `<meta property="og:image" content="${SITE.url}${SITE.ogImage}">`,
    SITE.favicon && `<link rel="icon" href="${SITE.favicon}">`,
  ].filter(Boolean);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
${meta.join('\n')}
${helmet.join('\n')}
</head>
<body>
<div id="dc-root">${html}</div>
<script type="module" src="/js/${c.name}.js"></script>
</body>
</html>
`;
}

async function main() {
  fs.rmSync(DIST, { recursive: true, force: true });
  fs.rmSync(GEN, { recursive: true, force: true });
  fs.mkdirSync(path.join(GEN, 'components'), { recursive: true });
  fs.mkdirSync(path.join(GEN, 'entries'), { recursive: true });

  const files = fs.readdirSync(PAGES_DIR).filter((f) => f.endsWith('.dc.html')).map((f) => f.slice(0, -8));
  for (const f of files) {
    if (!ROUTES[f] && !COMPONENTS.includes(f)) throw new Error(`${f}.dc.html has no route in src/routes.js`);
  }
  const compiled = {};
  for (const f of files) { compiled[f] = compile(f); writeModule(compiled[f]); }

  // Server render every page.
  const mods = {};
  for (const f of files) mods[f] = await import(pathToFileURL(path.join(GEN, 'components', f + '.js')).href);
  const entries = [];
  const pages = Object.keys(ROUTES);
  for (const name of pages) {
    const c = compiled[name];
    if (!c) throw new Error(`route ${name} has no src/pages/${name}.dc.html`);
    const ctx = { components: {} };
    for (const n of c.imports) ctx.components[n] = makeComponent(mods[n], ctx);
    const Page = makeComponent(mods[name], ctx);
    const html = renderToString(React.createElement(Page));
    const helmet = [...new Set([...c.helmet, ...c.imports.flatMap((n) => compiled[n].helmet)])];
    if (pseudoRules.size) helmet.push(`<style id="dc-pseudo">\n${[...pseudoRules.values()].join('\n')}\n</style>`);
    const route = ROUTES[name];
    const out = outPath(route);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, page({ c, html, helmet, route, description: describe(html) }));
    entries.push(writeEntry(c));
  }

  await esbuild.build({
    entryPoints: entries,
    outdir: path.join(DIST, 'js'),
    bundle: true, splitting: true, format: 'esm', minify: true,
    target: ['es2019'], chunkNames: 'chunks/[name]-[hash]',
    define: { 'process.env.NODE_ENV': '"production"' },
    logLevel: 'warning',
  });

  fs.cpSync(path.join(ROOT, 'public'), DIST, { recursive: true });

  if (SITE.url) {
    const today = new Date().toISOString().slice(0, 10);
    const urls = pages.map((n) =>
      `  <url><loc>${SITE.url}${ROUTES[n] === '/' ? '/' : ROUTES[n]}</loc><lastmod>${today}</lastmod></url>`);
    fs.writeFileSync(path.join(DIST, 'sitemap.xml'),
      `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`);
  }
  fs.writeFileSync(path.join(DIST, 'robots.txt'),
    `User-agent: *\nAllow: /\n${SITE.url ? `Sitemap: ${SITE.url}/sitemap.xml\n` : ''}`);

  console.log(`Built ${pages.length} pages into dist/`);
}

main().catch((e) => { console.error(e); process.exit(1); });
