import {
  TIMEZONE, MEETING_TYPES, SLOT_STEP_MINUTES, BUFFER_MINUTES, MIN_NOTICE_HOURS, MAX_DAYS_AHEAD,
} from './config.js';

const MIN = 60 * 1000;
const DAY = 24 * 60 * MIN;

// Minutes that `tz` is ahead of UTC at the instant `date`.
export function tzOffsetMinutes(tz, date) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: tz, hourCycle: 'h23',
      year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
    }).formatToParts(date).map(p => [p.type, p.value]),
  );
  const asUtc = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second);
  return Math.round((asUtc - date.getTime()) / MIN);
}

// "YYYY-MM-DD" + "HH:MM" wall-clock time in `tz` → Date.
export function zonedTime(day, hhmm, tz = TIMEZONE) {
  const [y, m, d] = day.split('-').map(Number);
  const [h, mi] = hhmm.split(':').map(Number);
  const guess = Date.UTC(y, m - 1, d, h, mi);
  const offset = tzOffsetMinutes(tz, new Date(guess));
  return new Date(guess - offset * MIN);
}

// Calendar date ("YYYY-MM-DD") of `date` in `tz`.
export function dayKey(date, tz = TIMEZONE) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}

function addDays(day, n) {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

function hhmmToMinutes(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

// Bookable start times for `type` between `from` and `to`, avoiding `busy`
// intervals ([{start, end}] as ISO strings or Dates) from Google Calendar.
export function generateSlots({ type, from, to, busy = [], now = new Date() }) {
  const meeting = MEETING_TYPES[type];
  if (!meeting) throw new Error(`Unknown meeting type: ${type}`);

  const earliest = Math.max(from.getTime(), now.getTime() + MIN_NOTICE_HOURS * 60 * MIN);
  const latest = Math.min(to.getTime(), now.getTime() + MAX_DAYS_AHEAD * DAY);
  const blocked = busy.map(b => [
    new Date(b.start).getTime() - BUFFER_MINUTES * MIN,
    new Date(b.end).getTime() + BUFFER_MINUTES * MIN,
  ]);

  const slots = [];
  for (let day = dayKey(new Date(earliest)); day <= dayKey(new Date(latest)); day = addDays(day, 1)) {
    const weekday = new Date(`${day}T00:00:00Z`).getUTCDay();
    for (const [open, close] of meeting.hours[weekday] || []) {
      for (let m = hhmmToMinutes(open); m + meeting.minutes <= hhmmToMinutes(close); m += SLOT_STEP_MINUTES) {
        const hhmm = `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
        const start = zonedTime(day, hhmm).getTime();
        const end = start + meeting.minutes * MIN;
        if (start < earliest || start > latest) continue;
        if (blocked.some(([bs, be]) => start < be && end > bs)) continue;
        slots.push(new Date(start).toISOString());
      }
    }
  }
  return slots;
}
