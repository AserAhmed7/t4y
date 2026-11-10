-- MR CODEX schema. Run in Supabase SQL editor (or `supabase db push`).
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text, phone text,
  role text not null default 'customer' check (role in ('customer','admin')),
  created_at timestamptz not null default now());

create or replace function public.is_admin() returns boolean language sql security definer stable set search_path=public as
$$ select exists(select 1 from public.profiles where id=auth.uid() and role='admin') $$;

-- New users are ALWAYS 'customer'. Role is never read from client metadata.
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path=public as
$$ begin insert into public.profiles(id,full_name) values(new.id,left(coalesce(new.raw_user_meta_data->>'full_name',''),120)); return new; end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create table public.services (id uuid primary key default gen_random_uuid(),
  title_ar text not null, title_en text not null, desc_ar text, desc_en text,
  price numeric(10,2) not null default 0, active boolean not null default true, created_at timestamptz default now());
create table public.portfolio (id uuid primary key default gen_random_uuid(),
  title_ar text not null, title_en text not null, desc_ar text, desc_en text,
  image_url text, url text, published boolean not null default true, created_at timestamptz default now());
create table public.orders (id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles(id) on delete cascade,
  service_id uuid references public.services(id) on delete set null,
  title text not null check (char_length(title) between 2 and 160), details text check (char_length(details)<=4000),
  budget numeric(10,2), status text not null default 'new' check (status in ('new','reviewing','accepted','rejected')),
  created_at timestamptz default now());
create table public.projects (id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles(id) on delete cascade,
  order_id uuid references public.orders(id) on delete set null,
  name text not null, status text not null default 'planning' check (status in ('planning','design','development','review','launched')),
  progress int not null default 0 check (progress between 0 and 100), created_at timestamptz default now());
create table public.messages (id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000), created_at timestamptz default now());
create table public.invoices (id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  amount numeric(10,2) not null check (amount>=0), status text not null default 'unpaid' check (status in ('unpaid','paid','void')),
  due_date date, created_at timestamptz default now());
-- Public leads (contact / request forms from visitors). Insert-only for the public.
create table public.leads (id uuid primary key default gen_random_uuid(),
  kind text not null default 'contact' check (kind in ('contact','request')),
  name text not null check (char_length(name) between 2 and 120), email text not null check (email ~* '^\S+@\S+\.\S+$'),
  phone text check (char_length(phone)<=30), details text check (char_length(details)<=4000), budget numeric(10,2),
  created_at timestamptz default now());

alter table public.profiles enable row level security; alter table public.services enable row level security;
alter table public.portfolio enable row level security; alter table public.orders enable row level security;
alter table public.projects enable row level security; alter table public.messages enable row level security;
alter table public.invoices enable row level security; alter table public.leads enable row level security;

-- Users can only edit name/phone on their own profile; role changes are SQL-only.
revoke update on public.profiles from anon, authenticated;
grant update (full_name, phone) on public.profiles to authenticated;
create policy "profile read" on public.profiles for select using (id=auth.uid() or public.is_admin());
create policy "profile update" on public.profiles for update using (id=auth.uid()) with check (id=auth.uid());

create policy "services public" on public.services for select using (active or public.is_admin());
create policy "services admin" on public.services for all using (public.is_admin()) with check (public.is_admin());
create policy "portfolio public" on public.portfolio for select using (published or public.is_admin());
create policy "portfolio admin" on public.portfolio for all using (public.is_admin()) with check (public.is_admin());

create policy "orders read" on public.orders for select using (customer_id=auth.uid() or public.is_admin());
create policy "orders insert" on public.orders for insert with check (customer_id=auth.uid() and status='new');
create policy "orders admin" on public.orders for all using (public.is_admin()) with check (public.is_admin());
create policy "projects read" on public.projects for select using (customer_id=auth.uid() or public.is_admin());
create policy "projects admin" on public.projects for all using (public.is_admin()) with check (public.is_admin());
create policy "invoices read" on public.invoices for select using (customer_id=auth.uid() or public.is_admin());
create policy "invoices admin" on public.invoices for all using (public.is_admin()) with check (public.is_admin());

create policy "messages read" on public.messages for select using (public.is_admin() or exists(select 1 from public.projects p where p.id=project_id and p.customer_id=auth.uid()));
create policy "messages insert" on public.messages for insert with check (sender_id=auth.uid() and (public.is_admin() or exists(select 1 from public.projects p where p.id=project_id and p.customer_id=auth.uid())));

create policy "leads insert" on public.leads for insert to anon, authenticated with check (true);
create policy "leads admin" on public.leads for all using (public.is_admin()) with check (public.is_admin());

alter publication supabase_realtime add table public.messages;

-- Seed data
insert into public.services(title_ar,title_en,desc_ar,desc_en,price) values
('موقع تعريفي','Business Website','موقع احترافي سريع ومتجاوب لعرض نشاطك.','A fast, responsive website that presents your business.',500),
('متجر إلكتروني','E-commerce Store','متجر متكامل مع إدارة المنتجات والطلبات.','Full store with product and order management.',1500),
('تطبيق ويب مخصص','Custom Web App','أنظمة ولوحات تحكم مبنية حسب احتياجك.','Dashboards and systems built around your needs.',3000);
insert into public.portfolio(title_ar,title_en,desc_ar,desc_en) values
('منصة عقارية','Real Estate Platform','منصة لعرض وإدارة العقارات.','A platform to list and manage properties.'),
('متجر أزياء فاخر','Luxury Fashion Store','تجربة تسوق راقية وسريعة.','A refined, fast shopping experience.');
