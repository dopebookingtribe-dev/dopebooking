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
