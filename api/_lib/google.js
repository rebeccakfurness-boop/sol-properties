// Minimal Google API client (Calendar + Gmail) using an OAuth refresh token for
// the Sol Properties Google account. Run `npm run google-token` to create one.
import { CALENDAR_ID, SENDER_EMAIL } from './config.js';

let cached = { token: null, expires: 0 };

export function googleConfigured() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_REFRESH_TOKEN);
}

async function accessToken() {
  if (cached.token && Date.now() < cached.expires - 60_000) return cached.token;
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
      grant_type: 'refresh_token',
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Google token refresh failed: ${data.error} ${data.error_description || ''}`);
  cached = { token: data.access_token, expires: Date.now() + data.expires_in * 1000 };
  return cached.token;
}

async function google(url, { method = 'GET', body } = {}) {
  const res = await fetch(url, {
    method,
    headers: { Authorization: `Bearer ${await accessToken()}`, 'Content-Type': 'application/json' },
    body: body && JSON.stringify(body),
  });
  const data = res.status === 204 ? {} : await res.json();
  if (!res.ok) throw new Error(`Google API ${method} ${url} failed (${res.status}): ${JSON.stringify(data.error || data)}`);
  return data;
}

export async function busyTimes(from, to) {
  const data = await google('https://www.googleapis.com/calendar/v3/freeBusy', {
    method: 'POST',
    body: { timeMin: from.toISOString(), timeMax: to.toISOString(), items: [{ id: CALENDAR_ID }] },
  });
  const cal = data.calendars[CALENDAR_ID] || Object.values(data.calendars)[0];
  if (cal.errors?.length) throw new Error(`Calendar free/busy error: ${JSON.stringify(cal.errors)}`);
  return cal.busy;
}

// Creates the event and emails the invite to every attendee. When `meet` is true a
// Google Meet link is attached.
export async function createEvent({ summary, description, start, end, timeZone, attendees, location, meet, requestId }) {
  const params = new URLSearchParams({ sendUpdates: 'all', conferenceDataVersion: meet ? '1' : '0' });
  return google(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(CALENDAR_ID)}/events?${params}`, {
    method: 'POST',
    body: {
      summary, description, location, attendees,
      start: { dateTime: start.toISOString(), timeZone },
      end: { dateTime: end.toISOString(), timeZone },
      reminders: { useDefault: true },
      ...(meet && {
        conferenceData: { createRequest: { requestId, conferenceSolutionKey: { type: 'hangoutsMeet' } } },
      }),
    },
  });
}

const encodeHeader = s => (/^[\x20-\x7e]*$/.test(s) ? s : `=?UTF-8?B?${Buffer.from(s).toString('base64')}?=`);
const formatAddress = (name, email) => (name ? `${encodeHeader(name.replace(/["\r\n]/g, ''))} <${email}>` : email);

export async function sendEmail({ to, toName, subject, html, text, replyTo, fromName = 'Sol Properties' }) {
  const boundary = `sol_${Math.random().toString(36).slice(2)}`;
  const message = [
    `From: ${formatAddress(fromName, SENDER_EMAIL)}`,
    `To: ${formatAddress(toName, to)}`,
    replyTo ? `Reply-To: ${replyTo}` : null,
    `Subject: ${encodeHeader(subject)}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    Buffer.from(text).toString('base64'),
    `--${boundary}`,
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    Buffer.from(html).toString('base64'),
    `--${boundary}--`,
  ].filter(line => line !== null).join('\r\n');

  return google('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    body: { raw: Buffer.from(message).toString('base64url') },
  });
}
