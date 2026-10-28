import test from 'node:test';
import assert from 'node:assert/strict';

process.env.GOOGLE_CLIENT_ID = 'id';
process.env.GOOGLE_CLIENT_SECRET = 'secret';
process.env.GOOGLE_REFRESH_TOKEN = 'refresh';

const calls = [];
let busy = [];
globalThis.fetch = async (url, opts = {}) => {
  const body = opts.body && (typeof opts.body === 'string' ? JSON.parse(opts.body) : Object.fromEntries(opts.body));
  calls.push({ url: String(url), method: opts.method || 'GET', body });
  const json = data => ({ ok: true, status: 200, json: async () => data });
  if (url.includes('oauth2.googleapis.com/token')) return json({ access_token: 'tok', expires_in: 3600 });
  if (url.includes('/freeBusy')) return json({ calendars: { primary: { busy } } });
  if (url.includes('/events')) return json({ id: 'evt', htmlLink: 'https://calendar.google.com/evt', hangoutLink: 'https://meet.google.com/xyz-abcd-efg' });
  if (url.includes('/messages/send')) return json({ id: 'msg' });
  throw new Error('unexpected fetch ' + url);
};

const { default: book } = await import('../api/book.js');
const { default: contact } = await import('../api/contact.js');
const { default: availability } = await import('../api/availability.js');

function mockRes() {
  return {
    statusCode: 0, body: null, headers: {},
    status(c) { this.statusCode = c; return this; },
    json(b) { this.body = b; return this; },
    setHeader(k, v) { this.headers[k] = v; },
  };
}
const decode = raw => Buffer.from(raw, 'base64url').toString();
const emailsSent = () => calls.filter(c => c.url.includes('/messages/send')).map(c => decode(c.body.raw));

// a valid slot: next Tuesday-ish at 10:00 Lombok time, at least 2 days out
function futureSlot() {
  const d = new Date(Date.now() + 3 * 864e5);
  while (d.getUTCDay() === 0 || d.getUTCDay() === 6) d.setUTCDate(d.getUTCDate() + 1);
  return new Date(`${d.toISOString().slice(0, 10)}T10:00:00+08:00`).toISOString();
}

test('availability returns slots', async () => {
  calls.length = 0; busy = [];
  const res = mockRes();
  await availability({ method: 'GET', query: { type: 'online' } }, res);
  assert.equal(res.statusCode, 200);
  assert.ok(res.body.slots.length > 20);
});

test('online booking creates a Meet event, invites the guest and sends 2 emails', async () => {
  calls.length = 0; busy = [];
  const start = futureSlot();
  const res = mockRes();
  await book({ method: 'POST', body: { type: 'online', start, name: 'Ana Smith', email: 'ana@example.com', phone: '+61 400', timeZone: 'Australia/Perth' } }, res);
  assert.equal(res.statusCode, 200, JSON.stringify(res.body));
  assert.equal(res.body.meetLink, 'https://meet.google.com/xyz-abcd-efg');

  const ev = calls.find(c => c.url.includes('/events'));
  assert.match(ev.url, /sendUpdates=all/);
  assert.match(ev.url, /conferenceDataVersion=1/);
  assert.equal(ev.body.conferenceData.createRequest.conferenceSolutionKey.type, 'hangoutsMeet');
  assert.deepEqual(ev.body.attendees, [{ email: 'ana@example.com', displayName: 'Ana Smith' }]);
  assert.equal(new Date(ev.body.end.dateTime) - new Date(ev.body.start.dateTime), 30 * 60000);

  const mails = emailsSent();
  assert.equal(mails.length, 2);
  assert.ok(mails.some(m => m.includes('To: =?UTF-8?B?') || m.includes('ana@example.com')));
  assert.ok(mails.some(m => m.includes('To: solpropertieslombok@gmail.com')));
});

test('site tour has a location and no Meet link', async () => {
  calls.length = 0; busy = [];
  const res = mockRes();
  await book({ method: 'POST', body: { type: 'in-person', start: futureSlot(), name: 'Ben', email: 'ben@example.com' } }, res);
  assert.equal(res.statusCode, 200);
  const ev = calls.find(c => c.url.includes('/events'));
  assert.match(ev.url, /conferenceDataVersion=0/);
  assert.equal(ev.body.conferenceData, undefined);
  assert.match(ev.body.location, /Selong Belanak/);
});

test('a slot that is already busy is rejected with 409', async () => {
  calls.length = 0;
  const start = futureSlot();
  busy = [{ start, end: new Date(new Date(start).getTime() + 3600e3).toISOString() }];
  const res = mockRes();
  await book({ method: 'POST', body: { type: 'online', start, name: 'C', email: 'c@example.com' } }, res);
  assert.equal(res.statusCode, 409);
  assert.ok(!calls.some(c => c.url.includes('/events')));
});

test('contact form notifies the team and auto-replies with booking links', async () => {
  calls.length = 0;
  const res = mockRes();
  await contact({ method: 'POST', body: { first: 'Dana', last: 'Lee', email: 'dana@example.com', interest: 'Booking a site tour', message: 'Hi' } }, res);
  assert.equal(res.statusCode, 200);
  const mails = emailsSent();
  assert.equal(mails.length, 2);
  const reply = mails.find(m => m.includes('To: Dana Lee <dana@example.com>'));
  const html = Buffer.from(reply.split('Content-Type: text/html; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n')[1].split('\r\n')[0], 'base64').toString();
  assert.match(html, /\/book\?type=online/);
  assert.match(html, /\/book\?type=in-person/);
  assert.match(mails.find(m => m.includes('To: solpropertieslombok')), /Reply-To: dana@example.com/);
});

test('validation and honeypot', async () => {
  calls.length = 0;
  let res = mockRes();
  await contact({ method: 'POST', body: { first: 'X', email: 'not-an-email' } }, res);
  assert.equal(res.statusCode, 400);
  res = mockRes();
  await contact({ method: 'POST', body: { first: 'Bot', email: 'b@example.com', company: 'spam' } }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(emailsSent().length, 0);
});
