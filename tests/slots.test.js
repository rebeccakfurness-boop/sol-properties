import test from 'node:test';
import assert from 'node:assert/strict';
import { generateSlots, zonedTime, dayKey } from '../api/_lib/slots.js';

// Monday 2 Nov 2026, 00:00 in Lombok (UTC+8)
const now = new Date('2026-11-01T16:00:00Z');
const dayStart = zonedTime('2026-11-03', '00:00');
const dayEnd = zonedTime('2026-11-04', '00:00');

test('zonedTime converts Lombok wall-clock time to UTC', () => {
  assert.equal(zonedTime('2026-11-03', '09:00').toISOString(), '2026-11-03T01:00:00.000Z');
  assert.equal(dayKey(new Date('2026-11-02T17:00:00Z')), '2026-11-03');
});

test('online slots cover opening hours every 30 min', () => {
  const slots = generateSlots({ type: 'online', from: dayStart, to: dayEnd, now });
  assert.equal(slots[0], '2026-11-03T00:00:00.000Z'); // 08:00 WITA
  assert.equal(slots.at(-1), '2026-11-03T09:30:00.000Z'); // 17:30 WITA, ends 18:00
  assert.equal(slots.length, 20);
});

test('site tours are 60 min within 09:00–16:00', () => {
  const slots = generateSlots({ type: 'in-person', from: dayStart, to: dayEnd, now });
  assert.equal(slots[0], '2026-11-03T01:00:00.000Z');
  assert.equal(slots.at(-1), '2026-11-03T07:00:00.000Z'); // 15:00 WITA
});

test('busy calendar times plus buffer are removed', () => {
  const busy = [{ start: '2026-11-03T02:00:00Z', end: '2026-11-03T03:00:00Z' }]; // 10:00–11:00 WITA
  const slots = generateSlots({ type: 'online', from: dayStart, to: dayEnd, busy, now });
  // 09:30 (ends 10:00, inside 15 min buffer), 10:00, 10:30, 11:00 (starts inside buffer) are gone
  for (const t of ['01:30', '02:00', '02:30', '03:00']) assert.ok(!slots.includes(`2026-11-03T${t}:00.000Z`), t);
  assert.ok(slots.includes('2026-11-03T01:00:00.000Z'));
  assert.ok(slots.includes('2026-11-03T03:30:00.000Z'));
});

test('Sundays are closed and minimum notice applies', () => {
  const sunday = generateSlots({ type: 'online', from: zonedTime('2026-11-08', '00:00'), to: zonedTime('2026-11-09', '00:00'), now });
  assert.equal(sunday.length, 0);
  const soon = generateSlots({ type: 'online', from: now, to: dayEnd, now: zonedTime('2026-11-02', '20:00') });
  // booked at 20:00 the night before: 08:00 next day is exactly 12 h away, so it's the first slot
  assert.equal(soon[0], '2026-11-03T00:00:00.000Z');
});
