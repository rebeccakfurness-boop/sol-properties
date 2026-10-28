import { NOTIFY_EMAIL } from './_lib/config.js';
import { sendEmail, googleConfigured } from './_lib/google.js';
import { enquiryAutoReply, enquiryNotification } from './_lib/emails.js';
import { readBody, clean, isEmail, fail } from './_lib/http.js';

// POST /api/contact  { first, last, email, phone, interest, message, company }
// Emails the enquiry to Sol Properties and sends the enquirer an automatic
// reply inviting them to book an online meeting or site tour.
export default async function handler(req, res) {
  if (req.method !== 'POST') return fail(res, 405, 'Method not allowed');
  if (!googleConfigured()) return fail(res, 503, 'The contact form is not set up yet.');

  const body = readBody(req);
  if (body.company) return res.status(200).json({ ok: true }); // honeypot

  const enquiry = {
    first: clean(body.first, 80),
    last: clean(body.last, 80),
    email: clean(body.email, 200).toLowerCase(),
    phone: clean(body.phone, 60),
    interest: clean(body.interest, 120),
    message: clean(body.message, 4000),
  };
  if (!enquiry.first) return fail(res, 400, 'Please enter your first name.');
  if (!isEmail(enquiry.email)) return fail(res, 400, 'Please enter a valid email address.');

  try {
    const name = `${enquiry.first} ${enquiry.last}`.trim();
    await sendEmail({ to: NOTIFY_EMAIL, replyTo: enquiry.email, fromName: 'Sol Properties Website', ...enquiryNotification(enquiry) });
    await sendEmail({ to: enquiry.email, toName: name, replyTo: NOTIFY_EMAIL, ...enquiryAutoReply(enquiry) });
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error(err);
    fail(res, 502, 'Sorry, your message could not be sent. Please email or WhatsApp us instead.');
  }
}
