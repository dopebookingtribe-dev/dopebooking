# Review checklist

Things to test by hand at the end. They need a real login or real content, so automated tests don't cover them. Tick them off and note anything to change.

## Phase 02: accounts

- [ ] Sign up, open the confirmation email in the same browser, land on the dashboard
- [ ] Sign out and sign in again
- [ ] "Forgot password": receive email, set a new password
- [ ] Non-admin account gets a 404 at `/admin`

## Phase 03: artists

- [ ] `/admin/artists`: create an artist, fill details, set **Published**
- [ ] Upload 2–3 photos (JPG/PNG/WebP), set one as portrait, delete one
- [ ] Add links (SoundCloud, Instagram…), reorder by removing/adding
- [ ] Private booking info saves and is **not** visible on the public page
- [ ] `/artists` shows the card; genre filter works
- [ ] `/artists/<slug>` looks right on phone and desktop
- [ ] Set an artist back to **Draft**: it disappears from `/artists`

## Phase 04: events, galleries, videos

- [ ] `/admin/events`: create an event (check the time zone), add venue, ticket link, publish
- [ ] Lineup: add 3 artists, reorder with ↑/↓, set a stage and set time, save
- [ ] Upload a wide cover photo
- [ ] `/events` shows it under Upcoming; event page shows date/time in the event's zone, lineup and "Get tickets"
- [ ] `/admin/galleries`: create a gallery linked to the event, bulk-upload 10+ photos, choose a cover, publish
- [ ] `/gallery/<slug>`: photos open full-screen; ← → keys and Esc work; works on phone
- [ ] `/admin/videos`: paste a YouTube (or Mux/Cloudflare) link, link it to the event and an artist, publish
- [ ] Video page: poster shows first; clicking plays
- [ ] Event page shows the gallery and video; artist page shows "Upcoming shows" and "Videos"
- [ ] Decide: **Mux or Cloudflare Stream** for your own aftermovie hosting

## Phase 05: bookings

Use a **second (non-admin) account** as the promoter. A private/incognito window works.

- [ ] As promoter: open a published artist → **Request booking** → fill the form → lands on the request page with "Request sent"
- [ ] As admin: `/admin/bookings` shows it under Open; open it, **Assign to me**, **Start review**
- [ ] **Send quote** with an amount and "what's included"; the promoter sees the quote box and a timeline entry
- [ ] Message back and forth; an **internal note** is not visible to the promoter
- [ ] Promoter: **Cancel request** works on an open request; admin sees the cancellation
- [ ] Notifications appear on `/dashboard/notifications` for both sides
- [ ] Guest (signed out) on `/book/<artist>` sees "Create account / Sign in", and after sign-up returns to the form

### Turning on email (one-time setup, you do this)

- [ ] Create a Resend account and verify your sending domain (DNS records)
- [ ] Add to `.env.local` and to Vercel: `RESEND_API_KEY`, `EMAIL_FROM` (e.g. `DopeBooking <bookings@yourdomain>`), `SUPABASE_SECRET_KEY` (Supabase → Project Settings → API Keys → Secret key), `CRON_SECRET` (any long random string)
- [ ] Optional but recommended: Supabase → Auth → SMTP settings → use Resend. Sign-up emails then come from your domain (and email templates become editable)

## Phase 06: promotion, catering, production

- [ ] `/services` and the three offer pages read well; edit the pitch texts if you like (`src/modules/services/schemas.ts`)
- [ ] As promoter: send a **catering** request (choose crew + artist hospitality, dietary needs)
- [ ] Send a **production** request; switch between Photography / Videography / Aftermovie and check only the chosen questions are asked
- [ ] As admin: `/admin/providers` → add a caterer; on the catering request, assign the provider and yourself
- [ ] Send a quote; as promoter, **Accept quote**; as admin, **Confirm**
- [ ] Messages and internal notes behave like bookings
- [ ] Review the questions for each service. Anything to add or remove?
