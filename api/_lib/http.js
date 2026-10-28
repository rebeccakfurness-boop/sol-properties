// Vercel parses JSON bodies for us; this also accepts a raw string body.
export function readBody(req) {
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch { return {}; }
  }
  return req.body || {};
}

export const clean = (v, max = 2000) => String(v ?? '').trim().slice(0, max);
export const isEmail = v => /^[^\s@<>()",;]+@[^\s@<>()",;]+\.[^\s@<>()",;]+$/.test(v);

export function fail(res, status, error) {
  res.status(status).json({ error });
}
