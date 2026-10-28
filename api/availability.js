import { MEETING_TYPES, TIMEZONE, MAX_DAYS_AHEAD } from './_lib/config.js';
import { generateSlots } from './_lib/slots.js';
import { busyTimes, googleConfigured } from './_lib/google.js';
import { fail } from './_lib/http.js';

const DAY = 24 * 60 * 60 * 1000;

// GET /api/availability?type=online&from=2026-11-01T00:00:00Z&to=2026-12-01T00:00:00Z
export default async function handler(req, res) {
  if (req.method !== 'GET') return fail(res, 405, 'Method not allowed');
  const { type = 'online' } = req.query;
  if (!MEETING_TYPES[type]) return fail(res, 400, 'Unknown meeting type');
  if (!googleConfigured()) return fail(res, 503, 'Online booking is not set up yet.');

  const now = new Date();
  const from = new Date(req.query.from || now);
  const to = new Date(req.query.to || now.getTime() + 31 * DAY);
  if (isNaN(from) || isNaN(to) || to <= from || to - from > (MAX_DAYS_AHEAD + 31) * DAY) {
    return fail(res, 400, 'Invalid date range');
  }

  try {
    const busy = await busyTimes(from, to);
    const slots = generateSlots({ type, from, to, busy, now });
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json({ type, timeZone: TIMEZONE, minutes: MEETING_TYPES[type].minutes, slots });
  } catch (err) {
    console.error(err);
    fail(res, 502, 'Could not load availability. Please try again shortly.');
  }
}
