# DopeBooking

Premium international psytrance artist agency and festival services platform.
Architecture, decisions and roadmap: [docs/PROJECT_ARCHITECTURE.md](docs/PROJECT_ARCHITECTURE.md).
Going live: [docs/LAUNCH.md](docs/LAUNCH.md). Manual test list: [docs/REVIEW_CHECKLIST.md](docs/REVIEW_CHECKLIST.md).

**Stack:** Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · Supabase (Postgres, Auth, Storage) · Vercel · Stripe (later phases) · Resend (later phases).

## Requirements

- Node.js 24 LTS (see `.nvmrc`)
- A Supabase project (for sign-in and the database)

## Local setup

```bash
npm install
cp .env.example .env.local   # then fill in the values
npm run dev                  # http://localhost:3000
```

Values for `.env.local` come from the Supabase dashboard → **Project Settings → API Keys**: the project URL and the **publishable** key. Never commit `.env.local`.

## Supabase setup (once per project)

1. **Apply the database migrations.** Paste each file in `supabase/migrations/` into the Supabase SQL editor **in filename order**, or use the CLI:
   ```bash
   npx supabase login
   ```
   ```bash
   npx supabase link --project-ref <your-project-ref>
   ```
   ```bash
   npx supabase db push
   ```
2. **Auth → URL Configuration:** set the Site URL to your site, and add `http://localhost:3000/**` (plus your Vercel URLs) to Redirect URLs.
3. **Email templates:** nothing to change. `/auth/confirm` accepts Supabase's default links (open them in the same browser you signed up in). Custom templates with `token_hash` also work once custom SMTP (Resend) is set up.
4. **Make yourself admin.** Sign up through the site, then run this in the SQL editor:

   ```sql
   insert into public.user_roles (user_id, role)
   select id, 'admin' from auth.users where email = 'you@example.com';
   ```

5. **Demo content (optional).** Fills the site with sample artists, events, galleries, products and page layouts, all flagged as demo and drawn as original artwork:
   ```bash
   node --env-file=.env.local scripts/demo/seed.mjs
   ```
   Re-running replaces the earlier demo records. Remove them all in Admin, Demo content.

## Managing content

Everything visitors see is edited in **Admin** (`/admin`). The control room shows what is waiting (bookings, requests, releases to review, payouts), live counts, quick actions and recent activity; the sidebar groups every area.

- **Pages**: every public page is a list of sections (hero, artists, events, gallery, videos, latest news, services, packages, steps, FAQ, call to action…). Edit text and photos, reorder, hide, add or delete sections, preview the draft, then publish.
- **Site settings**: brand name and optional logo, announcement banner, menu and dropdowns, header button, footer columns, contact, social links, search defaults, demo labels.
- **Legal pages** (`/admin/legal`): edit the imprint, privacy policy and terms with a live preview; each keeps its original text until an edited version is published. Shows how many `[PLACEHOLDERS]` are left.
- **Media library** (`/admin/media`): drag-and-drop images, videos (MP4/WebM/MOV), audio and PDFs with upload progress; search, filter by type, owner and use; replace a file everywhere it is used; files in use can't be deleted. Images keep their focal point.
- **Media & Image Guidelines**: the size to design for every image on the site (desktop, tablet and mobile), with safe areas and crops. Every upload field shows the same guide. The sizes live in `src/modules/media/image-specs.ts`, which the front end also reads its image frames from.
- **Artists**: roster, profiles, photos, links, featuring and order, dates and availability (public or private windows), press kit PDF, and where each artist appears.
- **Events, galleries**: details, lineups, photos, featuring; delete with their photos.
- **Videos**: paste a link or upload the file itself (plays in the site's own player), poster, display order, featuring, delete (optionally with the file).
- **News** (`/admin/posts`): posts with cover, light-markup text, photos/video/audio/PDFs from the library, category, tags, related artist/event; draft, preview, schedule or publish. Public at `/news`; add a Latest news section to any page.
- **Products and categories**: create and edit any listing for an approved shop (details, options, prices, stock, photos, download files), feature and order it; delete when never ordered, archive otherwise.
- **Art Gallery** (`/admin/art`): visual artists and collectives, exhibitions (festival, dates, line-up with roles, collection, curated photo sets, partners, videos), artworks with shared credits, festivals, featured order and collaboration inquiries.
- **Music**: upload and publish releases for any roster artist (artwork, masters, previews, price, genre), review artists' releases, feature them, manage genres and link artist accounts. **Music finance**: commission, earnings, adjustments and payouts. Artists also upload and sell from **Dashboard → My music**.
- **Users & permissions**, **Audit log** (filterable), **Demo content**: super admin only. The permission matrix sets what Staff may do; super admins always keep every permission.

Access is checked on the server and in the database. Permissions per role live in the `role_permissions` table; the database refuses to remove `users.manage` from the admin role, so the owner can't be locked out.

## Scripts

| Command                | What it does                                          |
| ---------------------- | ----------------------------------------------------- |
| `npm run dev`          | Development server                                    |
| `npm run build`        | Production build                                      |
| `npm run lint`         | ESLint                                                |
| `npm run typecheck`    | TypeScript                                            |
| `npm run format`       | Prettier (write)                                      |
| `npm test`             | Unit tests (Vitest)                                   |
| `npm run test:e2e`     | Browser tests (Playwright; builds and starts the app) |
| `npx supabase test db` | Database/RLS tests (needs Docker or a linked project) |
| `GET /api/health`      | Uptime check (app + database)                         |

To run the browser tests with your installed Google Chrome instead of downloading Playwright's browser, set `PLAYWRIGHT_CHANNEL=chrome`.

## Project layout

```
src/app/          routes (thin)
src/modules/      domain logic per feature (actions, schemas, components)
src/components/   design-system primitives and site chrome
src/lib/          env, Supabase clients, auth (Data Access Layer)
src/styles/       design tokens
src/proxy.ts      session refresh + route guards (Next.js 16 "proxy")
supabase/         migrations and database tests
e2e/              Playwright tests
docs/             architecture and decisions
```
