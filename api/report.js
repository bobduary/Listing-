// POST /api/report: a homeowner's "Report a job" form (who did the job, what
// they did, what it cost, proof photos). Checks and trims the fields, saves
// the photos to the project's private Vercel Blob store (Storage tab in
// Vercel; BLOB_READ_WRITE_TOKEN, passed explicitly so another store linked
// to the project through BLOB_STORE_ID is never used instead), then forwards the report as JSON to
// REPORT_WEBHOOK_URL if set (e.g. a Make or Zapier webhook that adds a row
// to a sheet or emails you). Every report is also written to the function log.
import { put } from '@vercel/blob';

const text = (v, max) => String(v == null ? '' : v).replace(/\s+/g, ' ').trim().slice(0, max);
const amount = (v) => { const n = Number(v); return Number.isFinite(n) && n > 0 && n < 100000 ? Math.round(n) : null; };
const TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/heic': 'heic', 'application/pdf': 'pdf' };
const MAX_FILE = 3 * 1024 * 1024;

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ ok: false }); }
  let b = req.body;
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch { b = null; } }
  if (!b || typeof b !== 'object') return res.status(400).json({ ok: false, error: 'bad request' });
  // Honeypot: real visitors never see or fill this field.
  if (b.website) return res.status(200).json({ ok: true });

  const id = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + '-' + Math.random().toString(36).slice(2, 8);
  const report = {
    id,
    received: new Date().toISOString(),
    pro: text(b.pro, 120),
    listedPro: !!b.listedPro,
    did: String(b.did == null ? '' : b.did).trim().slice(0, 2000),
    repairs: (Array.isArray(b.repairs) ? b.repairs : []).map((r) => text(r, 60)).filter(Boolean).slice(0, 10).join('; '),
    where: text(b.where, 80),
    paid: amount(b.paid),
    rating: [1, 2, 3, 4, 5].includes(b.rating) ? b.rating : null,
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text(b.email, 160)) ? text(b.email, 160) : '',
    page: text(b.page, 200),
    photos: [],
  };
  if (!report.pro || !report.paid || (!report.did && !report.repairs)) return res.status(400).json({ ok: false, error: 'missing fields' });

  const files = (Array.isArray(b.photos) ? b.photos : []).slice(0, 3).map((f) => {
    const m = /^data:([a-z]+\/[a-z0-9.+-]+);base64,(.+)$/i.exec(String((f && f.data) || ''));
    const type = m && m[1].toLowerCase();
    if (!m || !TYPES[type]) return null;
    const buf = Buffer.from(m[2], 'base64');
    return buf.length && buf.length <= MAX_FILE ? { type, buf } : null;
  }).filter(Boolean);
  if (!files.length) return res.status(400).json({ ok: false, error: 'proof photo required' });

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      for (const [i, f] of files.entries()) {
        const blob = await put(`job-reports/${id}/proof-${i + 1}.${TYPES[f.type]}`, f.buf, { access: 'private', contentType: f.type, addRandomSuffix: true, token: process.env.BLOB_READ_WRITE_TOKEN });
        report.photos.push(blob.pathname);
      }
    } catch (e) {
      console.error('job report photos not saved', id, e.message);
      return res.status(502).json({ ok: false });
    }
  } else {
    console.warn('job report photos not saved: no BLOB_READ_WRITE_TOKEN', id, files.length);
  }

  console.log('job report', JSON.stringify(report));
  const hook = process.env.REPORT_WEBHOOK_URL;
  if (hook) {
    try {
      const r = await fetch(hook, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(report) });
      if (!r.ok) throw new Error('webhook ' + r.status);
    } catch (e) {
      console.error('job report not forwarded', id, e.message);
    }
  }
  return res.status(200).json({ ok: true, id });
}
