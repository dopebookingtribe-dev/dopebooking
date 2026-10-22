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

Everything visitors see is edited in **Admin** (`/admin`):

- **Pages**: every public page is a list of sections (hero, artists, events, gallery, services, packages, steps, FAQ, call to action…). Edit text and photos, reorder, hide, add or delete sections, preview the draft, then publish.
- **Media library**: upload photos once and use them in any section; click a photo to set what stays in view when cropped.
- **Site settings**: menu and dropdowns, header button, footer columns, contact, social links, search defaults, demo labels.
- **Artists, events, galleries, videos, products, categories**: the catalogue, featuring and order.
- **Users and roles**, **Audit log**, **Demo content**: super admin only.

Access is checked on the server and in the database. Permissions per role live in the `role_permissions` table, so more limited roles can be opened up later without code changes.

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
