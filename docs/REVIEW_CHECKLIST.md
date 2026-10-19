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
