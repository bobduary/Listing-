// POST /api/report: a homeowner's "Report a job" form (what was fixed, who
// did it, what they paid). Checks and trims the fields, then forwards the
// report as JSON to REPORT_WEBHOOK_URL (set in Vercel → Settings →
// Environment Variables), e.g. a Make or Zapier webhook that adds a row to a
// sheet or emails you. Every report is also written to the function log.
const text = (v, max) => String(v == null ? '' : v).replace(/\s+/g, ' ').trim().slice(0, max);
const amount = (v) => { const n = Number(v); return Number.isFinite(n) && n > 0 && n < 100000 ? Math.round(n) : null; };

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ ok: false }); }
  let b = req.body;
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch { b = null; } }
  if (!b || typeof b !== 'object') return res.status(400).json({ ok: false, error: 'bad request' });
  // Honeypot: real visitors never see or fill this field.
  if (b.website) return res.status(200).json({ ok: true });

  const report = {
    received: new Date().toISOString(),
    repairs: (Array.isArray(b.repairs) ? b.repairs : []).map((r) => text(r, 60)).filter(Boolean).slice(0, 10).join('; '),
    pro: text(b.pro, 120),
    listedPro: !!b.listedPro,
    where: text(b.where, 80),
    paid: amount(b.paid),
    quoted: amount(b.quoted),
    when: text(b.when, 40),
    rating: [1, 2, 3, 4, 5].includes(b.rating) ? b.rating : null,
    notes: String(b.notes == null ? '' : b.notes).trim().slice(0, 2000),
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text(b.email, 160)) ? text(b.email, 160) : '',
    page: text(b.page, 200),
  };
  if (!report.repairs || !report.paid) return res.status(400).json({ ok: false, error: 'missing repair or price' });

  console.log('job report', JSON.stringify(report));
  const hook = process.env.REPORT_WEBHOOK_URL;
  if (hook) {
    try {
      const r = await fetch(hook, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(report) });
      if (!r.ok) throw new Error('webhook ' + r.status);
    } catch (e) {
      console.error('job report not forwarded', e.message);
      return res.status(502).json({ ok: false });
    }
  }
  return res.status(200).json({ ok: true });
}
