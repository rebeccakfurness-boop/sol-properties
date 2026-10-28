// Booking rules. Edit these to change when meetings can be booked.
// All hours are local time in TIMEZONE (Lombok is WITA, UTC+8).

export const TIMEZONE = process.env.BOOKING_TIMEZONE || 'Asia/Makassar';

export const MEETING_TYPES = {
  online: {
    label: 'Online meeting',
    description: 'A video call on Google Meet to talk through the villa, pricing and the purchase process.',
    minutes: 30,
    // weekday: 0 = Sunday … 6 = Saturday. Each entry is [start, end] in 24h "HH:MM".
    hours: {
      1: [['08:00', '18:00']],
      2: [['08:00', '18:00']],
      3: [['08:00', '18:00']],
      4: [['08:00', '18:00']],
      5: [['08:00', '18:00']],
      6: [['09:00', '13:00']],
    },
  },
  'in-person': {
    label: 'Site tour (in person)',
    description: 'Meet us at Serangan Sands, walk the land and see the beach for yourself.',
    minutes: 60,
    hours: {
      1: [['09:00', '16:00']],
      2: [['09:00', '16:00']],
      3: [['09:00', '16:00']],
      4: [['09:00', '16:00']],
      5: [['09:00', '16:00']],
      6: [['09:00', '12:00']],
    },
  },
};

export const SLOT_STEP_MINUTES = 30;      // how far apart start times are offered
export const BUFFER_MINUTES = 15;         // free time kept before and after every meeting
export const MIN_NOTICE_HOURS = 12;       // no bookings sooner than this
export const MAX_DAYS_AHEAD = 60;         // how far ahead the calendar opens

export const SITE_ADDRESS =
  'Serangan Sands, Dusun Serangan, Selong Belanak, Kec. Praya Barat, Kabupaten Lombok Tengah, Nusa Tenggara Barat 83572, Indonesia';
export const SITE_MAP_URL = 'https://maps.app.goo.gl/MEbEZqxwD3Haizk58';

export const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID || 'primary';
// Must be the Google account the refresh token belongs to (or a Gmail "Send mail as" alias).
export const SENDER_EMAIL = process.env.SENDER_EMAIL || 'solpropertieslombok@gmail.com';
export const NOTIFY_EMAIL = process.env.NOTIFY_EMAIL || 'solpropertieslombok@gmail.com';
export const SITE_URL = (process.env.SITE_URL || 'https://www.sollombok.com').replace(/\/$/, '');
export const BROCHURE_URL = process.env.BROCHURE_URL || `${SITE_URL}/#villa`;
export const WHATSAPP = { label: '+64 27 406 7940', url: 'https://wa.me/64274067940' };
