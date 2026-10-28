import { randomUUID } from 'node:crypto';
import { MEETING_TYPES, TIMEZONE, SITE_ADDRESS, NOTIFY_EMAIL } from './_lib/config.js';
import { generateSlots } from './_lib/slots.js';
import { busyTimes, createEvent, sendEmail, googleConfigured } from './_lib/google.js';
import { bookingConfirmation, bookingNotification } from './_lib/emails.js';
import { readBody, clean, isEmail, fail } from './_lib/http.js';

const MIN = 60 * 1000;

// POST /api/book  { type, start, name, email, phone, message, company }
export default async function handler(req, res) {
  if (req.method !== 'POST') return fail(res, 405, 'Method not allowed');
  if (!googleConfigured()) return fail(res, 503, 'Online booking is not set up yet.');

  const body = readBody(req);
  if (body.company) return res.status(200).json({ ok: true }); // honeypot: bots fill hidden fields

  const type = clean(body.type, 20);
  const meeting = MEETING_TYPES[type];
  const name = clean(body.name, 120);
  const email = clean(body.email, 200).toLowerCase();
  const phone = clean(body.phone, 60);
  const message = clean(body.message, 2000);
  const start = new Date(body.start);

  if (!meeting) return fail(res, 400, 'Please choose a meeting type.');
  if (!name) return fail(res, 400, 'Please enter your name.');
  if (!isEmail(email)) return fail(res, 400, 'Please enter a valid email address.');
  if (isNaN(start)) return fail(res, 400, 'Please choose a time.');

  const end = new Date(start.getTime() + meeting.minutes * MIN);

  try {
    // Re-check the slot against the live calendar so two people can't take the same time.
    const windowFrom = new Date(start.getTime() - 24 * 60 * MIN);
    const windowTo = new Date(end.getTime() + 24 * 60 * MIN);
    const busy = await busyTimes(windowFrom, windowTo);
    const open = generateSlots({ type, from: windowFrom, to: windowTo, busy });
    if (!open.includes(start.toISOString())) {
      return fail(res, 409, 'Sorry, that time has just been taken. Please choose another.');
    }

    const online = type === 'online';
    const event = await createEvent({
      summary: `${online ? 'Online meeting' : 'Site tour'}: Serangan Sands × ${name}`,
      description: [
        `${meeting.label} booked via sollombok.com`,
        '',
        `Name: ${name}`,
        `Email: ${email}`,
        phone && `Phone: ${phone}`,
        message && `\nNotes:\n${message}`,
      ].filter(Boolean).join('\n'),
      start, end, timeZone: TIMEZONE,
      attendees: [{ email, displayName: name }],
      location: online ? undefined : SITE_ADDRESS,
      meet: online,
      requestId: randomUUID(),
    });

    const meetLink = event.hangoutLink
      || event.conferenceData?.entryPoints?.find(p => p.entryPointType === 'video')?.uri;
    const details = { name, email, phone, message, type, label: meeting.label, minutes: meeting.minutes, start, meetLink };

    // The calendar invite is the essential part; a failed email shouldn't fail the booking.
    const emails = await Promise.allSettled([
      sendEmail({ to: email, toName: name, ...bookingConfirmation({ ...details, timeZone: type === 'online' ? clean(body.timeZone, 60) || TIMEZONE : TIMEZONE }) }),
      sendEmail({ to: NOTIFY_EMAIL, replyTo: email, ...bookingNotification({ ...details, timeZone: TIMEZONE, eventLink: event.htmlLink }) }),
    ]);
    emails.filter(r => r.status === 'rejected').forEach(r => console.error(r.reason));

    res.status(200).json({ ok: true, start: start.toISOString(), end: end.toISOString(), meetLink: meetLink || null });
  } catch (err) {
    console.error(err);
    fail(res, 502, 'Something went wrong creating your booking. Please try again or contact us on WhatsApp.');
  }
}
