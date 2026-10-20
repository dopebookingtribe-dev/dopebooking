# DopeBooking — Project Architecture (Phase 01)

Status: **Approved for Phase 02** (2026-10-19). Nothing in this document is built yet.
Date: 2026-10-19

Platform: a premium international psytrance artist agency and festival services platform. It covers artist booking, events and media, a multi-vendor marketplace, event promotion, catering, and photo/video/aftermovie production.

---

## 1. Repository audit

| Area                           | Finding                                                                        |
| ------------------------------ | ------------------------------------------------------------------------------ |
| Repository                     | `github.com/erfantech200/dopebooking`, branch `main`, **no commits, no files** |
| Framework / version            | None                                                                           |
| Package manager / dependencies | None (no `package.json`, no lockfile)                                          |
| Routes / pages                 | None                                                                           |
| UI components / styling        | None                                                                           |
| Authentication / authorization | None                                                                           |
| Database / migrations          | None                                                                           |
| API / backend                  | None                                                                           |
| File & media storage           | None                                                                           |
| Payments                       | None                                                                           |
| Environment variables          | None defined (no `.env*` files present)                                        |
| Tests / lint / type checking   | None                                                                           |
| Deployment / build             | No config; nothing to build                                                    |

**Local machine toolchain (inspected 2026-10-19):** `git 2.50.1` only. Not installed: Node.js, npm/pnpm/yarn/bun, GitHub CLI, Supabase CLI, Stripe CLI, Vercel CLI, Docker. Node.js must be installed before Phase 02.

Since the repository is empty, everything below is a **clean proposed architecture**. None of it describes existing infrastructure.

## 2. Existing vs. missing functionality

- **Existing:** nothing beyond an empty git remote.
- **Missing:** all of it. That includes the app scaffold, design system, auth, database, storage, all seven product areas, payments, email, tests, CI, and deployment.

---

## 3. Proposed route map

Legend: **P** = public · **A** = any signed-in user · **R:role** = restricted to role(s) · **S** = server-to-server (signature-verified)

### 3.1 Public marketing

| Route                                                                                             | Access | Purpose                                                     |
| ------------------------------------------------------------------------------------------------- | ------ | ----------------------------------------------------------- |
| `/`                                                                                               | P      | Home: hero, featured artists, upcoming events, services CTA |
| `/about`                                                                                          | P      | Agency story, team, territories                             |
| `/contact`                                                                                        | P      | General contact form (rate-limited, captcha)                |
| `/services`                                                                                       | P      | Overview of promotion, catering, production                 |
| `/services/promotion`                                                                             | P      | Promotion offering + request CTA                            |
| `/services/catering`                                                                              | P      | Festival catering offering + request CTA                    |
| `/services/production`                                                                            | P      | Photo / video / aftermovie offering + request CTA           |
| `/legal/terms`, `/legal/privacy`, `/legal/cookies`, `/legal/seller-terms`, `/legal/booking-terms` | P      | Legal                                                       |

### 3.2 Artist directory

| Route                       | Access | Purpose                                                        |
| --------------------------- | ------ | -------------------------------------------------------------- |
| `/artists`                  | P      | Directory: filter by sub-genre, country, availability          |
| `/artists/[slug]`           | P      | Profile: bio, media, links, upcoming events, "Request booking" |
| `/artists/[slug]/press-kit` | P      | Public EPK (public assets only)                                |

### 3.3 Events & media

| Route             | Access | Purpose                            |
| ----------------- | ------ | ---------------------------------- |
| `/events`         | P      | Upcoming / past events             |
| `/events/[slug]`  | P      | Event detail, lineup, gallery link |
| `/gallery`        | P      | Photo galleries index              |
| `/gallery/[slug]` | P      | Gallery detail (lightbox)          |
| `/videos`         | P      | Video & aftermovie index           |
| `/videos/[slug]`  | P      | Video detail                       |

### 3.4 Marketplace

| Route                                      | Access | Purpose                                                     |
| ------------------------------------------ | ------ | ----------------------------------------------------------- |
| `/shop`                                    | P      | Catalog                                                     |
| `/shop/[productSlug]`                      | P      | Product detail                                              |
| `/shop/sellers/[slug]`                     | P      | Seller storefront                                           |
| `/cart`                                    | P      | Cart (client state, persisted for signed-in users)          |
| `/checkout`                                | P      | Redirects to Stripe Checkout (guest checkout allowed)       |
| `/checkout/success`, `/checkout/cancelled` | P      | Return pages (display only; source of truth is the webhook) |
| `/sell`                                    | P      | "Become a seller" landing + application CTA                 |

### 3.5 Booking & service requests

| Route                 | Access | Purpose                                 |
| --------------------- | ------ | --------------------------------------- |
| `/book/[artistSlug]`  | A      | Artist booking request form             |
| `/request/promotion`  | A      | Promotion request form                  |
| `/request/catering`   | A      | Catering request form                   |
| `/request/production` | A      | Photo / video / aftermovie request form |

Forms are visible to everyone, but **submitting requires an account**. This prevents spam and keeps request history attached to a user.

### 3.6 Authentication

| Route                                                      | Access                                                           |
| ---------------------------------------------------------- | ---------------------------------------------------------------- |
| `/login`, `/signup`, `/forgot-password`, `/reset-password` | P (redirect if signed in)                                        |
| `/auth/confirm`                                            | P (email link verification)                                      |
| `/auth/verify`                                             | P                                                                |
| `/onboarding`                                              | A (choose intent: promoter / buyer / artist / seller / provider) |

### 3.7 Role-specific dashboards (`/dashboard/*`)

| Route                                                               | Access                                                            |
| ------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `/dashboard`                                                        | A (role-aware overview)                                           |
| `/dashboard/account`, `/dashboard/notifications`                    | A                                                                 |
| `/dashboard/bookings`, `/dashboard/bookings/[id]`                   | A (own requests)                                                  |
| `/dashboard/requests`, `/dashboard/requests/[id]`                   | A (own promotion/service requests)                                |
| `/dashboard/orders`, `/dashboard/orders/[id]`                       | A (own purchases)                                                 |
| `/orders/[id]?token=…`                                              | P (guest order lookup via signed, expiring link emailed to buyer) |
| `/dashboard/artist/profile`, `/media`, `/bookings`, `/availability` | R:artist (members of that artist only)                            |
| `/dashboard/seller/products`, `/orders`, `/payouts`, `/settings`    | R:seller (approved sellers)                                       |
| `/dashboard/provider/requests`, `/portfolio`, `/quotes`             | R:provider                                                        |

### 3.8 Admin (`/admin/*`)

| Route                                                                 | Access         |
| --------------------------------------------------------------------- | -------------- |
| `/admin`                                                              | R:staff, admin |
| `/admin/artists`, `/admin/events`, `/admin/galleries`, `/admin/media` | R:staff, admin |
| `/admin/bookings`, `/admin/promotions`, `/admin/services`             | R:staff, admin |
| `/admin/sellers`, `/admin/products`, `/admin/orders`                  | R:staff, admin |
| `/admin/commissions`, `/admin/payouts`                                | R:admin        |
| `/admin/users`, `/admin/roles`                                        | R:admin        |
| `/admin/audit-log`, `/admin/settings`                                 | R:admin        |

### 3.9 API & webhooks

Most mutations should be **Server Actions**. Route handlers exist only where an external caller needs them.

| Endpoint                                   | Access                | Purpose                                        |
| ------------------------------------------ | --------------------- | ---------------------------------------------- |
| `POST /api/webhooks/stripe`                | S                     | Stripe events (signature-verified, idempotent) |
| `POST /api/webhooks/email`                 | S                     | Email provider bounces/complaints (if used)    |
| `POST /api/stripe/connect/onboarding-link` | R:seller              | Create Account Link                            |
| `POST /api/checkout`                       | P                     | Create Checkout Session (signed-in or guest)   |
| `POST /api/uploads/sign`                   | A (+ ownership check) | Signed upload URL                              |
| `GET /api/health`                          | P                     | Liveness for uptime monitoring                 |

Enforcement happens in layers:

1. `src/proxy.ts` (Next.js 16 renamed Middleware to Proxy) refreshes the session and redirects unauthenticated users away from `/dashboard` and `/admin`.
2. Server components and actions check the role again.
3. Database RLS is the final boundary.

Hiding something in the UI never counts as authorization.

---

## 4. Proposed application architecture

**A modular monolith, deployed as one Next.js app.** There are no microservices, because no current requirement needs independent scaling or deployment.

| Concern         | Recommendation                                                                                                                    | Notes / alternatives                                                                                                                                      |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Language        | TypeScript (strict)                                                                                                               | —                                                                                                                                                         |
| Framework       | Next.js (App Router), latest stable at Phase 02, pinned                                                                           | React Server Components for public pages (SEO, performance)                                                                                               |
| Package manager | npm                                                                                                                               | Chosen in Phase 02 (ships with Node.js)                                                                                                                   |
| Styling         | Tailwind CSS + CSS-variable design tokens                                                                                         | Small in-house component set; Radix primitives for accessible dialogs, menus, tabs                                                                        |
| Database        | Supabase Postgres                                                                                                                 | Relational data fits well; RLS gives defense in depth                                                                                                     |
| Data access     | `@supabase/ssr` + generated TS types; Postgres functions (RPC) for multi-step state changes                                       | Drizzle can be added later if query complexity grows                                                                                                      |
| Migrations      | Supabase CLI SQL migrations in `supabase/migrations`, committed                                                                   | Seed data in `supabase/seed.sql`                                                                                                                          |
| Auth            | Supabase Auth (email + magic link; Google optional)                                                                               | Roles live in our `user_roles` table, not only in JWT claims                                                                                              |
| Media           | Supabase Storage + image transformations for photos; **video via paid streaming (Mux or Cloudflare Stream — choose in Phase 04)** | Approved: branded streaming instead of YouTube/Vimeo. Upload via direct signed upload; playback via signed/public playback IDs; webhook marks asset ready |
| Payments        | Stripe Checkout + Stripe Connect (account type and charge model **to be verified**, see §7)                                       | Test mode only until legal/tax review                                                                                                                     |
| Email           | Resend (approved) + React Email templates, sent via an `email_outbox` table                                                       | Outbox makes sends retryable and auditable                                                                                                                |
| Validation      | Zod schemas shared by forms and server actions                                                                                    | Never trust client input; re-validate on the server                                                                                                       |
| Errors          | Typed `Result` returns from actions; error boundaries per route segment; user-safe messages                                       | Internal details logged, never shown                                                                                                                      |
| Testing         | Vitest (unit), Playwright (e2e on critical flows), pgTAP or SQL tests for RLS policies                                            | RLS tests are mandatory, not optional                                                                                                                     |
| Lint / format   | ESLint + Prettier, `tsc --noEmit` in CI                                                                                           | —                                                                                                                                                         |
| CI              | GitHub Actions: install → lint → typecheck → unit → build; e2e on preview                                                         | —                                                                                                                                                         |
| Hosting         | Vercel (app) + Supabase (DB/Auth/Storage)                                                                                         | Region choice depends on main audience (decision)                                                                                                         |
| Observability   | Sentry (errors), Vercel Analytics / Speed Insights, structured logs, uptime check on `/api/health`                                | —                                                                                                                                                         |

### Proposed folder structure

```
src/
  app/                    # routes only (thin)
    (marketing)/  (directory)/  (media)/  (shop)/  (requests)/
    (auth)/  dashboard/  admin/  api/
  modules/                # domain logic, one folder per domain
    artists/  events/  media/  bookings/  marketplace/
    promotion/  services/  notifications/  auth/  admin/
      ├─ actions.ts       # server actions
      ├─ queries.ts       # read functions
      ├─ schemas.ts       # zod
      └─ components/      # domain UI
  components/ui/          # design-system primitives
  lib/                    # supabase clients, stripe, email, env, logger
  styles/                 # tokens.css, globals.css
supabase/
  migrations/  seed.sql  tests/
docs/
```

`lib/env.ts` validates every environment variable with Zod at startup. The app fails fast if one is missing.

### Planned environment variable names (no values)

`NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY` (server only), `STRIPE_SECRET_KEY` (server only), `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `RESEND_API_KEY`, `EMAIL_FROM`, `SENTRY_DSN`. A `.env.example` with names only will be committed. `.env*.local` will be gitignored.

---

## 5. Proposed database model

Conventions:

- `uuid` primary keys.
- `created_at` and `updated_at` timestamps.
- Money stored as **integer minor units + ISO currency code**.
- Statuses as Postgres enums.
- `slug` unique where public.
- Soft states (`draft` / `published` / `archived`) instead of deletes for content.

### 5.1 Users & roles

- **profiles** (`id` = `auth.users.id`, display_name, avatar_path, country, phone 🔒, marketing_opt_in)
- **user_roles** (user_id → profiles, role enum `customer | promoter | artist | seller | provider | staff | admin`, granted_by, created_at). PK (user_id, role). A user can hold several roles.

### 5.2 Artists & media

- **artists** (slug ⓤ, stage_name, bio, country, genres text[], status, featured, sort)
- **artist_members** (artist_id, user_id, member_role `owner | manager`). Links accounts to artist profiles; one artist can have several managers.
- **artist_private** 🔒 (artist_id PK/FK, fee_range_min/max, currency, technical_rider_path, hospitality_rider_path, contact_email, internal_notes). Kept in a separate table so RLS stays simple.
- **artist_links** (artist_id, platform, url)
- **media_assets** (type `image | video | audio | document`, storage_bucket, storage_path **or** external_url, alt_text, credit, width, height, sort, visibility `public | private`; nullable FKs artist_id, gallery_id, product_id, provider_id). Check constraint: exactly one owner FK is set. Check: storage_path xor external_url.

### 5.3 Events & galleries

- **events** (slug ⓤ, title, starts_at, ends_at, timezone, venue_name, city, country, status, ticket_url)
- **event_artists** (event_id, artist_id, set_starts_at, stage). PK (event_id, artist_id).
- **galleries** (slug ⓤ, title, event_id nullable, cover_asset_id, status, published_at)

### 5.4 Booking requests

- **booking_requests** 🔒 (artist_id, requester_id, event_name, event_date, city, country, venue, expected_attendance, set_length_minutes, budget_amount, currency, message, status, assigned_staff_id)
  - status enum: `submitted → under_review → quoted → negotiating → confirmed → completed`, plus terminal `declined | cancelled | expired`
- **booking_status_history** (booking_id, from_status, to_status, changed_by, note, created_at). Append-only.
- **booking_messages** (booking_id, author_id, body, internal bool). Internal notes are visible only to staff.

Status changes go only through a Postgres function such as `transition_booking(id, to_status, note)`. The function validates the allowed transition, writes history, and inserts a notification. Clients cannot `UPDATE status` directly.

### 5.5 Marketplace

- **sellers** (owner_user_id ⓤ, slug ⓤ, display_name, country, status `pending | approved | suspended`, commission_rate_bps nullable override)
- **seller_stripe** 🔒 (seller_id PK, stripe_account_id ⓤ, charges_enabled, payouts_enabled, details_submitted, requirements jsonb). Written **only** by the webhook (service role).
- **products** (seller_id, slug, title, description, product_type `physical | digital`, status, currency). Unique (seller_id, slug).
- **product_variants** (product_id, sku ⓤ, options jsonb, price_amount, stock, active)
- **orders** 🔒 (buyer_id nullable for guests, guest_email 🔒, guest_access_token_hash, status `pending_payment | paid | partially_fulfilled | fulfilled | refunded | cancelled`, currency, subtotal, shipping, tax, total, stripe_checkout_session_id ⓤ, stripe_payment_intent_id ⓤ, shipping_address jsonb 🔒)
- **seller_orders** (order_id, seller_id, status, subtotal, tracking_number). One per seller per order, so each vendor fulfils only its part.
- **order_items** (seller_order_id, variant_id, title_snapshot, unit_price, quantity, line_total). Prices are snapshotted at purchase.
- **commission_rules** (scope `global | seller`, seller_id nullable, rate_bps, effective_from)
- **commissions** (seller_order_id ⓤ, gross_amount, rate_bps, commission_amount, seller_amount, stripe_transfer_id, status `pending | transferred | reversed`)
- **stripe_events** (id = Stripe event id PK, type, received_at, processed_at). Gives webhook idempotency.

### 5.6 Promotion

- **promotion_requests** 🔒 (requester_id, event_id nullable, event_name, event_date, channels text[], budget_amount, currency, brief, status, assigned_staff_id)
- **promotion_status_history**: same pattern as bookings
- **promotion_campaigns** (request_id, name, starts_at, ends_at, status, deliverables jsonb, results jsonb)

### 5.7 Catering & production services

- **service_providers** (user_id, type `photographer | videographer | caterer | production`, slug ⓤ, display_name, bio, regions text[], status)
- **service_requests** 🔒 (requester_id, service_type `catering | photography | videography | aftermovie`, event_name, event_date, location, guest_count, details jsonb validated per type with Zod, budget_amount, currency, status, assigned_provider_id, assigned_staff_id)
- **service_request_status_history**: same pattern
- **service_quotes** (request_id, provider_id, amount, currency, valid_until, status `draft | sent | accepted | rejected | expired`)

### 5.8 Notifications & audit

- **notifications** (user_id, type, payload jsonb, read_at)
- **email_outbox** (to_user_id, to_email, template, payload, status, attempts, last_error, sent_at, provider_message_id)
- **audit_logs** (bigserial id, actor_id, action, entity_type, entity_id, before jsonb, after jsonb, created_at). Append-only. Written by triggers or security-definer functions. Readable only by admins.

🔒 = private field/table · ⓤ = unique

### 5.9 Row Level Security strategy (Supabase)

1. **RLS enabled on every table.** Tables start with no policies (deny by default), and access is added deliberately.
2. Helper functions are `security definer`, `stable`, and use a fixed `search_path`:
   - `has_role(role)`
   - `is_staff()` (staff or admin)
   - `is_artist_member(artist_id)`
   - `is_seller_owner(seller_id)`
3. **Public content** (artists, events, galleries, products, public media): `SELECT` where `status = 'published'`/`'active'`. Writes allowed for staff, plus members/owners for their own rows.
4. **Private tables** (`artist_private`, `seller_stripe`, requests, orders): `SELECT` only by the owner/requester, the assigned staff/provider, or admin. No anonymous access.
5. **Status columns and money columns** are never client-writable. They change through RPC functions or the service-role webhook handler.
6. **Secret key** (`SUPABASE_SECRET_KEY`, formerly the service role key) is used only in server code (webhooks, admin jobs) and never reaches the browser.
7. **Storage buckets:**
   - `public-media`: public read, writes restricted by path `artists/{artist_id}/…` + `is_artist_member()`
   - `private-docs`: riders, contracts, invoices. No public read; signed URLs with short expiry.
8. **RLS tests** in `supabase/tests` cover each role against each table, for both allowed and denied cases.

---

## 6. Role & permission matrix

Abbreviations: **R** read · **C** create · **U** update · **own** = only own/linked rows · **asg** = only assigned rows · **pub** = published only · — none

| Resource                      | Guest | Customer / Promoter | Artist (member)      | Seller              | Provider               | Staff          | Admin         |
| ----------------------------- | ----- | ------------------- | -------------------- | ------------------- | ---------------------- | -------------- | ------------- |
| Artist profiles               | R pub | R pub               | R pub, U own         | R pub               | R pub                  | R/C/U all      | all           |
| Artist private (fees, riders) | —     | —                   | R/U own              | —                   | —                      | R/U            | all           |
| Events, galleries, media      | R pub | R pub               | R pub, C/U own media | R pub               | R pub, C own portfolio | R/C/U          | all           |
| Booking requests              | —     | C, R own            | R own artist's       | —                   | —                      | R/U all        | all           |
| Promotion requests            | —     | C, R own            | C, R own             | C, R own            | —                      | R/U all        | all           |
| Service requests              | —     | C, R own            | C, R own             | —                   | R/U asg                | R/U all        | all           |
| Service quotes                | —     | R on own requests   | —                    | —                   | C/U own                | R/U            | all           |
| Products                      | R pub | R pub               | R pub                | C/U own             | R pub                  | R/U (moderate) | all           |
| Orders                        | —     | C, R own            | —                    | R own seller_orders | —                      | R              | all + refunds |
| Seller Stripe status          | —     | —                   | —                    | R own               | —                      | R              | R             |
| Commissions / payouts         | —     | —                   | —                    | R own               | —                      | R              | R/U rules     |
| Users & roles                 | —     | R/U own profile     | R/U own profile      | R/U own profile     | R/U own profile        | R              | all           |
| Audit log                     | —     | —                   | —                    | —                   | —                      | —              | R             |

---

## 7. Security & payment risks

### Payments (all items need verification. Nothing here is assumed.)

1. **Stripe Connect eligibility.** Platform country: **Germany (EEA)**. Checked on 2026-10-19 against [Stripe cross-border payouts](https://docs.stripe.com/connect/cross-border-payouts):
   - Platforms in the US, UK, EEA, Canada or Switzerland can pay out to connected accounts in **any of those regions**.
   - Self-serve cross-border payouts are **not supported** to sellers outside those regions. Those sellers would need Stripe sales or another payout method.
   - Cross-border payouts work only with _separate charges and transfers_ or _destination charges_ **without `on_behalf_of`**.
   - The page also says cross-border payouts are not available to accounts on the _recipient_ service agreement. Confirm this detail with Stripe before building Phase 08.
   - Still to verify: the list of countries sellers and artists are actually in, and VAT/OSS obligations for a German entity.
2. **Charge model.** Multi-vendor carts point toward _separate charges and transfers_. Single-seller checkout could use _destination charges_. The choice affects who is merchant of record, refund/dispute liability, and statement descriptors. **Decision required.**
3. **Connect account type** (Express vs. Standard vs. Custom). This affects onboarding effort, compliance burden, and branding. Express is a likely default, **pending verification**.
4. **Tax / VAT.** Selling physical and digital goods internationally creates VAT/sales-tax obligations. Stripe Tax and legal advice are needed before going live.
5. **Webhook integrity.** Verify signatures. Store each event id for idempotency. Treat the webhook as the only source of truth for payment state, never the success redirect.
6. **Price tampering.** The server recomputes all totals from the DB. It never trusts cart amounts sent by the client.
7. **Refunds, disputes, and chargebacks.** Commission reversal and transfer reversal logic must exist before going live.
8. **Artist booking deposits and fees** are out of scope for the first payment phase. Bookings stay request → quote → offline contract until legal terms exist.

### Application security

- Broken access control is the main risk. Mitigations: RLS on every table, server-side role checks, and RLS tests.
- Spam and abuse on public forms: rate limiting, captcha (e.g. Cloudflare Turnstile), and sign-in required to submit.
- Upload abuse: MIME and size limits, image re-encoding, private bucket for documents, no SVG uploads from users.
- Secret handling: service role and Stripe secret keys stay server only. `.env.example` holds names only. Keys rotate if ever exposed.
- PII and GDPR: riders, phone numbers, addresses, and budgets are private. Privacy policy, data export and deletion process, cookie consent for non-essential analytics.
- Auth hardening: email verification, admin roles granted only by admin (logged in `audit_logs`), MFA for staff/admin (Supabase supports TOTP).
- Security headers: CSP, HSTS, frame-ancestors, referrer-policy.

---

## 8. Visual design direction (preliminary)

**Concept: "After dark, in print."** The look pairs cinematic festival photography with the restraint of a high-end print magazine. Photography carries the colour. The UI stays dark, quiet, and precise.

### Palette (tokens; contrast checked against WCAG AA during Phase 02)

| Token                    | Value                 | Use                                                               |
| ------------------------ | --------------------- | ----------------------------------------------------------------- |
| `--bg`                   | `#0A0A0C`             | Page background                                                   |
| `--surface-1`            | `#121216`             | Cards, panels                                                     |
| `--surface-2`            | `#1B1B21`             | Raised / hover                                                    |
| `--line`                 | `#2A2A33`             | Hairline borders                                                  |
| `--text`                 | `#F3F0EA`             | Primary text (warm off-white)                                     |
| `--text-muted`           | `#A6A3AD`             | Secondary text                                                    |
| `--accent`               | `#C6F432`             | Single acid accent: primary CTAs, focus rings, active states only |
| `--accent-ink`           | `#0A0A0C`             | Text on accent                                                    |
| `--uv`                   | `#8E6CFF`             | Rare secondary (tags, data viz), never for body text              |
| `--danger` / `--success` | `#FF5A5F` / `#3DDC97` | Status only                                                       |

Rule: the accent covers **less than about 5% of any screen**. Each view has one primary CTA.

### Typography (free / open licences)

- **Display:** _Instrument Serif_ for editorial headlines and large artist names, with tight tracking.
- **UI / body:** _Inter Tight_, 16px minimum body size, 1.5 line height.
- **Metadata:** _JetBrains Mono_ in small caps style for dates, BPM, cities, coordinates. This gives a "festival ticket" texture.
- Fluid type scale with `clamp()`. Self-hosted via `next/font`.

### Layout & imagery

- Full-bleed hero photography with a subtle grain and a dark gradient scrim for legible text. Captions credit the photographers.
- Editorial grid: asymmetric 12-column layout on desktop, single column on mobile, generous negative space.
- Artist cards: tall portrait crop, name set in the display serif, genre and country in mono.

### Motion (performance-conscious)

- CSS transitions and the View Transitions API between directory and profile pages. Animation libraries are used only where they earn their place.
- Scroll reveals are subtle (opacity and 8–16px translate), with no parallax on mobile.
- Hero video: muted, poster frame first, lazy-loaded, paused when off-screen, size-capped. Audio never autoplays.
- `prefers-reduced-motion` turns off all non-essential motion.
- Budgets: LCP < 2.5s on 4G mobile, CLS < 0.1, JS per public route kept minimal (RSC by default).

### Navigation & conversion

- Top nav: **Artists · Events · Media · Services · Shop**, plus a persistent **"Book an artist"** CTA.
- Mobile: full-screen menu, CTA kept within thumb reach.
- Every artist and service page ends in one clear request action.

### Things to avoid

Generic "neon rave" gradients, glassmorphism stacks, heavy WebGL backgrounds, low-contrast grey-on-black text, and stock template layouts.

---

## 9. Phased implementation plan

| Phase                       | Scope                                                                                                                                                                                     | Exit criteria                                                                                        |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| **02 Foundation**           | Scaffold, tooling, CI, design tokens + base UI, layout shell, Supabase project, first migration (profiles, user_roles, helpers), auth flows, route guards, `.env.example`, Vercel preview | Sign up, log in, and log out work; `/dashboard` and `/admin` are guarded; CI green; preview URL live |
| **03 Artists**              | Artist schema + RLS, admin artist CMS, media upload, directory + profile pages, SEO                                                                                                       | Staff can publish an artist; public profile renders; RLS tests pass                                  |
| **04 Events & media**       | Events, lineups, galleries, video embeds                                                                                                                                                  | Event and gallery pages live                                                                         |
| **05 Booking workflow**     | Booking requests, status transitions, messages, notifications, email outbox                                                                                                               | End-to-end request → staff quote → status history                                                    |
| **06 Promotion & services** | Promotion, catering, and production requests; providers; quotes                                                                                                                           | All request types flow to admin and providers                                                        |
| **07 Marketplace catalog**  | Seller applications, products, variants, storefronts, cart (no payments)                                                                                                                  | Approved seller can list products                                                                    |
| **08 Payments (test mode)** | Stripe Checkout, Connect onboarding, webhooks, commissions, transfers, refunds                                                                                                            | Full test-mode purchase incl. refund; idempotent webhooks                                            |
| **09 Hardening & launch**   | Security review, a11y audit, performance, legal pages, monitoring, go-live checklist                                                                                                      | Sign-off; live keys only after legal/tax approval                                                    |

---

## 10. Exact next actions for Phase 02

**Prerequisites (owner action):**

1. Install Node.js LTS on the development machine.
2. Create a Supabase project, choosing a region near the main audience. Keep the keys in a password manager and do not paste them into chat.
3. Create a Vercel account and connect it to the GitHub repo. Create a Stripe account in **test mode only**, needed by Phase 08.
4. Answer the open decisions below.

**Engineering steps:**

1. `create-next-app` with TypeScript, App Router, Tailwind, ESLint, `src/` directory; pin versions; add `.nvmrc`.
2. Add Prettier, a strict `tsconfig`, Vitest, Playwright, and scripts for `lint`, `typecheck`, `test`, `build`.
3. Add `lib/env.ts` (Zod-validated), `.env.example`, `.gitignore` for `.env*.local`.
4. Add design tokens (`styles/tokens.css`), fonts, and base primitives (Button, Link, Input, Container, Heading).
5. Build the layout shell: header with nav and CTA, mobile menu, footer, placeholder home page.
6. `supabase init`; first migration with `profiles`, `user_roles`, the role enum, the `has_role` / `is_staff` helpers, and a trigger that creates a profile on signup. Enable RLS and add the first RLS tests.
7. Add the `@supabase/ssr` clients (browser and server), `proxy.ts` for session refresh and route guards, and the auth pages.
8. Add GitHub Actions CI and a Vercel preview deployment.
9. Make the first commit on a feature branch and open a PR for review.

### Decisions requiring approval

1. ✅ **Approved 2026-10-19:** Next.js + Supabase + Vercel + Stripe.
2. ✅ **Approved 2026-10-19:** Business country is Germany. Pending: the main countries sellers will be in.
3. ✅ **Approved 2026-10-19:** Both physical and digital goods; guest checkout allowed. (Digital delivery uses signed, expiring download links.)
4. Charge model and Connect account type. Proposal: separate charges & transfers with Express accounts, pending verification.
5. ✅ **Approved 2026-10-19:** Paid streaming. Pending: Mux vs. Cloudflare Stream (compare pricing in Phase 04).
6. ✅ **Approved 2026-10-19:** Resend (with React Email templates).
7. ✅ **Approved 2026-10-19:** English only at launch; keep UI strings centralised so i18n can be added later.
8. ✅ **Approved 2026-10-19:** Brand name is DopeBooking. Pending: domain.
9. ✅ **Approved 2026-10-19:** Visual direction in §8 (palette and type), preliminary; contrast verified in Phase 02.

---

## Phase 02 status (2026-10-20)

Branch `phase-02-foundation`. Built:

- **Stack:** Next.js 16.4.2 (App Router, Turbopack, Cache Components, Partial Prefetching), React 19.3, TypeScript strict, Tailwind CSS 4, npm, Node.js 24 LTS (`.nvmrc`).
- **Tooling:** ESLint, Prettier (with Tailwind class sorting), Vitest unit tests, Playwright end-to-end tests (desktop and mobile), GitHub Actions CI (`.github/workflows/ci.yml`).
- **Config:** `src/lib/env.ts` validates env vars lazily with Zod and reports names only, never values. `.env.example` lists names only.
- **Design system:** tokens in `src/styles/tokens.css` (contrast-checked), next/font (Instrument Serif, Inter Tight, JetBrains Mono), `Button`/`ButtonLink`, `Field`, `Container`, `Meta`. Layout shell with header, mobile menu, footer, skip link, home page and placeholder section pages.
- **Auth:** Supabase SSR clients, `src/proxy.ts` session refresh plus optimistic guards for `/dashboard` and `/admin`, a Data Access Layer (`src/lib/auth/dal.ts`) re-checking user and role on the server, sign in / sign up / forgot / reset pages with Server Actions, `/auth/confirm` email-link handler, open-redirect protection on `?next=`.
- **Database:** `supabase/migrations/20261020000000_profiles_and_roles.sql` (profiles, user_roles, `has_role`/`is_staff`, signup trigger, RLS, column-level grants) and pgTAP tests in `supabase/tests/database/`.
- **Security headers:** nosniff, frame DENY, referrer policy, permissions policy, HSTS, no `X-Powered-By`.

Verified locally: lint, typecheck, format check, 20 unit tests, production build, and 11 Playwright tests (desktop and mobile, repeated 3×) all pass.

**Not verified yet:**

- The migration and RLS tests have **not been run**. They need a Supabase project, or Docker for a local stack.
- Real sign-up and sign-in have **not been tested**. They need the Supabase project and its email templates (see README).
- CI has not run on GitHub yet.
- No Vercel deployment yet.

**Known issues:**

- `npm audit` reports a high-severity `braces` advisory, reached only through the dev-only ESLint config. The suggested fix downgrades `eslint-config-next` to v14, so it is deferred until an upstream fix.
- `napi-postinstall` is pinned to 0.3.4 (`overrides`). 0.3.5 was published minutes before install and was not downloadable. Review before unpinning.
- A nonce-based Content-Security-Policy is deferred to the hardening phase.

---

## Phase 03 status (2026-10-20)

Branch `phase-03-artists`. Built:

- **Database** (`supabase/migrations/20261021000000_artists.sql`, applied to the Supabase project):
  - `artists`, `artist_members`, `artist_private`, `artist_links`, `media_assets`
  - Genre list enforced in the database
  - Auto `published_at`
  - RLS: the public sees published only; private info is visible to staff and the artist's own team only; staff write
  - Storage buckets `public-media` (images, 8 MB, no SVG) and `private-docs` (PDF)
- **Admin** (`/admin/artists`): list, create draft, edit details, status and featured, photo upload with alt text and credit, choose portrait, delete photo, links editor, private booking info.
  - Photos upload straight from the browser to Storage, then the server checks the file and records it.
- **Public:**
  - `/artists` directory with genre filter
  - `/artists/[slug]` profile: portrait, bio, links, gallery
  - SEO: metadata, Open Graph and MusicGroup JSON-LD
  - `sitemap.xml` and `robots.txt`
  - Public reads are cached with `use cache` and refreshed instantly after admin edits (`updateTag("artists")`).
- **CI** now builds against the real Supabase project with its public URL and publishable key, because public pages are prerendered from the database.

Verified on a clean copy:

- Passing: lint, typecheck, format check, 34 unit tests, production build, 15 Playwright tests.
- Database checks over the API: tables exist; the public sees published content only; private tables are blocked.

**Not verified yet:**

- The admin flows (create, upload, publish) need a staff login. They are on the review checklist.
- pgTAP tests have not been run (needs Docker).

**Deferred:**

- Artist self-service dashboard (`/dashboard/artist/*`)
- Rider PDF uploads
- Adding members from the admin UI

---

## Phase 04 status (2026-10-20)

Branch `phase-04-events-media` (stacked on `phase-03-artists`). Built:

- **Database** (`supabase/migrations/20261022000000_events_galleries_videos.sql`, applied):
  - `events`, `event_artists` (lineup), `galleries`, `videos`
  - `media_assets` can now belong to an artist, event, gallery or video (exactly one)
  - RLS: the public sees published items only; lineup rows need both the event and the artist published; staff write
- **Video (provider-agnostic):** admins paste a Mux, Cloudflare Stream, YouTube or Vimeo link. `src/lib/video.ts` accepts only known hosts and safe ids.
  - Players use privacy modes (youtube-nocookie, Vimeo `dnt`) behind a click-to-play poster, so nothing third-party loads until play.
  - **Decision still open:** Mux vs Cloudflare Stream for self-hosted streaming. Either works with no code change; direct uploads to the chosen provider come later.
- **Time zones:** events are entered and shown in their own IANA zone and stored in UTC (`src/lib/datetime.ts`, DST-tested).
- **Admin:**
  - `/admin/events`: details, lineup editor with running order and set times, cover image
  - `/admin/galleries`: bulk photo upload with a shared description, choose cover
  - `/admin/videos`: link, event/artist, poster, live preview
- **Public:**
  - `/events` (upcoming and past), `/events/[slug]` with lineup, tickets, related photos and videos, MusicEvent JSON-LD
  - `/gallery`, `/gallery/[slug]` with a full-screen keyboard photo viewer
  - `/videos`, `/videos/[slug]`
  - Artist profiles now list upcoming shows and videos
  - Sitemap covers all content
- **Shared building blocks:** `modules/media` (uploader, grid, server checks), `lib/validation`, `components/admin/admin-ui`.

Verified on a clean copy against the real database:

- Passing: lint, typecheck, format check, 78 unit tests, production build, 23 Playwright tests.
- Database checks over the API: the new tables exist and the public can read only published rows.

**Not verified yet:**

- Admin create/upload flows (need a staff login; on the review checklist)
- pgTAP tests (need Docker)

---

## Phase 05 status (2026-10-20)

Branch `phase-05-bookings` (stacked on `phase-04-events-media`). Built:

- **Database** (`supabase/migrations/20261023000000_bookings.sql`, applied):
  - `booking_requests` with a short reference like `BK-1A2B3C4D`; private phone, plus an email copied from the account by a trigger
  - `booking_status_history` (append-only), `booking_messages` (with staff-only internal notes), `notifications`, `email_outbox`
  - **The workflow lives in the database.** `transition_booking()` checks every step (staff: submitted → under review → quoted ⇄ negotiating → confirmed → completed, or declined, expired or cancelled; requesters may only cancel open requests). It also writes history and queues the notification and email. `add_booking_message()` does the same for messages.
  - Clients can't update status, quotes or messages directly.
  - Rate limits: 5 requests and 30 messages per user per hour.
  - RLS: requesters see their own requests only; staff see everything; internal notes are staff-only; `email_outbox` is service-role only.
- **Request form** at `/book/[slug]` (sign-in required; sign-up returns to the form).
- **Requester dashboard:** `/dashboard/bookings` list and detail with quote, timeline, messages and cancel. `/dashboard/notifications` with mark-all-read.
- **Admin:** `/admin/bookings` inbox (open, confirmed, completed, all) and detail with private contact info, the artist's private fee range, assign to me, a status control with a quote form, and conversation with internal notes.
- **Email:** escaped HTML and text templates (`src/lib/email`), sent through Resend from the outbox.
  - Sends run right after the triggering action (`after()`), with a daily Vercel Cron backup at `/api/cron/email`, protected by `CRON_SECRET`.
  - Sends are idempotent per outbox row and retried with backoff.
  - **Sending is off until** `SUPABASE_SECRET_KEY`, `RESEND_API_KEY` and `EMAIL_FROM` are set. Until then emails wait in the queue and in-app notifications work.

Verified on a clean copy against the real database:

- Passing: lint, typecheck, format check, 90 unit tests (including a check that the UI's step list mirrors the SQL), production build, 27 Playwright tests.
- Database checks over the API: all booking tables and functions refuse anonymous access.

**Not verified yet:**

- The end-to-end booking flow with real accounts (on the review checklist)
- Actual email delivery (needs Resend)
- pgTAP tests (need Docker)
