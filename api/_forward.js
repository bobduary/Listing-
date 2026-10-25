// Shared by the form endpoints: passes a submission on to the Make webhook in
// SUBMIT_WEBHOOK_URL (falls back to REPORT_WEBHOOK_URL), which adds a row to
// the matching tab of the "FixMySlide submissions" Google Sheet.
export async function forward(row) {
  const hook = process.env.SUBMIT_WEBHOOK_URL || process.env.REPORT_WEBHOOK_URL;
  if (!hook) { console.warn('submission not forwarded: no SUBMIT_WEBHOOK_URL'); return false; }
  const r = await fetch(hook, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(row) });
  if (!r.ok) throw new Error('webhook ' + r.status);
  return true;
}

// One line of plain text, trimmed and capped.
export const text = (v, max) => String(v == null ? '' : v).replace(/\s+/g, ' ').trim().slice(0, max);
// Multi-line text, capped.
export const long = (v, max) => String(v == null ? '' : v).trim().slice(0, max);

export function readBody(req) {
  let b = req.body;
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch { b = null; } }
  return b && typeof b === 'object' ? b : null;
}
