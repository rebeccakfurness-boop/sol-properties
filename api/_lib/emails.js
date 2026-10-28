import { SITE_URL, BROCHURE_URL, WHATSAPP, NOTIFY_EMAIL, SITE_ADDRESS, SITE_MAP_URL, SOCIAL } from './config.js';

export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const button = (href, label, solid = true) => `
  <a href="${esc(href)}" style="display:inline-block;margin:6px 8px 6px 0;padding:14px 26px;font:500 12px/1 Arial,sans-serif;letter-spacing:2px;text-transform:uppercase;text-decoration:none;border:1px solid #4e5236;${solid ? 'background:#4e5236;color:#f4efe7;' : 'background:transparent;color:#4e5236;'}">${esc(label)}</a>`;

function layout({ preheader, heading, body }) {
  return `<!doctype html><html><body style="margin:0;background:#ebe3d6;">
  <span style="display:none;max-height:0;overflow:hidden;">${esc(preheader)}</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ebe3d6;padding:32px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#f4efe7;">
        <tr><td style="background:#363925;padding:26px 36px;color:#f4efe7;font:500 22px/1 Georgia,serif;letter-spacing:8px;">SOL
          <div style="font:400 9px/1 Arial,sans-serif;letter-spacing:5px;margin-top:6px;opacity:.8;">PROPERTIES</div></td></tr>
        <tr><td style="padding:40px 36px 12px;font:400 30px/1.2 Georgia,serif;color:#2f2a25;">${heading}</td></tr>
        <tr><td style="padding:0 36px 36px;font:300 15px/1.7 Arial,sans-serif;color:#2f2a25;">${body}</td></tr>
        <tr><td style="padding:24px 36px;border-top:1px solid #d9cfbf;font:400 12px/1.7 Arial,sans-serif;color:#6f665c;">
          Sol Properties · Serangan Sands, Selong Belanak, South Lombok<br>
          WhatsApp ${WHATSAPP.name} <a href="${WHATSAPP.url}" style="color:#4e5236;">${WHATSAPP.label}</a> ·
          <a href="mailto:${NOTIFY_EMAIL}" style="color:#4e5236;">${NOTIFY_EMAIL}</a> ·
          <a href="${SITE_URL}" style="color:#4e5236;">sollombok.com</a><br>
          <a href="${SOCIAL.instagram}" style="color:#4e5236;">Instagram</a> ·
          <a href="${SOCIAL.facebook}" style="color:#4e5236;">Facebook</a>
        </td></tr>
      </table>
    </td></tr>
  </table></body></html>`;
}

const textFooter = `\n\nSol Properties · Serangan Sands, Selong Belanak, South Lombok\nWhatsApp ${WHATSAPP.name} ${WHATSAPP.label} · ${NOTIFY_EMAIL} · ${SITE_URL}\nInstagram ${SOCIAL.instagram} · Facebook ${SOCIAL.facebook}`;

// Sent automatically to anyone who submits the contact form.
export function enquiryAutoReply({ first }) {
  const name = first || 'there';
  const online = `${SITE_URL}/book?type=online`;
  const tour = `${SITE_URL}/book?type=in-person`;
  return {
    subject: 'Thank you for your enquiry — let’s arrange a time to talk',
    html: layout({
      preheader: 'Choose a time for an online meeting or a site tour at Serangan Sands.',
      heading: `Thank you, ${esc(name)}`,
      body: `
        <p>Thank you for your interest in Serangan Sands. We've received your enquiry and a member of our team will be in touch shortly.</p>
        <p>The best way to get your questions answered is a short meeting with us. Choose whichever suits you:</p>
        <p style="margin:0 0 6px;"><strong style="font-weight:bold;">Online meeting</strong> — a 30-minute Google Meet call to talk through the villa, pricing and the purchase process.</p>
        <p style="margin:0 0 18px;"><strong style="font-weight:bold;">Site tour</strong> — meet us at Serangan Sands, walk the land and see the beach for yourself.</p>
        <p>${button(online, 'Book an online meeting')}${button(tour, 'Book a site tour', false)}</p>
        <p>Only one land and villa package remains, from US$360,000 including land, villa, pool and full furnishing. You can <a href="${esc(BROCHURE_URL)}" style="color:#4e5236;">download our brochure here</a>.</p>
        <p>Prefer to chat now? Message us on <a href="${WHATSAPP.url}" style="color:#4e5236;">WhatsApp</a>.</p>
        <p style="margin-top:28px;">Warm regards,<br>The Sol Properties team</p>`,
    }),
    text: `Hi ${name},

Thank you for your interest in Serangan Sands. We've received your enquiry and a member of our team will be in touch shortly.

The best way to get your questions answered is a short meeting with us:

- Online meeting (30 min, Google Meet): ${online}
- Site tour at Serangan Sands: ${tour}

Only one land and villa package remains, from US$360,000 including land, villa, pool and full furnishing.
Brochure: ${BROCHURE_URL}

Prefer to chat now? WhatsApp us: ${WHATSAPP.url}

Warm regards,
The Sol Properties team${textFooter}`,
  };
}

const row = (k, v) => `<tr><td style="padding:6px 16px 6px 0;color:#6f665c;vertical-align:top;white-space:nowrap;">${esc(k)}</td><td style="padding:6px 0;">${esc(v).replace(/\n/g, '<br>')}</td></tr>`;
const table = rows => `<table role="presentation" cellpadding="0" cellspacing="0" style="font:inherit;">${rows.filter(([, v]) => v).map(([k, v]) => row(k, v)).join('')}</table>`;
const textRows = rows => rows.filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join('\n');

// Sent to the Sol Properties inbox for every contact form submission.
export function enquiryNotification(e) {
  const rows = [['Name', `${e.first} ${e.last}`.trim()], ['Email', e.email], ['Phone', e.phone], ['Interested in', e.interest], ['Message', e.message]];
  return {
    subject: `New enquiry — ${`${e.first} ${e.last}`.trim()}`,
    html: layout({
      preheader: `${e.first} ${e.last} · ${e.interest}`,
      heading: 'New website enquiry',
      body: `${table(rows)}<p style="margin-top:20px;">They've been sent an automatic email inviting them to book a meeting. Reply to this email to answer them directly.</p>`,
    }),
    text: `New website enquiry\n\n${textRows(rows)}\n\nThey've been sent an automatic email inviting them to book a meeting.`,
  };
}

function whenText(start, timeZone) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
  }).format(start);
}

// Branded confirmation for the person who booked (Google also sends its own calendar invite).
export function bookingConfirmation({ name, type, label, minutes, start, timeZone, meetLink }) {
  const when = whenText(start, timeZone);
  const whereHtml = type === 'online'
    ? (meetLink ? `Google Meet: <a href="${esc(meetLink)}" style="color:#4e5236;">${esc(meetLink)}</a>` : 'A Google Meet link is in your calendar invitation.')
    : `<a href="${SITE_MAP_URL}" style="color:#4e5236;">${esc(SITE_ADDRESS)}</a>`;
  const whereText = type === 'online' ? `Google Meet: ${meetLink || 'see your calendar invitation'}` : `${SITE_ADDRESS}\nMap: ${SITE_MAP_URL}`;
  return {
    subject: `Confirmed: ${label} — ${when}`,
    html: layout({
      preheader: `${label} · ${when}`,
      heading: 'Your meeting is confirmed',
      body: `
        <p>Hi ${esc(name.split(' ')[0])}, thank you for booking with Sol Properties. Here are your details:</p>
        <table role="presentation" cellpadding="0" cellspacing="0" style="font:inherit;margin:18px 0;">
          ${row('Meeting', `${label} (${minutes} min)`)}
          ${row('When', when)}
          <tr><td style="padding:6px 16px 6px 0;color:#6f665c;vertical-align:top;">Where</td><td style="padding:6px 0;">${whereHtml}</td></tr>
        </table>
        ${type === 'online' && meetLink ? `<p>${button(meetLink, 'Join Google Meet')}</p>` : ''}
        <p>A calendar invitation has also been sent to this address. If you need to change the time, reply to this email or message us on <a href="${WHATSAPP.url}" style="color:#4e5236;">WhatsApp</a>.</p>
        <p style="margin-top:28px;">We look forward to meeting you,<br>The Sol Properties team</p>`,
    }),
    text: `Hi ${name.split(' ')[0]},

Your meeting with Sol Properties is confirmed.

Meeting: ${label} (${minutes} min)
When: ${when}
Where: ${whereText}

A calendar invitation has also been sent to this address. To change the time, reply to this email or WhatsApp us: ${WHATSAPP.url}

The Sol Properties team${textFooter}`,
  };
}

export function bookingNotification({ name, email, phone, message, label, start, timeZone, meetLink, eventLink }) {
  const rows = [['Meeting', label], ['When (Lombok)', whenText(start, timeZone)], ['Name', name], ['Email', email], ['Phone', phone], ['Notes', message], ['Google Meet', meetLink]];
  return {
    subject: `New booking: ${label} with ${name}`,
    html: layout({
      preheader: `${name} · ${whenText(start, timeZone)}`,
      heading: 'New meeting booked',
      body: `${table(rows)}${eventLink ? `<p style="margin-top:20px;">${button(eventLink, 'Open in Google Calendar')}</p>` : ''}`,
    }),
    text: `New meeting booked\n\n${textRows(rows)}${eventLink ? `\n\nCalendar: ${eventLink}` : ''}`,
  };
}
