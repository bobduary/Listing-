// POST /api/submit: "List your business", "Report a problem" and "Write a
// review" forms. Checks and trims the fields for each form type, logs the
// submission and forwards it to the Google Sheet (see _forward.js).
import { forward, text, long, readBody } from './_forward.js';

const email = (v) => (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text(v, 160)) ? text(v, 160) : '');

const FORMS = {
  listing: (b) => ({
    company: text(b.company, 120), phone: text(b.phone, 30), email: email(b.email), city: text(b.city, 60),
    areas: text(b.areas, 300), repairs: long(b.repairs, 2000), installs: text(b.installs, 40),
    license: text(b.license, 40), link: text(b.link, 300), plan: text(b.plan, 60),
    ok: (r) => r.company && r.phone,
  }),
  problem: (b) => ({
    company: text(b.company, 120), what: [text(b.kind, 80), long(b.details, 2000)].filter(Boolean).join(': '),
    name: text(b.name, 80), contact: text(b.contact, 160), page: text(b.page, 200),
    ok: (r) => r.company && r.what && r.contact,
  }),
  review: (b) => ({
    company: text(b.company, 120), rating: [1, 2, 3, 4, 5].includes(Number(b.rating)) ? Number(b.rating) : '',
    text: long(b.text, 2000), name: text(b.name, 80), email: email(b.email),
    ok: (r) => r.company && r.rating && r.text,
  }),
};

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ ok: false }); }
  const b = readBody(req);
  const make = b && FORMS[b.type];
  if (!make) return res.status(400).json({ ok: false, error: 'bad request' });
  // Honeypot: real visitors never fill this field.
  if (b.website) return res.status(200).json({ ok: true });
  const { ok, ...fields } = make(b);
  if (!ok(fields)) return res.status(400).json({ ok: false, error: 'missing fields' });
  const row = { type: b.type, received: new Date().toISOString(), ...fields };
  console.log('submission', JSON.stringify(row));
  try { await forward(row); } catch (e) {
    console.error('submission not forwarded', e.message);
    return res.status(502).json({ ok: false });
  }
  return res.status(200).json({ ok: true });
}
