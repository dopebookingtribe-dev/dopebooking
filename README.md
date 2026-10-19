# DopeBooking

Premium international psytrance artist agency and festival services platform.
Architecture, decisions and roadmap: [docs/PROJECT_ARCHITECTURE.md](docs/PROJECT_ARCHITECTURE.md).

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

1. **Apply the database migration.** Paste `supabase/migrations/*.sql` into the Supabase SQL editor in order, or use the CLI:
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
