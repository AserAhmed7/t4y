# MR CODEX — Digital Agency Platform
Arabic-first (RTL) + English. React + Vite + Tailwind + Supabase. Public site, customer portal, admin dashboard.

## Setup
1. `npm install`
2. Create a free project at supabase.com. In **SQL Editor** run `supabase/migrations/001_schema.sql`.
3. `cp .env.example .env` and fill `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (Project Settings → API). Only the **anon** key belongs in the frontend; never use the service-role key here.
4. `npm run dev`
5. **Create your admin:** register at `/register`, then in SQL Editor run:
   `update public.profiles set role='admin' where id=(select id from auth.users where email='you@example.com');`
   Sign in at `/admin/login`.
6. Optional: Auth → Providers → Email: keep "Confirm email" on for production.

## Security model
- Passwords are handled by Supabase Auth (bcrypt-hashed server-side); the app never stores or sees them.
- **Every table has Row Level Security.** Customers see only their own orders/projects/invoices/messages; admin access is enforced in the database via `is_admin()`, not just in the UI. The admin UI is also lazy-loaded and route-guarded.
- New signups are always `customer`; users cannot update their own `role` (column-level grant).
- Invoices are records only. **No payment processing is implemented**; admin marks invoices paid manually. Integrate a real provider (server-side) before taking payments.

## Deploy (free tier)
Vercel/Netlify/Cloudflare Pages: build `npm run build`, output `dist`, set the 3 env vars. SPA rewrites are included (`vercel.json`, `public/_redirects`).

## Structure
`src/lib` (Supabase client, i18n+auth context, dictionary) · `src/components/ui.jsx` · `src/pages` (Public, Auth, Portal, Admin) · `supabase/migrations`.
