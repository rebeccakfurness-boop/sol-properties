# Serangan Sands | Sol Properties

Website for the Serangan Sands beachfront villas in South Lombok, hosted on Vercel.

| Page / endpoint      | What it does |
|----------------------|--------------|
| `/` (`index.html`)   | Main landing page with the enquiry form |
| `/book` (`book.html`)| Booking page: online meeting (Google Meet) or in-person site tour, with live availability from Google Calendar |
| `/api/availability`  | Free times, worked out from your opening hours minus anything already in your Google Calendar |
| `/api/book`          | Creates the Google Calendar event (with a Meet link for online meetings), sends the guest a calendar invite plus a branded confirmation, and emails you |
| `/api/contact`       | Emails you each enquiry and sends the enquirer an automatic reply asking them to book a meeting |

Booking rules (opening hours, meeting lengths, buffer between meetings, minimum notice, how far ahead people can book)
live in [`api/_lib/config.js`](api/_lib/config.js). All times are Lombok time (WITA, UTC+8).
Add a blocking event to your Google Calendar to take time off; those times disappear from the booking page automatically.

Preview the booking page without Google connected: open `/book?demo`.

## Connecting Google Calendar, Meet and Gmail (one-off, about 15 minutes)

Do every step while signed in to Google as **solpropertieslombok@gmail.com**. Bookings go into that account's calendar and emails are sent from it.

### 1. Create a Google Cloud project
1. Go to <https://console.cloud.google.com/> and create a project called `Sol Properties`.
2. Open **APIs & Services → Library**. Search for and **Enable** both **Google Calendar API** and **Gmail API**.

### 2. Set up the consent screen
1. Open **Google Auth Platform** (or **APIs & Services → OAuth consent screen**) and click **Get started**.
2. App name `Sol Properties`, support email solpropertieslombok@gmail.com, audience **External**. Finish.
3. Under **Audience**, click **Publish app** and confirm, so the status reads **In production**.
   *If you skip this, Google stops the connection after 7 days and bookings stop working.*
   You don't need Google to verify the app, because only you sign in to it.

### 3. Create the OAuth client
1. Go to **Clients → Create client**. Application type **Web application**, name `Sol website`.
2. Under **Authorised redirect URIs** add `https://developers.google.com/oauthplayground`.
3. Create it, then copy the **Client ID** and **Client secret**.

### 4. Get the refresh token
1. Go to <https://developers.google.com/oauthplayground>.
2. Click the ⚙️ gear (top right), tick **Use your own OAuth credentials**, and paste the Client ID and Client secret.
3. In the box under the list on the left (“Input your own scopes”), paste this line exactly:
   ```
   https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.freebusy https://www.googleapis.com/auth/gmail.send
   ```
4. Click **Authorize APIs** and sign in as solpropertieslombok@gmail.com. Google warns that the app isn't verified:
   click **Advanced → Go to Sol Properties**, then **Allow**.
5. Click **Exchange authorization code for tokens** and copy the **Refresh token**.

(Developers can run `GOOGLE_CLIENT_ID=… GOOGLE_CLIENT_SECRET=… npm run google-token` instead, using a *Desktop app* client.)

### 5. Add the keys to Vercel
In Vercel open the project → **Settings → Environment Variables** and add:

| Name | Value |
|------|-------|
| `GOOGLE_CLIENT_ID` | from step 3 |
| `GOOGLE_CLIENT_SECRET` | from step 3 |
| `GOOGLE_REFRESH_TOKEN` | from step 4 |

Optional: `NOTIFY_EMAIL` (where enquiries and booking alerts go; defaults to solpropertieslombok@gmail.com),
`SITE_URL` (defaults to https://www.sollombok.com), `BROCHURE_URL` (link used in the auto-reply email).

Then go to **Deployments**, open the latest one, click **⋯ → Redeploy**. Variables only take effect after a redeploy.

### 6. Test it
1. Open `https://www.sollombok.com/book`, pick an online meeting and book it with a personal email address.
2. You should get a Google Calendar invite with a Meet link plus a confirmation email, and the event appears in the Sol Properties calendar.
3. Send the contact form on the home page. You should receive the enquiry, and the test address should get the "let's arrange a time" email.

If anything fails, open the deployment in Vercel → **Logs**. Errors from Google appear there.

## Optional local photos
See `assets/img/README.md`.

## Development
```
npm test
```
No dependencies; the API uses Node 18+'s built-in `fetch`.
