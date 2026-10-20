# Launch guide

The order of steps to take DopeBooking live. Each step says **who** does it. "You" = the owner, because it needs your accounts or keys. "Claude" = can be done in a session.

Never paste secret keys into chats, issues or commits. They go into `.env.local` (your Mac) and Vercel → Project → Settings → Environment Variables.

## 1. Merge the code (you, ~2 min)

All phases are on stacked branches. `phase-09-launch` contains everything from Phase 03 to 09.

1. Open the pull request from **phase-09-launch → main** on GitHub.
2. Wait for the green ✓ checks.
3. Click **Merge**.

## 2. Accounts and keys

| Service      | What for                           | Keys / settings                                                                                                       | Who                         |
| ------------ | ---------------------------------- | --------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| **Supabase** | Database, sign-in, files           | Already set up. Copy `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`        | ✅ done                     |
| **Resend**   | Emails (bookings, orders, sign-up) | Verify your domain (DNS), then `RESEND_API_KEY` and `EMAIL_FROM="DopeBooking <bookings@yourdomain>"`                  | You                         |
| **Stripe**   | Payments and seller payouts        | Test mode first: `STRIPE_SECRET_KEY` (`sk_test_…`), Connect enabled, branding set. See the review checklist, Phase 08 | You, then Claude helps test |
| **Vercel**   | Hosting                            | Sign in with GitHub as dopebookingtribe-dev                                                                           | You                         |
| **Domain**   | dopebooking.com (or similar)       | DNS at your registrar                                                                                                 | You                         |

## 3. Deploy on Vercel (you, ~10 min)

1. Go to https://vercel.com/new → **Import** `dopebookingtribe-dev/dopebooking`. The framework is detected as Next.js.
2. Add the environment variables below for **Production** and **Preview**:
   - `NEXT_PUBLIC_SITE_URL` = your final URL, e.g. `https://dopebooking.com`
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - `SUPABASE_SECRET_KEY`
   - `RESEND_API_KEY`, `EMAIL_FROM`
   - `CRON_SECRET`: any random 32+ character string. Vercel Cron sends it to `/api/cron/email`.
   - `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` (step 5)
3. Click **Deploy**.
4. Choose the **Frankfurt (fra1)** function region, close to Supabase.
5. Add your domain under Project → Domains and follow the DNS instructions.

## 4. Point Supabase at the live site (you, ~3 min)

1. Authentication → URL Configuration:
   - **Site URL** = `https://yourdomain`
   - Redirect URLs: add `https://yourdomain/**`. Keep `http://localhost:3000/**` for development.
2. Authentication → SMTP: use Resend (host `smtp.resend.com`, port 465, user `resend`, password = Resend API key). Sign-up emails then come from your domain, and email templates become editable.
3. Authentication → Sign In / Providers → Email: turn on **leaked password protection**. Ask staff and admins to set up **MFA**.
4. Run **Advisors → Security** and **Performance**, and fix anything red. Ask Claude if unsure.
5. Database → Backups: check daily backups are on. Point-in-time recovery needs the Pro plan.

## 5. Payments live (you + Claude)

1. Finish the **test-mode** purchase on the review checklist (Phase 08) first.
2. Legal and tax:
   - VAT / OSS and Stripe Tax decision with an accountant
   - Shop, seller and refund terms reviewed by a lawyer
   - Withdrawal notice and consent at checkout for digital goods
3. In Stripe live mode:
   - Activate the account (company details, bank)
   - Connect → finish the platform profile and branding
   - Developers → Webhooks → add an endpoint `https://yourdomain/api/webhooks/stripe` with these events:
     - `checkout.session.completed`
     - `checkout.session.async_payment_succeeded`
     - `checkout.session.async_payment_failed`
     - `checkout.session.expired`
     - `charge.refunded`
   - Copy its signing secret into `STRIPE_WEBHOOK_SECRET`.
4. Swap `STRIPE_SECRET_KEY` to `sk_live_…` in Vercel (Production only) and redeploy.
5. Do one real small purchase and refund it.

## 6. Content (you)

- [ ] Fill every `[PLACEHOLDER]` in `src/app/legal/*`, have a lawyer review, then set `LEGAL_DRAFT = false` in `src/components/legal/legal-page.tsx`. Claude can do the edit.
- [ ] Add the real artists, events, galleries and videos in `/admin`.
- [ ] Approve the first sellers; ask them to set up payouts.
- [ ] Replace the hero gradient with festival photography (Claude can wire it in).

## 7. Final checks (Claude)

- [ ] `npm run build` and CI green on main
- [ ] Browser and accessibility tests against the live URL (`PLAYWRIGHT_BASE_URL=https://yourdomain npm run test:e2e`)
- [ ] `https://yourdomain/api/health` returns `{"status":"ok"}`. Add it to an uptime monitor (e.g. Better Stack or UptimeRobot, free).
- [ ] `sitemap.xml` and `robots.txt` show the real domain. Submit the sitemap in Google Search Console.
- [ ] Error tracking: add Sentry (optional, needs an account)

## Known limits at launch

- Shop is EUR-only; checkout accepts cards (incl. Apple Pay and Google Pay) only.
- Email sending is off until Resend is set up; emails wait in the queue and send once it is.
- The content security policy allows inline scripts (needed to keep pages fast). Everything else is locked down.
- Deferred features:
  - Artist self-service dashboard
  - Provider portal
  - Promotion campaign tracking
  - Rider PDF uploads
  - Mux or Cloudflare direct video uploads
