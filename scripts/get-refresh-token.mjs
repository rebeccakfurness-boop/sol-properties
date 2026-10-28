// One-off helper: signs in to the Sol Properties Google account and prints the
// refresh token the booking system needs. Run it on your own computer:
//
//   GOOGLE_CLIENT_ID=... GOOGLE_CLIENT_SECRET=... npm run google-token
//
// The OAuth client must be of type "Desktop app" in Google Cloud Console.
import http from 'node:http';
import { exec } from 'node:child_process';

const { GOOGLE_CLIENT_ID: clientId, GOOGLE_CLIENT_SECRET: clientSecret } = process.env;
if (!clientId || !clientSecret) {
  console.error('Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET first (see README).');
  process.exit(1);
}

const PORT = 53682;
const redirectUri = `http://127.0.0.1:${PORT}/callback`;
const scopes = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar.freebusy',
  'https://www.googleapis.com/auth/gmail.send',
];

const authUrl = 'https://accounts.google.com/o/oauth2/v2/auth?' + new URLSearchParams({
  client_id: clientId,
  redirect_uri: redirectUri,
  response_type: 'code',
  scope: scopes.join(' '),
  access_type: 'offline',
  prompt: 'consent',
});

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, redirectUri);
  if (url.pathname !== '/callback') return res.end();
  const code = url.searchParams.get('code');
  if (!code) {
    res.end(`Sign-in failed: ${url.searchParams.get('error')}`);
    return server.close();
  }
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, grant_type: 'authorization_code' }),
  });
  const data = await tokenRes.json();
  if (!data.refresh_token) {
    res.end('No refresh token returned. See the terminal.');
    console.error('\nGoogle did not return a refresh token:', data);
  } else {
    res.end('Done! You can close this tab and go back to the terminal.');
    console.log('\nGOOGLE_REFRESH_TOKEN=' + data.refresh_token + '\n');
    console.log('Add that value to your Vercel project\'s Environment Variables. Keep it secret.');
  }
  server.close();
});

server.listen(PORT, '127.0.0.1', () => {
  console.log('Opening Google sign-in. Sign in as the Sol Properties account (solpropertieslombok@gmail.com).');
  console.log('If the browser does not open, visit:\n\n' + authUrl + '\n');
  const opener = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start ""' : 'xdg-open';
  exec(`${opener} "${authUrl}"`);
});
