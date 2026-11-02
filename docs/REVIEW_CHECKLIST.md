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

## Phase 07: marketplace

- [ ] As a second account: `/sell` → apply (shop name, what you'll sell)
- [ ] As admin: `/admin/sellers` → open the application → **Approved**, commission e.g. 15%
- [ ] As the seller: `/dashboard/seller` → upload a logo, edit the profile
- [ ] **New product** → name, type, price → add options (S/M/L with stock), upload photos, choose a cover, set **Published**
- [ ] `/shop` shows it; product page: switch options, sold-out option is disabled; **Add to cart**
- [ ] `/cart`: change quantity, remove; prices match the product page
- [ ] As admin: **Suspend** the seller → the shop and products disappear from `/shop`; approve again → they return
- [ ] Try a digital product (no stock = unlimited)

## Phase 08: payments (do this when you set up Stripe)

### One-time Stripe setup (test mode)

- [ ] Create the Stripe account (Germany) and stay in **test mode / Sandbox**
- [ ] Developers → API keys → copy the **Secret key** (`sk_test_…`) into `.env.local` as `STRIPE_SECRET_KEY=`
- [ ] Connect → **Get started** (choose Marketplace), finish the platform profile
- [ ] Settings → Connect → Onboarding interface: name **DopeBooking**, colour, icon
- [ ] Tell Claude: it will start the Stripe event forwarder on your Mac (`stripe listen`) and add `STRIPE_WEBHOOK_SECRET` for you

### Test purchase

- [ ] As the seller: `/dashboard/seller` → **Set up payouts** → in Stripe's test onboarding use **"Use test data"** → status becomes **Active**
- [ ] Set a shipping fee; publish a physical and a digital product (with a download file)
- [ ] As a buyer (and once as a guest in a private window): add both to the cart → **Checkout** → card `4242 4242 4242 4242`, any future date, any CVC
- [ ] Back on the site: "Thank you!", order shows **Paid**, the download works
- [ ] Seller sees the order, marks it shipped with tracking; buyer sees tracking
- [ ] `/admin/orders`: amounts, commission and transfers look right; try a **partial refund**, then a full one
- [ ] In Stripe (test): the payment, the transfer to the seller and the refund/reversal appear
- [ ] Before going live: Stripe Tax/VAT decision, seller terms and refund policy, then switch to live keys and add the webhook endpoint for the real domain

## Phase 09: launch prep

- [ ] Read the legal drafts (`/legal/…`) and send them, with the `[PLACEHOLDERS]` list, to your lawyer
- [ ] Check the home page once you've added content (featured artists, events, videos, products)
- [ ] Share a page link in WhatsApp/Telegram: the DopeBooking preview image appears
- [ ] Follow `docs/LAUNCH.md` step by step

## Phase 10: CMS and redesign

Sign in as your admin account, then:

- [ ] **Admin, Pages, Home page**: change the hero headline, click **Save draft**, then **Preview**: the preview shows the new headline, the live home page doesn't yet.
- [ ] Click **Publish**: the live home page shows the change (refresh).
- [ ] Move a section up, hide one, add a **Questions and answers** section, publish, and check the home page.
- [ ] Choose a different hero photo with **Choose photo**, and upload a new one from the picker.
- [ ] **Media library**: click a photo to move its focus point and save; the crops update.
- [ ] **Site settings**: add a menu item and a social link, publish, check the header and footer.
- [ ] **Artists**: edit one, set a cover photo, change booking information; delete a test artist.
- [ ] **Products** and **Categories**: feature a product, change its category; check the shop filters.
- [ ] **Users and roles**: give a test account the Staff role; signed in as that account, Pages works but **Publish** is missing and Users and Audit are not available.
- [ ] **Audit log** lists your changes.
- [ ] **Demo content**: when real content is ready, remove the demo content and check the site (or turn the Demo labels off in Site settings).

## Phase 11: music marketplace

Run once: the two music migrations (`20261102000000_music_permissions.sql`, then `20261102000100_music.sql`). Then, signed in as admin:

- [ ] **Admin → Music → Artists & teams**: link an artist's own account by email (they sign up first)
- [ ] As that artist: **Dashboard → My music → New release** → title and type
- [ ] Fill the details (genre, style, BPM, key, price), upload square artwork, drop in one or more WAV/FLAC files: each becomes a track with a 60-second preview you can play back
- [ ] **Send for review** (both boxes ticked). The release shows **In review** and can't be edited
- [ ] As admin: **Admin → Music** → open it → listen to the preview and a master → **Approve and publish**. The artist gets a notification
- [ ] `/music`: the release appears (search, genre, tempo and sort work); its page plays previews in the bottom player while you browse; the artist profile shows a **Music** section
- [ ] Try **Send back with changes** on another release: the artist sees your note and can resubmit
- [ ] **Admin → Music finance**: check the default commission, hold days and minimum payout; set a different commission for one artist
- [ ] Bundles: create a bundle from two releases; its page lists every track and the saving

When Stripe test mode is set up (Phase 08):

- [ ] Buy a release (signed in, and once as a guest): **Dashboard → Music library** (or the guest order link) shows download buttons per format; each click downloads the master
- [ ] The artist's **Earnings** page shows the sale **On hold**; after the hold days (or set hold to 0 in finance settings for the test) it moves to **Available**
- [ ] The artist adds bank details and requests a payout; in **Music finance** approve it, send the transfer, **Mark as paid** with the bank reference; the artist sees **Paid**
- [ ] Refund the order in **Admin → Orders**: the artist's balance shows the refund and the buyer's downloads disappear
- [ ] Try to buy the same release again while signed in: checkout says you already own it
